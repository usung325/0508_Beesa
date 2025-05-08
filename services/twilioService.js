// services/twilioService.js (ES Modules version)

import twilio from "twilio";
import fetch from "node-fetch"; // You might need to install this

const VoiceResponse = twilio.twiml.VoiceResponse;

// Initialize Twilio client
let client;

try {
  client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
} catch (error) {
  console.warn("Twilio client initialization failed:", error.message);
  console.warn("Twilio functionality will be limited");
}

// Generate TwiML for voice response
export const generateVoiceResponse = () => {
  const response = new VoiceResponse();

  // Add a greeting message
  response.say(
    {
      voice: "alice",
      language: "en-US",
    },
    "Thank you for calling. Please leave a message after the tone."
  );

  // Record the caller's message
  response.record({
    action: "/api/calls/recording-status",
    maxLength: 120,
    transcribe: false, // We'll use OpenAI instead of Twilio's transcription
    playBeep: true,
    timeout: 5,
  });

  // Add a goodbye message
  response.say(
    {
      voice: "alice",
      language: "en-US",
    },
    "Thank you for your message. Goodbye."
  );

  return response;
};

// Get call details from Twilio API
export const getCallDetails = async (callSid) => {
  try {
    if (!client) {
      throw new Error("Twilio client not initialized");
    }

    const call = await client.calls(callSid).fetch();
    return call;
  } catch (error) {
    console.error("Error fetching call details from Twilio:", error);
    throw error;
  }
};

// Get recording details from Twilio API
export const getRecordingDetails = async (recordingSid) => {
  try {
    if (!client) {
      throw new Error("Twilio client not initialized");
    }

    const recording = await client.recordings(recordingSid).fetch();
    return recording;
  } catch (error) {
    console.error("Error fetching recording details from Twilio:", error);
    throw error;
  }
};

// Download recording file from Twilio
export const downloadRecording = async (recordingUrl) => {
  try {
    // If it's a local file path, convert to a file URL
    if (recordingUrl.startsWith("/")) {
      return recordingUrl; // For local testing, we just return the path
    }

    // Add authentication to the recordingUrl if necessary
    const authUrl = recordingUrl.includes("?")
      ? `${recordingUrl}&AccountSid=${process.env.TWILIO_ACCOUNT_SID}`
      : `${recordingUrl}?AccountSid=${process.env.TWILIO_ACCOUNT_SID}`;

    const response = await fetch(authUrl);

    if (!response.ok) {
      throw new Error(
        `Failed to download recording: ${response.status} ${response.statusText}`
      );
    }

    const audioBuffer = await response.arrayBuffer();
    return Buffer.from(audioBuffer);
  } catch (error) {
    console.error("Error downloading recording from Twilio:", error);
    throw error;
  }
};
