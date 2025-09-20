import { useEffect, useState } from "react";
import viteLogo from "/vite.svg";
import "./App.css";
import { useGPSWorker } from "./useGPSWorker.js";
import { GPSStressTest } from "./stressTest.js";
import gpx from "./assets/vvx-xgtv-2026.gpx";
import WorkerStatus from "./components/WorkerStatus.jsx";
import ProcessingStatus from "./components/ProcessingStatus.jsx";
import ErrorDisplay from "./components/ErrorDisplay.jsx";
import Dashboard from "./components/Dashboard.jsx";
import StressTestingSuite from "./components/StressTestingSuite.jsx";
import PerformanceBenefits from "./components/PerformanceBenefits.jsx";
import Profile from "./components/Profile.jsx";
import AutoSizer from "react-virtualized-auto-sizer";
import ThreeDimensionalProfile from "./components/3DProfile.jsx";

function App() {
  const [gpsResults, setGpsResults] = useState(null);
  const [section, setSection] = useState(null);
  const [error, setError] = useState(null);
  const [selectedPoints, setSelectedPoints] = useState([]);
  // Stress testing state
  const [stressTest, setStressTest] = useState(null);
  const [stressResults, setStressResults] = useState(null);
  const [stressProgress, setStressProgress] = useState(null);
  const [isStressTesting, setIsStressTesting] = useState(false);

  const {
    isWorkerReady,
    processing,
    progress,
    progressMessage,
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

  const handleProcessGPS = async (startIndex, endIndex) => {
    try {
      setError(null);
      let coordinates;
      if (startIndex !== undefined && endIndex !== undefined) {
        coordinates = gpx.features[0].geometry.coordinates.slice(
          startIndex,
          endIndex + 1,
        );
      } else {
        coordinates = gpx.features[0].geometry.coordinates;
      }
      const results = await processGPSData(coordinates, (progress, message) => {
        // Optionally handle progress
      });
      setGpsResults(results);
    } catch (err) {
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
      console.log("Section received in App:", section);
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
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
      </div>
      <h1 style={{ textAlign: "center", marginBottom: "10px" }}>
        🗺️ GPS Route Processor
      </h1>
      <div
        style={{
          textAlign: "center",
          marginBottom: "30px",
          padding: "15px",
          background: "linear-gradient(135deg, #1a1a2e, #16213e)",
          borderRadius: "8px",
          border: "1px solid #333",
        }}
      >
        <h2
          style={{ margin: "0 0 10px 0", fontSize: "1.2em", color: "#87CEEB" }}
        >
          ⚡ Powered by Zig WebAssembly + Web Workers
        </h2>
        <p style={{ margin: "0", fontSize: "0.95em", opacity: "0.9" }}>
          Non-blocking GPS processing using Web Workers for responsive UI
        </p>
      </div>
      <div className="card">
        <h2>📊 GPS Processing Status</h2>
        <WorkerStatus isWorkerReady={isWorkerReady} />
        <ProcessingStatus
          processing={processing}
          progress={progress}
          progressMessage={progressMessage}
        />
        <ErrorDisplay error={error} />
        <Dashboard
          gpsResults={gpsResults}
          selectedPoints={selectedPoints}
          processing={processing}
          handleFindPointsAt={handleFindPointsAt}
          handleGetSection={handleGetSection}
          handleProcessGPS={handleProcessGPS}
        />
        <div style={{ height: "200px", width: "100%", paddingBottom:"40px", paddingTop:"40px" }}>
          <AutoSizer>
            {({ width, height }) => (
              <Profile
                gpsResults={gpsResults}
                width={width}
                height={height}
                handleProcessGPS={handleProcessGPS}
                handleGetSection={handleGetSection}
                section={section}
                setSection={setSection}
              />
            )}
          </AutoSizer>
        </div>
        <div style={{ height: "400px", width: "100%" }}>
          <AutoSizer>
            {({ width, height }) => (
              <ThreeDimensionalProfile
                width={width}
                height={height}
                coordinates={gpx.features?.[0]?.geometry?.coordinates}
              />
            )}
          </AutoSizer>
        </div>

        <StressTestingSuite
          isStressTesting={isStressTesting}
          stressProgress={stressProgress}
          stressResults={stressResults}
          processing={processing}
          handleStressBurstLoad={handleStressBurstLoad}
          handleStressSustainedLoad={handleStressSustainedLoad}
          handleStressMemoryTest={handleStressMemoryTest}
          handleStressUIResponsiveness={handleStressUIResponsiveness}
          handleFullStressTest={handleFullStressTest}
        />
        <PerformanceBenefits />
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  );
}

export default App;
