import { useEffect, useState } from "react";
import { useGPSWorker } from "./useGPSWorker.js";
import { GPSStressTest } from "./stressTest.js";
import gpx from "./assets/vvx-xgtv-2026.gpx";
import csv from "./assets/vvx-xgtv-2026.csv";
import AutoSizer from "react-virtualized-auto-sizer";
import Scene from "./components/scene/Scene.jsx";
import style from "./App.style.js";

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

function App({ className }) {
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
    <div className={className}>
      <AutoSizer>
        {({ width, height }) => (
          <Scene
            width={width}
            height={height}
            coordinates={gpx.features?.[0]?.geometry?.coordinates}
            sections={sections}
            gpsResults={gpsResults}
          />
        )}
      </AutoSizer>
    </div>
  );
}

export default style(App);
