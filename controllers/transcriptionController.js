// controllers/transcriptionController.js (ES Modules version)

import Transcription from "../models/Transcription.js";
import Call from "../models/Call.js";

// Get all transcriptions
export const getAllTranscriptions = async (req, res) => {
  try {
    const transcriptions = await Transcription.find().sort({ createdAt: -1 });
    res.status(200).json(transcriptions);
  } catch (error) {
    console.error("Error fetching transcriptions:", error);
    res
      .status(500)
      .json({
        message: "Failed to fetch transcriptions",
        error: error.message,
      });
  }
};

// Get transcription by ID
export const getTranscriptionById = async (req, res) => {
  try {
    const transcription = await Transcription.findById(req.params.id);
    if (!transcription) {
      return res.status(404).json({ message: "Transcription not found" });
    }
    res.status(200).json(transcription);
  } catch (error) {
    console.error("Error fetching transcription:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch transcription", error: error.message });
  }
};

// Create a new transcription
export const createTranscription = async (req, res) => {
  try {
    const { callId, text, confidence } = req.body;

    // Create new transcription
    const newTranscription = new Transcription({
      callId,
      text,
      confidence,
    });

    await newTranscription.save();

    // Update the related call
    await Call.findByIdAndUpdate(callId, {
      transcriptionId: newTranscription._id,
      status: "transcription_complete",
    });

    res.status(201).json(newTranscription);
  } catch (error) {
    console.error("Error creating transcription:", error);
    res
      .status(500)
      .json({
        message: "Failed to create transcription",
        error: error.message,
      });
  }
};

// Update a transcription
export const updateTranscription = async (req, res) => {
  try {
    const { text, confidence } = req.body;

    const transcription = await Transcription.findByIdAndUpdate(
      req.params.id,
      { text, confidence, updatedAt: Date.now() },
      { new: true }
    );

    if (!transcription) {
      return res.status(404).json({ message: "Transcription not found" });
    }

    res.status(200).json(transcription);
  } catch (error) {
    console.error("Error updating transcription:", error);
    res
      .status(500)
      .json({
        message: "Failed to update transcription",
        error: error.message,
      });
  }
};

// Delete a transcription
export const deleteTranscription = async (req, res) => {
  try {
    const transcription = await Transcription.findByIdAndDelete(req.params.id);

    if (!transcription) {
      return res.status(404).json({ message: "Transcription not found" });
    }

    // Update the related call
    await Call.findByIdAndUpdate(transcription.callId, {
      transcriptionId: null,
      status: "transcription_deleted",
    });

    res.status(200).json({ message: "Transcription deleted successfully" });
  } catch (error) {
    console.error("Error deleting transcription:", error);
    res
      .status(500)
      .json({
        message: "Failed to delete transcription",
        error: error.message,
      });
  }
};
