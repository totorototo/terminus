import React from "react";

export default function ProcessingStatus({ processing, progress, progressMessage }) {
  if (!processing) return null;
  return (
    <div style={{
      padding: "20px",
      background: "#2a2a3e",
      borderRadius: "8px",
      marginBottom: "20px",
      border: "1px solid #4a4a6e"
    }}>
      <h3 style={{ margin: "0 0 15px 0" }}>⏳ Processing GPS Data...</h3>
      <div style={{
        background: "#333",
        borderRadius: "10px",
        padding: "5px",
        marginBottom: "10px"
      }}>
        <div style={{
          background: "linear-gradient(90deg, #4CAF50, #45a049)",
          height: "20px",
          borderRadius: "5px",
          width: `${progress}%`,
          transition: "width 0.3s ease"
        }}></div>
      </div>
      <p style={{ margin: "0", fontSize: "0.9em" }}>
        {progress}% - {progressMessage}
      </p>
    </div>
  );
} 