// server.js - Main server file (ES Modules version)

import OpenAI from "openai";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import multer from "multer";

// Import models
import Call from "./models/Call.js";
import Transcription from "./models/Transcription.js";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
// Debug MongoDB connection string
const mongoUriDebug = process.env.MONGO_URI || "Not defined";
console.log(
  "MongoDB connection string first few chars:",
  mongoUriDebug.substring(0, 20) + "..."
);

// Check for quotes or spaces in MongoDB URI
if (mongoUriDebug.includes('"') || mongoUriDebug.includes("'")) {
  console.error(
    "ERROR: MONGO_URI contains quotes! Remove all quotes from your .env file."
  );
}

if (mongoUriDebug.startsWith(" ") || mongoUriDebug.endsWith(" ")) {
  console.error("ERROR: MONGO_URI has leading or trailing whitespace!");
}

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "https://beesa.vercel.app/",
      "https://beesa-8bci30qjp-yoo-sung-lees-projects.vercel.app",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.options("*", cors()); // Enable pre-flight for all routes

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev")); // Logging

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, "public");
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Static files - for uploaded files and frontend
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "dist")));
}

// Test ping route
app.get("/api/test/ping", (req, res) => {
  res.status(200).json({
    message: "API is working!",
    timestamp: new Date().toISOString(),
    cors: "Enabled",
    mongodb:
      mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
  });
});
// 2. Base route
// // Add a root route handler that returns a simple response
// app.get("/", (req, res) => {
//   res.send("Call Management API is running");
// });

// 3. Error handling
// Add global error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ error: "Server error", message: err.message });
});
// 4. Vercel-specific route handling
// If API routes aren't working, try a simpler route that doesn't use Express Router
app.get("/simple-ping", (req, res) => {
  res.json({ status: "OK", message: "Simple ping successful" });
});
// Add a simpler test endpoint that doesn't depend on MongoDB or other services
app.get("/simple-test", (req, res) => {
  res.json({
    status: "OK",
    message: "Server is running correctly",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
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

// Test calls route
app.get("/api/test/calls", async (req, res) => {
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

// Route to get test call status
app.get("/api/test/calls/:id/status", async (req, res) => {
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

// Function to handle API errors with retries
const withRetry = async (apiCall, maxRetries = 3, delay = 1000) => {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error;
      console.error(`API attempt ${attempt} failed:`, error.message);

      // Check if we should retry
      if (attempt < maxRetries) {
        console.log(`Retrying in ${delay / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        // Increase delay for next retry (exponential backoff)
        delay *= 2;
      }
    }
  }

  // If we get here, all retries failed
  throw lastError;
};

// File cleanup function
const cleanupFile = async (filePath) => {
  try {
    // Check if file exists
    if (fs.existsSync(filePath)) {
      // Delete the file
      fs.unlinkSync(filePath);
      console.log(`Cleaned up file: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error cleaning up file ${filePath}:`, error);
    // Don't throw the error - this is non-critical
  }
};

// Transcription and analysis function
const processCallRecording = async (callId, recordingPath) => {
  try {
    console.log(
      `Starting transcription process for call ${callId} with recording ${recordingPath}`
    );

    // Update call status to in progress
    await Call.findByIdAndUpdate(callId, {
      status: "transcription_in_progress",
    });
    console.log(`Updated call ${callId} status to 'transcription_in_progress'`);

    // Step 1: Read the audio file
    const audioFile = fs.createReadStream(recordingPath);

    // Step 2: Transcribe with OpenAI Whisper API
    console.log("Sending file to OpenAI Whisper API...");
    const transcriptionResponse = await withRetry(async () => {
      return await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        language: "en",
        response_format: "json",
      });
    });

    console.log("Received transcription from OpenAI");
    const transcriptionText = transcriptionResponse.text;

    // Step 3: Analyze the transcription with GPT
    console.log("Analyzing transcription with GPT...");
    const analysisResponse = await withRetry(async () => {
      return await openai.chat.completions.create({
        model: "gpt-3.5-turbo", // You can use 'gpt-4' for better results if you have access
        messages: [
          {
            role: "system",
            content:
              "You are an expert at analyzing business call transcriptions. " +
              "Analyze the following call transcription and provide: " +
              "1. A brief summary of the call (2-3 sentences) " +
              '2. A list of 3-5 categories that describe the call content (e.g., "product inquiry", "technical issue") ' +
              "3. A list of 5-10 important keywords or tags from the call " +
              'Format your response as a JSON object with keys: "summary", "categories" (array), and "tags" (array)',
          },
          {
            role: "user",
            content: transcriptionText,
          },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      });
    });

    console.log("Received analysis from GPT");
    const analysis = JSON.parse(analysisResponse.choices[0].message.content);

    // Step 4: Create a new transcription record
    const newTranscription = new Transcription({
      callId,
      text: transcriptionText,
      confidence: 0.9, // Whisper doesn't provide a confidence score
      summary: analysis.summary,
      categories: analysis.categories,
      tags: analysis.tags,
    });

    await newTranscription.save();
    console.log(
      `Created transcription ${newTranscription._id} for call ${callId}`
    );

    // Step 5: Update the call with the transcription ID
    await Call.findByIdAndUpdate(callId, {
      transcriptionId: newTranscription._id,
      status: "transcription_complete",
    });

    console.log(`Updated call ${callId} status to 'transcription_complete'`);

    // Optional: Clean up the audio file after processing
    // Uncomment if you want to delete audio files after processing
    // await cleanupFile(recordingPath);

    return newTranscription;
  } catch (error) {
    console.error("Error processing call recording:", error);

    // Update call status to failed
    try {
      await Call.findByIdAndUpdate(callId, { status: "transcription_failed" });
      console.log(`Updated call ${callId} status to 'transcription_failed'`);
    } catch (updateError) {
      console.error("Error updating call status to failed:", updateError);
    }

    throw error;
  }
};

// Route to simulate an incoming call with an audio file
app.post(
  "/api/test/simulate-call",
  upload.single("audioFile"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No audio file provided" });
      }

      console.log("File received:", req.file);
      console.log("Form data:", req.body);

      // Create a "fake" call record
      const newCall = new Call({
        callSid: `test-${Date.now()}`,
        from: req.body.from || "+15551234567", // Default or provided phone number
        to: process.env.TWILIO_PHONE_NUMBER || "+15551234567",
        recordingUrl: req.file.path,
        status: "pending_transcription",
      });

      await newCall.save();
      console.log(`Created new call record: ${newCall._id}`);

      // Process the transcription in the background
      // This allows the response to return quickly
      setTimeout(() => {
        processCallRecording(newCall._id, req.file.path)
          .then(() => {
            console.log(
              `Completed processing transcription for call ${newCall._id}`
            );
          })
          .catch((err) => {
            console.error(
              `Error processing transcription for call ${newCall._id}:`,
              err
            );
          });
      }, 3000); // Wait 3 seconds to simulate processing time

      // Return success immediately
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
  }
);

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "Server is running" });
});

// Database connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully");
  })
  .catch((err) => console.error("MongoDB connection error:", err));

// Serve React app in production
if (process.env.NODE_ENV === "production") {
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Test UI available at: http://localhost:${PORT}/test-ui`);
});

export default app; // For testing purposes
