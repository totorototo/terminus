import React from "react";

export default function ErrorDisplay({ error }) {
  if (!error) return null;
  return (
    <div style={{
      padding: "15px",
      background: "#5a2d27",
      borderRadius: "8px",
      marginBottom: "20px",
      border: "2px solid #6b3434"
    }}>
      <p style={{ margin: "0", color: "#ff6b6b" }}>
        ❌ Error: {error}
      </p>
    </div>
  );
} 