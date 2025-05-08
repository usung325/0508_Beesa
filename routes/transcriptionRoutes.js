// routes/transcriptionRoutes.js (ES Modules version)

import express from "express";
import * as transcriptionController from "../controllers/transcriptionController.js";

const router = express.Router();

// GET all transcriptions
router.get("/", transcriptionController.getAllTranscriptions);

// GET a specific transcription
router.get("/:id", transcriptionController.getTranscriptionById);

// POST new transcription
router.post("/", transcriptionController.createTranscription);

// PUT update transcription
router.put("/:id", transcriptionController.updateTranscription);

// DELETE a transcription
router.delete("/:id", transcriptionController.deleteTranscription);

export default router;
