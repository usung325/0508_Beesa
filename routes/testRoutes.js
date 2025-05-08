// routes/testRoutes.js (ES Modules version)

import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import Call from "../models/Call.js";
import { processCallRecording } from "../services/openaiService.js";

const router = express.Router();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `call-${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max file size
  fileFilter: (req, file, cb) => {
    // Accept only audio files
    if (file.mimetype.startsWith("audio/")) {
      cb(null, true);
    } else {
      cb(new Error("Only audio files are allowed"));
    }
  },
});

// Route to simulate an incoming call with an audio file
router.post("/simulate-call", upload.single("audioFile"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No audio file provided" });
    }

    // Create a "fake" call record
    const newCall = new Call({
      callSid: `test-${Date.now()}`,
      from: req.body.from || "+15551234567", // Default or provided phone number
      to: process.env.TWILIO_PHONE_NUMBER || "+15551234567",
      recordingUrl: req.file.path,
      status: "pending_transcription",
    });

    await newCall.save();

    // Process the recording
    processCallRecording(newCall._id, req.file.path, true); // true flag indicates local file

    res.status(201).json({
      message: "Call simulation started",
      callId: newCall._id,
      status: "processing",
    });
  } catch (error) {
    console.error("Error simulating call:", error);
    res
      .status(500)
      .json({ message: "Failed to simulate call", error: error.message });
  }
});

// Route to get test call status
router.get("/calls/:id/status", async (req, res) => {
  try {
    const call = await Call.findById(req.params.id).populate("transcriptionId");

    if (!call) {
      return res.status(404).json({ message: "Call not found" });
    }

    res.status(200).json({
      callId: call._id,
      status: call.status,
      from: call.from,
      to: call.to,
      transcription: call.transcriptionId
        ? {
            text: call.transcriptionId.text,
            summary: call.transcriptionId.summary,
            categories: call.transcriptionId.categories,
            tags: call.transcriptionId.tags,
          }
        : null,
    });
  } catch (error) {
    console.error("Error getting call status:", error);
    res
      .status(500)
      .json({ message: "Failed to get call status", error: error.message });
  }
});

// List all test calls
router.get("/calls", async (req, res) => {
  try {
    const calls = await Call.find()
      .sort({ createdAt: -1 })
      .populate("transcriptionId");

    const formattedCalls = calls.map((call) => ({
      callId: call._id,
      status: call.status,
      from: call.from,
      to: call.to,
      createdAt: call.createdAt,
      transcription: call.transcriptionId
        ? {
            text: call.transcriptionId.text,
            summary: call.transcriptionId.summary,
          }
        : null,
    }));

    res.status(200).json(formattedCalls);
  } catch (error) {
    console.error("Error listing calls:", error);
    res
      .status(500)
      .json({ message: "Failed to list calls", error: error.message });
  }
});

export default router;
