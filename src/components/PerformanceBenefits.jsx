import React from "react";

export default function PerformanceBenefits() {
  return (
    <div style={{
      marginTop: "30px",
      padding: "15px",
      background: "#2a2a2a",
      borderRadius: "8px",
      fontSize: "0.9em",
      opacity: "0.8"
    }}>
      <p style={{ margin: "0" }}>
        💡 <strong>Performance Benefits:</strong> GPS processing runs in a Web Worker, 
        keeping the UI responsive even during heavy computations. 
        All Zig/WebAssembly optimizations are preserved while preventing UI freezing.
      </p>
    </div>
  );
} 