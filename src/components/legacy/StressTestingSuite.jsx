import React from "react";

export default function StressTestingSuite({
  isStressTesting,
  stressProgress,
  stressResults,
  processing,
  handleStressBurstLoad,
  handleStressSustainedLoad,
  handleStressMemoryTest,
  handleStressUIResponsiveness,
  handleFullStressTest,
}) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <h4>🔥 Stress Testing Suite</h4>
      <p style={{ fontSize: "0.9em", opacity: "0.8", marginBottom: "15px" }}>
        Test Web Worker performance under various high-load scenarios to verify
        UI remains responsive
      </p>
      {/* Stress Test Progress */}
      {isStressTesting && (
        <div
          style={{
            padding: "15px",
            background: "#2a2a3e",
            borderRadius: "8px",
            marginBottom: "15px",
            border: "1px solid #4a4a6e",
          }}
        >
          <h5 style={{ margin: "0 0 10px 0" }}>⏳ Running Stress Test...</h5>
          <p style={{ margin: "0", fontSize: "0.9em" }}>
            {stressProgress || "Initializing..."}
          </p>
        </div>
      )}
      {/* Stress Test Controls */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "10px",
          marginBottom: "15px",
        }}
      >
        <button
          onClick={handleStressBurstLoad}
          disabled={processing || isStressTesting}
          style={{
            padding: "10px 15px",
            background: "#FF5722",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: processing || isStressTesting ? "not-allowed" : "pointer",
            opacity: processing || isStressTesting ? 0.6 : 1,
          }}
        >
          🚀 Burst Load Test
        </button>
        <button
          onClick={handleStressSustainedLoad}
          disabled={processing || isStressTesting}
          style={{
            padding: "10px 15px",
            background: "#9C27B0",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: processing || isStressTesting ? "not-allowed" : "pointer",
            opacity: processing || isStressTesting ? 0.6 : 1,
          }}
        >
          ⏱️ Sustained Load
        </button>
        <button
          onClick={handleStressMemoryTest}
          disabled={processing || isStressTesting}
          style={{
            padding: "10px 15px",
            background: "#FF9800",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: processing || isStressTesting ? "not-allowed" : "pointer",
            opacity: processing || isStressTesting ? 0.6 : 1,
          }}
        >
          🧠 Memory Stress
        </button>
        <button
          onClick={handleStressUIResponsiveness}
          disabled={processing || isStressTesting}
          style={{
            padding: "10px 15px",
            background: "#3F51B5",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: processing || isStressTesting ? "not-allowed" : "pointer",
            opacity: processing || isStressTesting ? 0.6 : 1,
          }}
        >
          🎬 UI Responsiveness
        </button>
        <button
          onClick={handleFullStressTest}
          disabled={processing || isStressTesting}
          style={{
            padding: "10px 15px",
            background: "linear-gradient(45deg, #FF5722, #9C27B0)",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: processing || isStressTesting ? "not-allowed" : "pointer",
            opacity: processing || isStressTesting ? 0.6 : 1,
            fontWeight: "bold",
          }}
        >
          🔥 Full Stress Suite
        </button>
      </div>
      {/* Stress Test Results */}
      {stressResults && (
        <div
          style={{
            padding: "20px",
            background: stressResults.testSuite ? "#1a3a1a" : "#2a2a3a",
            borderRadius: "8px",
            border: stressResults.testSuite
              ? "2px solid #4a6741"
              : "1px solid #4a4a6a",
          }}
        >
          <h5
            style={{
              margin: "0 0 15px 0",
              color: stressResults.testSuite ? "#90EE90" : "#87CEEB",
            }}
          >
            {stressResults.testSuite
              ? "🎯 Full Stress Test Results"
              : `📊 ${stressResults.testType} Results`}
          </h5>
          {stressResults.testSuite ? (
            <div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: "15px",
                  marginBottom: "20px",
                }}
              >
                <div
                  style={{
                    textAlign: "center",
                    padding: "10px",
                    background: "#2a4a2a",
                    borderRadius: "5px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "1.5em",
                      fontWeight: "bold",
                      color: "#90EE90",
                    }}
                  >
                    {stressResults.overallScore}
                  </div>
                  <div style={{ fontSize: "0.8em" }}>Overall Score</div>
                </div>
                <div
                  style={{
                    textAlign: "center",
                    padding: "10px",
                    background: "#2a4a2a",
                    borderRadius: "5px",
                  }}
                >
                  <div style={{ fontSize: "1.5em", fontWeight: "bold" }}>
                    {stressResults.completedTests}/{stressResults.totalTests}
                  </div>
                  <div style={{ fontSize: "0.8em" }}>Tests Completed</div>
                </div>
              </div>
              <div style={{ fontSize: "0.9em" }}>
                <h6>Test Results Summary:</h6>
                {Object.entries(stressResults.results).map(
                  ([testName, result]) => (
                    <div
                      key={testName}
                      style={{
                        marginBottom: "10px",
                        padding: "8px",
                        background: "#1a2a1a",
                        borderRadius: "3px",
                      }}
                    >
                      <strong>{testName}:</strong>{" "}
                      {result.successfulRequests ||
                        result.successfulTests ||
                        result.successfulSteps ||
                        "completed"}{" "}
                      successful
                      {result.avgProcessingTime &&
                        ` | Avg: ${result.avgProcessingTime.toFixed(2)}ms`}
                      {result.estimatedFPS &&
                        ` | FPS: ${result.estimatedFPS.toFixed(1)}`}
                    </div>
                  ),
                )}
              </div>
            </div>
          ) : (
            <div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                  gap: "10px",
                  marginBottom: "15px",
                }}
              >
                {stressResults.totalRequests && (
                  <>
                    <div
                      style={{
                        textAlign: "center",
                        padding: "8px",
                        background: "#2a3a2a",
                        borderRadius: "3px",
                      }}
                    >
                      <div style={{ fontWeight: "bold" }}>
                        {stressResults.successfulRequests}
                      </div>
                      <div style={{ fontSize: "0.8em" }}>Successful</div>
                    </div>
                    <div
                      style={{
                        textAlign: "center",
                        padding: "8px",
                        background: "#3a2a2a",
                        borderRadius: "3px",
                      }}
                    >
                      <div style={{ fontWeight: "bold" }}>
                        {stressResults.failedRequests}
                      </div>
                      <div style={{ fontSize: "0.8em" }}>Failed</div>
                    </div>
                  </>
                )}
                {stressResults.avgProcessingTime && (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "8px",
                      background: "#2a2a3a",
                      borderRadius: "3px",
                    }}
                  >
                    <div style={{ fontWeight: "bold" }}>
                      {stressResults.avgProcessingTime.toFixed(2)}ms
                    </div>
                    <div style={{ fontSize: "0.8em" }}>Avg Time</div>
                  </div>
                )}
                {stressResults.estimatedFPS && (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "8px",
                      background: "#2a2a3a",
                      borderRadius: "3px",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: "bold",
                        color: stressResults.isResponsive
                          ? "#90EE90"
                          : "#ff6b6b",
                      }}
                    >
                      {stressResults.estimatedFPS.toFixed(1)}
                    </div>
                    <div style={{ fontSize: "0.8em" }}>FPS</div>
                  </div>
                )}
              </div>
              {stressResults.frameDropPercentage !== undefined && (
                <p style={{ margin: "0", fontSize: "0.9em" }}>
                  Frame drops: {stressResults.frameDropPercentage.toFixed(1)}% |
                  UI Responsive:{" "}
                  <span
                    style={{
                      color: stressResults.isResponsive ? "#90EE90" : "#ff6b6b",
                    }}
                  >
                    {stressResults.isResponsive ? "✅ Yes" : "❌ No"}
                  </span>
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
