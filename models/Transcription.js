// models/Transcription.js (ES Modules version)

import mongoose from "mongoose";

const transcriptionSchema = new mongoose.Schema({
  callId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Call",
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  confidence: {
    type: Number,
    default: 0,
  },
  tags: [
    {
      type: String,
    },
  ],
  categories: [
    {
      type: String,
    },
  ],
  summary: {
    type: String,
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

const Transcription = mongoose.model("Transcription", transcriptionSchema);
console.log("Transcription model created successfully");

export default Transcription;
