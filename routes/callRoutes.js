// routes/callRoutes.js (ES Modules version)

import express from "express";
import * as callController from "../controllers/callController.js";

const router = express.Router();

// GET all calls
router.get("/", callController.getAllCalls);

// GET a specific call
router.get("/:id", callController.getCallById);

// POST endpoint for Twilio webhook
router.post("/incoming", callController.handleIncomingCall);

// POST endpoint for storing call metadata
router.post("/", callController.createCall);

// DELETE a call
router.delete("/:id", callController.deleteCall);

export default router;
