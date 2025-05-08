// src/components/CallManagementTest.jsx - Updated API URLs
import { useState, useEffect } from "react";

function CallManagementTest() {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fromNumber, setFromNumber] = useState("+15551234567");
  const [uploadStatus, setUploadStatus] = useState("");

  // The API base URL - change to match your backend server
  const API_URL = "http://localhost:5001"; // Direct connection instead of proxy

  // Fetch calls with improved error handling
  const fetchCalls = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("Fetching calls...");
      const response = await fetch(`${API_URL}/api/test/calls`);
      console.log("Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Server response:", errorText);
        throw new Error(
          `Failed to fetch calls: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log("Calls data:", data);
      setCalls(data);
    } catch (err) {
      console.error("Error fetching calls:", err);
      setError("Failed to load calls. Please try again. " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Poll call status with improved error handling
  const pollCallStatus = (callId) => {
    console.log("Starting to poll call status for ID:", callId);
    const intervalId = setInterval(async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/test/calls/${callId}/status`
        );

        if (!response.ok) {
          console.error(
            "Error response when polling status:",
            response.status,
            response.statusText
          );
          return; // Continue polling
        }

        const data = await response.json();
        console.log("Poll status result:", data);

        if (data.status === "transcription_complete") {
          setUploadStatus("Transcription completed successfully!");
          clearInterval(intervalId);
          fetchCalls();
        } else if (data.status === "transcription_failed") {
          setUploadStatus("Transcription failed. Please try again.");
          clearInterval(intervalId);
        } else {
          setUploadStatus(`Status: ${data.status}. Still processing...`);
        }
      } catch (error) {
        console.error("Error checking status:", error);
        // Continue polling on error
      }
    }, 3000);

    // Clear interval after 2 minutes regardless
    setTimeout(() => {
      clearInterval(intervalId);
    }, 120000);
  };

  // Handle file upload with improved error handling
  const handleUpload = async (e) => {
    e.preventDefault();

    if (!selectedFile) {
      setUploadStatus("Please select an audio file");
      return;
    }

    const formData = new FormData();
    formData.append("audioFile", selectedFile);
    formData.append("from", fromNumber);

    setUploadStatus("Uploading and processing... Please wait.");

    try {
      console.log("Uploading file...");
      const response = await fetch(`${API_URL}/api/test/simulate-call`, {
        method: "POST",
        body: formData,
      });

      console.log("Upload response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Server upload response:", errorText);
        throw new Error(
          `Upload failed: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log("Upload response data:", data);

      if (data.callId) {
        setUploadStatus(`Call simulation started! Call ID: ${data.callId}`);
        pollCallStatus(data.callId);
      } else {
        setUploadStatus("Error: " + (data.message || "Unknown error"));
      }
    } catch (err) {
      console.error("Error uploading file:", err);
      setUploadStatus("Error: " + err.message);
    }
  };

  // Ping server to check connectivity
  const pingServer = async () => {
    try {
      const response = await fetch(`${API_URL}/api/test/ping`);
      const data = await response.json();
      console.log("Server ping response:", data);
      return data;
    } catch (err) {
      console.error("Server ping failed:", err);
      return null;
    }
  };

  // Load calls on component mount
  useEffect(() => {
    console.log("Component mounted, checking server connection...");
    pingServer().then((data) => {
      if (data) {
        console.log("Server connection successful, fetching calls...");
        fetchCalls();
      } else {
        setError(
          "Cannot connect to the server. Please make sure the backend is running."
        );
      }
    });
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Call Management Test</h1>

      {/* Upload Form */}
      <div className="bg-gray-100 p-4 rounded mb-6">
        <h2 className="text-xl font-semibold mb-2">Upload Call Recording</h2>
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block mb-1">Audio File:</label>
            <input
              type="file"
              accept="audio/*"
              onChange={(e) => setSelectedFile(e.target.files[0])}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block mb-1">From Number:</label>
            <input
              type="text"
              value={fromNumber}
              onChange={(e) => setFromNumber(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>

          <button
            type="submit"
            className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
          >
            Upload & Process
          </button>
        </form>

        {uploadStatus && (
          <div className="mt-4 p-3 bg-gray-200 rounded">{uploadStatus}</div>
        )}
      </div>

      {/* Calls List */}
      <div className="bg-gray-100 p-4 rounded">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Recent Calls</h2>
          <button
            onClick={fetchCalls}
            className="bg-green-500 text-white py-1 px-3 rounded hover:bg-green-600"
          >
            Refresh
          </button>
        </div>

        {error && <p className="text-red-500 p-2 bg-red-50 rounded">{error}</p>}

        {loading ? (
          <p>Loading calls...</p>
        ) : calls.length === 0 ? (
          <p>No calls found. Upload an audio file to get started.</p>
        ) : (
          <div className="space-y-4">
            {calls.map((call) => (
              <div key={call.callId} className="border p-4 rounded bg-white">
                <div className="mb-2">
                  <p>
                    <strong>From:</strong> {call.from}
                  </p>
                  <p>
                    <strong>Date:</strong>{" "}
                    {new Date(call.createdAt).toLocaleString()}
                  </p>
                  <p>
                    <strong>Status:</strong> {call.status}
                  </p>
                </div>

                {call.transcription ? (
                  <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-300">
                    <h4 className="font-semibold">Transcription:</h4>
                    <p className="my-2">{call.transcription.text}</p>

                    {call.transcription.summary && (
                      <>
                        <h4 className="font-semibold mt-3">Summary:</h4>
                        <p>{call.transcription.summary}</p>
                      </>
                    )}
                  </div>
                ) : (
                  <p>Transcription not available yet.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CallManagementTest;
