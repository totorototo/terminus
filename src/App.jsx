import { use, useEffect, useState } from "react";
import viteLogo from "/vite.svg";
import "./App.css";
import { useGPSWorker } from "./useGPSWorker.js";
import { GPSStressTest } from "./stressTest.js";
import gpx from "./assets/vvx-xgtv-2026.gpx";
import csv from "./assets/vvx-xgtv-2026.csv";
import WorkerStatus from "./components/WorkerStatus.jsx";
import ProcessingStatus from "./components/ProcessingStatus.jsx";
import ErrorDisplay from "./components/ErrorDisplay.jsx";
import Dashboard from "./components/Dashboard.jsx";
import StressTestingSuite from "./components/StressTestingSuite.jsx";
import PerformanceBenefits from "./components/PerformanceBenefits.jsx";
import Profile from "./components/Profile.jsx";
import AutoSizer from "react-virtualized-auto-sizer";
import Scene from "./components/Scene.jsx";

// Helper function to create windows (like Rust's .windows(2))
function windows(array, size) {
  if (array.length < size) return [];
  return Array.from({ length: array.length - size + 1 }, (_, i) =>
    array.slice(i, i + size),
  );
}

// Function to compute sections from checkpoints
function computeSectionsFromCheckpoints(checkpoints) {
  // Create sliding windows of size 2 (pairs of consecutive checkpoints)
  const checkpointPairs = windows(checkpoints, 2);

  return checkpointPairs.map(([start, end], index) => {
    // Find GPS points corresponding to the distance range
    const startKm = start.km;
    const endKm = end.km;

    return {
      id: index + 1,
      name: `${start.location} → ${end.location}`,
      startKm,
      endKm,
      startCheckpoint: {
        location: start.location,
        label: start.label,
        km: startKm,
        kind: start.kind,
        cutoffTime: start.cutoffTime,
      },
      endCheckpoint: {
        location: end.location,
        label: end.label,
        km: endKm,
        kind: end.kind,
        cutoffTime: end.cutoffTime,
      },
      distance: endKm - startKm,
    };
  });
}

function App() {
  const [gpsResults, setGpsResults] = useState(null);
  const [section, setSection] = useState(null);
  const [sections, setSections] = useState(); // Store computed sections
  const [error, setError] = useState(null);
  const [selectedPoints, setSelectedPoints] = useState([]);
  // Stress testing state
  const [stressTest, setStressTest] = useState(null);
  const [stressResults, setStressResults] = useState(null);
  const [stressProgress, setStressProgress] = useState(null);
  const [isStressTesting, setIsStressTesting] = useState(false);
  const [mode, setMode] = useState("3d"); // "2d" or "3d"

  const {
    isWorkerReady,
    processing,
    progress,
    progressMessage,
    processSections,
    processGPSData,
    calculateRouteStats,
    findPointsAtDistances,
    getRouteSection,
  } = useGPSWorker();

  useEffect(() => {
    if (isWorkerReady && !stressTest) {
      const testInstance = new GPSStressTest({
        processGPSData,
        calculateRouteStats,
        findPointsAtDistances,
        getRouteSection,
      });
      setStressTest(testInstance);
    }
  }, [
    isWorkerReady,
    processGPSData,
    calculateRouteStats,
    findPointsAtDistances,
    getRouteSection,
  ]);

  useEffect(() => {
    if (isWorkerReady && gpx.features?.[0]?.geometry?.coordinates) {
      handleProcessGPS();
    }
  }, [isWorkerReady]);

  useEffect(() => {
    if (gpsResults && csv.length) {
      const computedSections = computeSectionsFromCheckpoints(csv);
      handleProcessSections(computedSections);
    }
  }, [gpsResults]);

  const handleProcessGPS = async () => {
    try {
      setError(null);

      const coordinates = gpx.features[0].geometry.coordinates;
      const results = await processGPSData(coordinates, (progress, message) => {
        // Optionally handle progress
      });
      setGpsResults(results);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleProcessSections = async (sections) => {
    if (!gpsResults) return;
    try {
      setError(null);
      const coordinates = gpx.features[0].geometry.coordinates;
      const results = await processSections(
        coordinates,
        sections,
        (progress, message) => {
          // Optionally handle progress
        },
      );
      setSections(results);
    } catch (err) {
      debugger;
      setError(err.message);
    }
  };

  const handleFindPointsAt = async (distances) => {
    if (!gpsResults) return;
    try {
      const coordinates = gpx.features[0].geometry.coordinates;
      const points = await findPointsAtDistances(coordinates, distances);
      setSelectedPoints(points.points);
    } catch (err) {
      // Optionally handle error
    }
  };

  const handleGetSection = async (start, end) => {
    try {
      const coordinates = gpx.features[0].geometry.coordinates;
      const section = await getRouteSection(coordinates, start, end);
      setSection(section);
      // Optionally do something with section
    } catch (err) {
      setError(err.message);
    }
  };

  // Stress testing handlers
  const handleStressBurstLoad = async () => {
    if (!stressTest || isStressTesting) return;
    setIsStressTesting(true);
    setStressProgress("Preparing burst load test...");
    setStressResults(null);
    try {
      await stressTest.testBurstLoad({
        concurrentRequests: 8,
        pointsPerRequest: 5000,
        onProgress: (completed, total) => {
          setStressProgress(
            `Burst Load: ${completed}/${total} requests completed`,
          );
        },
        onResult: (summary) => {
          setStressResults(summary);
          setStressProgress(null);
          setIsStressTesting(false);
        },
      });
    } catch (error) {
      setError(`Burst load test failed: ${error.message}`);
      setIsStressTesting(false);
      setStressProgress(null);
    }
  };

  const handleStressSustainedLoad = async () => {
    if (!stressTest || isStressTesting) return;
    setIsStressTesting(true);
    setStressProgress("Starting sustained load test...");
    setStressResults(null);
    try {
      await stressTest.testSustainedLoad({
        duration: 20000, // 20 seconds
        requestInterval: 2000, // Every 2 seconds
        pointsPerRequest: 4000,
        onProgress: (completed, estimated) => {
          setStressProgress(
            `Sustained Load: ${completed}/${estimated} requests sent`,
          );
        },
        onResult: (summary) => {
          setStressResults(summary);
          setStressProgress(null);
          setIsStressTesting(false);
        },
      });
    } catch (error) {
      setError(`Sustained load test failed: ${error.message}`);
      setIsStressTesting(false);
      setStressProgress(null);
    }
  };

  const handleStressMemoryTest = async () => {
    if (!stressTest || isStressTesting) return;
    setIsStressTesting(true);
    setStressProgress("Starting memory stress test...");
    setStressResults(null);
    try {
      await stressTest.testMemoryStress({
        pointCounts: [25000, 50000, 100000],
        onProgress: (completed, total, currentPoints) => {
          setStressProgress(
            `Memory Test: ${completed}/${total} - Processing ${currentPoints.toLocaleString()} points`,
          );
        },
        onResult: (summary) => {
          setStressResults(summary);
          setStressProgress(null);
          setIsStressTesting(false);
        },
      });
    } catch (error) {
      setError(`Memory stress test failed: ${error.message}`);
      setIsStressTesting(false);
      setStressProgress(null);
    }
  };

  const handleStressUIResponsiveness = async () => {
    if (!stressTest || isStressTesting) return;
    setIsStressTesting(true);
    setStressProgress("Testing UI responsiveness during heavy processing...");
    setStressResults(null);
    try {
      await stressTest.testUIResponsiveness({
        onResult: (summary) => {
          setStressResults(summary);
          setStressProgress(null);
          setIsStressTesting(false);
        },
      });
    } catch (error) {
      setError(`UI responsiveness test failed: ${error.message}`);
      setIsStressTesting(false);
      setStressProgress(null);
    }
  };

  const handleFullStressTest = async () => {
    if (!stressTest || isStressTesting) return;
    setIsStressTesting(true);
    setStressProgress("Starting comprehensive stress test suite...");
    setStressResults(null);
    try {
      await stressTest.runFullStressTest(
        (message, step, total) => {
          setStressProgress(`${message} (${step}/${total})`);
        },
        (summary) => {
          setStressResults(summary);
          setStressProgress(null);
          setIsStressTesting(false);
        },
      );
    } catch (error) {
      setError(`Full stress test failed: ${error.message}`);
      setIsStressTesting(false);
      setStressProgress(null);
    }
  };

  return (
    <div
      className="App"
      style={{
        backgroundColor: "#262424ff",
        color: "#eee",
        width: "100%",
        minHeight: "100%",
        position: "relative",
      }}
    >
      {/* Mode Toggle Button */}
      <button
        onClick={() => setMode(mode === "3d" ? "2d" : "3d")}
        style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          zIndex: 1000,
          padding: "12px 24px",
          backgroundColor: mode === "3d" ? "#4CAF50" : "#2196F3",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "14px",
          fontWeight: "600",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
          transition: "all 0.3s ease",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = "translateY(-2px)";
          e.target.style.boxShadow = "0 6px 16px rgba(0, 0, 0, 0.4)";
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = "translateY(0px)";
          e.target.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.3)";
        }}
      >
        {mode === "3d" ? "🗺️" : "📊"}
        {mode === "3d" ? "Switch to 2D Profile" : "Switch to 3D View"}
      </button>

      <div style={{ width: "100%", height: "100%", padding: "2rem" }}>
        <AutoSizer>
          {({ width, height }) => (
            <Scene
              width={width}
              height={height}
              coordinates={gpx.features?.[0]?.geometry?.coordinates}
              sections={sections}
              mode={mode}
            />
          )}
        </AutoSizer>
      </div>
    </div>
    // <>
    //   <div>
    //     <a href="https://vite.dev" target="_blank">
    //       <img src={viteLogo} className="logo" alt="Vite logo" />
    //     </a>
    //   </div>
    //   <h1 style={{ textAlign: "center", marginBottom: "10px" }}>
    //     🗺️ GPS Route Processor
    //   </h1>
    //   <div
    //     style={{
    //       textAlign: "center",
    //       marginBottom: "30px",
    //       padding: "15px",
    //       background: "linear-gradient(135deg, #1a1a2e, #16213e)",
    //       borderRadius: "8px",
    //       border: "1px solid #333",
    //     }}
    //   >
    //     <h2
    //       style={{ margin: "0 0 10px 0", fontSize: "1.2em", color: "#87CEEB" }}
    //     >
    //       ⚡ Powered by Zig WebAssembly + Web Workers
    //     </h2>
    //     <p style={{ margin: "0", fontSize: "0.95em", opacity: "0.9" }}>
    //       Non-blocking GPS processing using Web Workers for responsive UI
    //     </p>
    //   </div>
    //   <div className="card">
    //     <h2>📊 GPS Processing Status</h2>
    //     <WorkerStatus isWorkerReady={isWorkerReady} />
    //     <ProcessingStatus
    //       processing={processing}
    //       progress={progress}
    //       progressMessage={progressMessage}
    //     />
    //     <ErrorDisplay error={error} />
    //     <Dashboard
    //       gpsResults={gpsResults}
    //       selectedPoints={selectedPoints}
    //       processing={processing}
    //       handleFindPointsAt={handleFindPointsAt}
    //       handleGetSection={handleGetSection}
    //       handleProcessGPS={handleProcessGPS}
    //     />
    //     <div style={{ height: "200px", width: "100%", paddingBottom:"40px", paddingTop:"40px" }}>
    //       <AutoSizer>
    //         {({ width, height }) => (
    //           <Profile
    //             gpsResults={gpsResults}
    //             width={width}
    //             height={height}
    //             handleProcessGPS={handleProcessGPS}
    //             handleGetSection={handleGetSection}
    //             section={section}
    //             setSection={setSection}
    //           />
    //         )}
    //       </AutoSizer>
    //     </div>
    //      <div style={{ height: "600px", width: "100%" }}>
    //       <AutoSizer>
    //         {({ width, height }) => (
    //           <ThreeDimensionalProfile
    //             width={width}
    //             height={height}
    //             coordinates={gpx.features?.[0]?.geometry?.coordinates}
    //             {...(gpsResults && { checkpoints: gpsResults.samplePoints })}
    //           />
    //         )}
    //       </AutoSizer>
    //     </div>

    //     <StressTestingSuite
    //       isStressTesting={isStressTesting}
    //       stressProgress={stressProgress}
    //       stressResults={stressResults}
    //       processing={processing}
    //       handleStressBurstLoad={handleStressBurstLoad}
    //       handleStressSustainedLoad={handleStressSustainedLoad}
    //       handleStressMemoryTest={handleStressMemoryTest}
    //       handleStressUIResponsiveness={handleStressUIResponsiveness}
    //       handleFullStressTest={handleFullStressTest}
    //     />
    //     <PerformanceBenefits />
    //   </div>
    //   <p className="read-the-docs">
    //     Click on the Vite and React logos to learn more
    //   </p>
    // </>
  );
}

export default App;
