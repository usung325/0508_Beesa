// models/Call.js (ES Modules version)

import mongoose from "mongoose";

const callSchema = new mongoose.Schema({
  callSid: {
    type: String,
    required: true,
    unique: true,
  },
  from: {
    type: String,
    required: true,
  },
  to: {
    type: String,
    required: true,
  },
  duration: {
    type: Number,
    default: 0,
  },
  recordingUrl: {
    type: String,
  },
  transcriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Transcription",
  },
  status: {
    type: String,
    enum: [
      "pending_transcription",
      "transcription_in_progress",
      "transcription_complete",
      "transcription_failed",
      "transcription_deleted",
    ],
    default: "pending_transcription",
  },
  metadata: {
    type: Object,
    default: {},
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Ensure MongoDB is creating the model correctly
const Call = mongoose.model("Call", callSchema);
console.log("Call model created successfully");

export default Call;
