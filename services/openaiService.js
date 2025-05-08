// services/openaiService.js (ES Modules version)

import OpenAI from "openai";
import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import Call from "../models/Call.js";
import Transcription from "../models/Transcription.js";
import * as twilioService from "./twilioService.js";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Process a call recording to get transcription
export const processCallRecording = async (
  callId,
  recordingPath,
  isLocalFile = false
) => {
  try {
    // Update call status to in progress
    await Call.findByIdAndUpdate(callId, {
      status: "transcription_in_progress",
    });

    let audioBuffer;
    let tempFilePath;

    if (isLocalFile) {
      // Use the local file directly
      tempFilePath = recordingPath;
    } else {
      // Download the recording from Twilio
      audioBuffer = await twilioService.downloadRecording(recordingPath);

      // Save the buffer to a temporary file
      tempFilePath = path.join(os.tmpdir(), `recording-${callId}.mp3`);
      fs.writeFileSync(tempFilePath, audioBuffer);
    }

    // Open the file for reading
    const audioFile = fs.createReadStream(tempFilePath);

    // Use OpenAI's Whisper API to transcribe
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "en",
      response_format: "json",
      temperature: 0.2,
    });

    // Clean up temp file if we created one
    if (!isLocalFile) {
      fs.unlinkSync(tempFilePath);
    }

    // Create a new transcription
    const newTranscription = new Transcription({
      callId,
      text: transcription.text,
      confidence: 0.9, // Whisper doesn't provide confidence, setting a default
    });

    await newTranscription.save();

    // Update the call with the transcription ID
    await Call.findByIdAndUpdate(callId, {
      transcriptionId: newTranscription._id,
      status: "transcription_complete",
    });

    // Categorize and summarize the transcription
    processCategorization(newTranscription._id);

    return newTranscription;
  } catch (error) {
    console.error("Error processing call recording:", error);

    // Update call status to failed
    await Call.findByIdAndUpdate(callId, { status: "transcription_failed" });

    throw error;
  }
};

// Process categorization and summarization with OpenAI
const processCategorization = async (transcriptionId) => {
  try {
    const transcription = await Transcription.findById(transcriptionId);

    if (!transcription || !transcription.text) {
      throw new Error("Transcription not found or empty");
    }

    // Use OpenAI's API to categorize and summarize
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            'You are a business call analyzer. Categorize the following transcription into relevant business categories and provide a brief summary. Output should be in JSON format with "categories" (array of strings), "tags" (array of strings), and "summary" (string).',
        },
        {
          role: "user",
          content: transcription.text,
        },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    // Parse the response
    const analysis = JSON.parse(completion.choices[0].message.content);

    // Update the transcription
    await Transcription.findByIdAndUpdate(transcriptionId, {
      categories: analysis.categories || [],
      tags: analysis.tags || [],
      summary: analysis.summary || "",
    });

    return analysis;
  } catch (error) {
    console.error("Error processing categorization:", error);
    throw error;
  }
};
