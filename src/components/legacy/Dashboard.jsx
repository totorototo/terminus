import React from "react";

export default function Dashboard({
  gpsResults,
  selectedPoints,
  processing,
  handleFindPointsAt,
  handleGetSection,
  handleProcessGPS,
}) {
  if (!gpsResults) return null;
  return (
    <div>
      <h3>✅ GPS Processing Complete</h3>
      {/* Basic Statistics */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "15px",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            padding: "15px",
            background: "#2a3a2a",
            borderRadius: "8px",
          }}
        >
          <h4 style={{ margin: "0 0 10px 0", color: "#90EE90" }}>
            📏 Distance
          </h4>
          <p style={{ margin: "0", fontSize: "1.5em" }}>
            {(gpsResults.totalDistance / 1000).toFixed(2)} km
          </p>
        </div>
        <div
          style={{
            padding: "15px",
            background: "#3a2a2a",
            borderRadius: "8px",
          }}
        >
          <h4 style={{ margin: "0 0 10px 0", color: "#FFB347" }}>
            ⛰️ Elevation
          </h4>
          <p style={{ margin: "0", fontSize: "1.5em" }}>
            {gpsResults.totalElevation.toFixed(0)} m
          </p>
        </div>
        <div
          style={{
            padding: "15px",
            background: "#2a2a3a",
            borderRadius: "8px",
          }}
        >
          <h4 style={{ margin: "0 0 10px 0", color: "#87CEEB" }}>📍 Points</h4>
          <p style={{ margin: "0", fontSize: "1.5em" }}>
            {gpsResults.pointCount.toLocaleString()}
          </p>
        </div>
      </div>
      {/* Interactive Controls */}
      <div style={{ marginBottom: "20px" }}>
        <h4>🎯 Interactive GPS Operations</h4>
        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            marginBottom: "15px",
          }}
        >
          <button
            onClick={() => handleFindPointsAt([5000, 10000, 20000, 30000])}
            disabled={processing}
            style={{
              padding: "10px 15px",
              background: "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: processing ? "not-allowed" : "pointer",
              opacity: processing ? 0.6 : 1,
            }}
          >
            📍 Find Points at 5, 10, 20, 30km
          </button>
          <button
            onClick={() => handleGetSection(0, 15000)}
            disabled={processing}
            style={{
              padding: "10px 15px",
              background: "#2196F3",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: processing ? "not-allowed" : "pointer",
              opacity: processing ? 0.6 : 1,
            }}
          >
            📊 Get First 15km Section
          </button>
          <button
            onClick={handleProcessGPS}
            disabled={processing}
            style={{
              padding: "10px 15px",
              background: "#FF9800",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: processing ? "not-allowed" : "pointer",
              opacity: processing ? 0.6 : 1,
            }}
          >
            🔄 Reprocess GPS Data
          </button>
        </div>
      </div>
      {/* Sample Points */}
      {gpsResults.samplePoints && gpsResults.samplePoints.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <h4>📌 Route Sample Points</h4>
          <div style={{ display: "grid", gap: "10px" }}>
            {gpsResults.samplePoints.map((sample, index) => (
              <div
                key={index}
                style={{
                  padding: "10px",
                  background: "#2a2a2a",
                  borderRadius: "5px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>
                  {sample.percent}% ({(sample.distance / 1000).toFixed(0)}km)
                </span>
                <code
                  style={{
                    background: "#333",
                    padding: "2px 6px",
                    borderRadius: "3px",
                  }}
                >
                  [{sample.point[0].toFixed(6)}, {sample.point[1].toFixed(6)},{" "}
                  {sample.point[2].toFixed(0)}]
                </code>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Selected Points */}
      {selectedPoints.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <h4>🎯 Selected Points</h4>
          <div style={{ display: "grid", gap: "10px" }}>
            {selectedPoints.map((point, index) => (
              <div
                key={index}
                style={{
                  padding: "10px",
                  background: "#1a3a1a",
                  borderRadius: "5px",
                  border: "1px solid #4a6741",
                }}
              >
                <strong>{point.distance / 1000}km:</strong>
                <code
                  style={{
                    marginLeft: "10px",
                    background: "#333",
                    padding: "2px 6px",
                    borderRadius: "3px",
                  }}
                >
                  [{point.point[0].toFixed(6)}, {point.point[1].toFixed(6)},{" "}
                  {point.point[2].toFixed(0)}]
                </code>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
