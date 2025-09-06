import React from "react";

export default function WorkerStatus({ isWorkerReady }) {
  return (
    <div style={{
      padding: "15px",
      background: isWorkerReady ? "#2d5a27" : "#5a2d27",
      borderRadius: "8px",
      marginBottom: "20px",
      border: `2px solid ${isWorkerReady ? "#4a6741" : "#6b3434"}`
    }}>
      <p style={{ margin: "0", fontWeight: "bold" }}>
        🔧 Worker Status: {isWorkerReady ? "✅ Ready" : "⏳ Initializing..."}
      </p>
    </div>
  );
} 