// controllers/callController.js (ES Modules version)

import Call from "../models/Call.js";
import { processCallRecording } from "../services/openaiService.js";
import * as twilioService from "../services/twilioService.js";

// Get all calls
export const getAllCalls = async (req, res) => {
  try {
    const calls = await Call.find().sort({ createdAt: -1 });
    res.status(200).json(calls);
  } catch (error) {
    console.error("Error fetching calls:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch calls", error: error.message });
  }
};

// Get call by ID
export const getCallById = async (req, res) => {
  try {
    const call = await Call.findById(req.params.id);
    if (!call) {
      return res.status(404).json({ message: "Call not found" });
    }
    res.status(200).json(call);
  } catch (error) {
    console.error("Error fetching call:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch call", error: error.message });
  }
};

// Handle incoming call from Twilio
export const handleIncomingCall = async (req, res) => {
  try {
    // Generate TwiML to handle the incoming call
    const twiml = twilioService.generateVoiceResponse();
    res.type("text/xml");
    res.send(twiml.toString());
  } catch (error) {
    console.error("Error handling incoming call:", error);
    res.status(500).json({
      message: "Failed to handle incoming call",
      error: error.message,
    });
  }
};

// Create a new call record
export const createCall = async (req, res) => {
  try {
    const { callSid, from, to, recordingUrl, duration } = req.body;

    // Create a new call record
    const newCall = new Call({
      callSid,
      from,
      to,
      recordingUrl,
      duration,
      status: "pending_transcription",
    });

    await newCall.save();

    // Process the recording if available
    if (recordingUrl) {
      // Queue the transcription process
      processCallRecording(newCall._id, recordingUrl);
    }

    res.status(201).json(newCall);
  } catch (error) {
    console.error("Error creating call:", error);
    res
      .status(500)
      .json({ message: "Failed to create call", error: error.message });
  }
};

// Delete a call
export const deleteCall = async (req, res) => {
  try {
    const call = await Call.findByIdAndDelete(req.params.id);
    if (!call) {
      return res.status(404).json({ message: "Call not found" });
    }
    res.status(200).json({ message: "Call deleted successfully" });
  } catch (error) {
    console.error("Error deleting call:", error);
    res
      .status(500)
      .json({ message: "Failed to delete call", error: error.message });
  }
};
