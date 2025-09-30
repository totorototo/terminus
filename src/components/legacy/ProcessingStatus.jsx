export default function ProcessingStatus({
  processing,
  progress,
  progressMessage,
}) {
  const isProcessing = processing;
  const displayProgress = isProcessing ? progress : 0;
  const displayMessage = isProcessing ? progressMessage : "idle";
  const title = isProcessing ? "⏳ Processing GPS Data..." : "💤 Idle";

  return (
    <div
      style={{
        padding: "20px",
        background: isProcessing ? "#2a2a3e" : "#2a2a2a",
        borderRadius: "8px",
        marginBottom: "20px",
        border: `1px solid ${isProcessing ? "#4a4a6e" : "#4a4a4a"}`,
        opacity: isProcessing ? 1 : 0.7,
      }}
    >
      <h3 style={{ margin: "0 0 15px 0" }}>{title}</h3>
      <div
        style={{
          background: "#333",
          borderRadius: "10px",
          padding: "5px",
          marginBottom: "10px",
        }}
      >
        <div
          style={{
            background: isProcessing
              ? "linear-gradient(90deg, #4CAF50, #45a049)"
              : "linear-gradient(90deg, #666, #555)",
            height: "20px",
            borderRadius: "5px",
            width: `${displayProgress}%`,
            transition: "width 0.3s ease",
          }}
        ></div>
      </div>
      <p style={{ margin: "0", fontSize: "0.9em" }}>
        {displayProgress}% - {displayMessage}
      </p>
    </div>
  );
}
