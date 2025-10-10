import { useEffect, useState } from "react";
import { useGPSWorker } from "./useGPSWorker.js";
import gpx from "./assets/vvx-xgtv-2026.gpx";
import csv from "./assets/vvx-xgtv-2026.csv";
import AutoSizer from "react-virtualized-auto-sizer";
import Scene from "./components/scene/Scene.jsx";
import style from "./App.style.js";
import useStore from "./store/store.js";
import TrailData from "./components/trailData/TrailData.jsx";
import BottomSheetPanel from "./components/bottomSheetPanel/BottomSheetPanel.jsx";
import TopSheetPanel from "./components/topSheetPanel/TopSheetPanel.jsx";
import Navigation from "./components/navigation/Navigation.jsx";
import Commands from "./components/commands/Commands.jsx";

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
  const [error, setError] = useState(null);

  const setGpsData = useStore((state) => state.setGpsData);
  const gpsData = useStore((state) => state.gpsData);
  const setSections = useStore((state) => state.setSections);
  const setSlopes = useStore((state) => state.setSlopes);
  const setStats = useStore((state) => state.setStats);
  const setCumulativeDistances = useStore(
    (state) => state.setCumulativeDistances,
  );
  const setCumulativeElevations = useStore(
    (state) => state.setCumulativeElevations,
  );
  const setCumulativeElevationLosses = useStore(
    (state) => state.setCumulativeElevationLosses,
  );

  const {
    isWorkerReady,
    processing,
    progress,
    progressMessage,
    processSections,
    processGPSData,
  } = useGPSWorker();

  useEffect(() => {
    if (isWorkerReady && gpx.features?.[0]?.geometry?.coordinates) {
      handleProcessGPS();
    }
  }, [isWorkerReady]);

  useEffect(() => {
    if (csv.length) {
      const computedSections = computeSectionsFromCheckpoints(csv);
      handleProcessSections(computedSections);
    }
  }, [gpsData]);

  const handleProcessGPS = async () => {
    try {
      setError(null);

      const coordinates = gpx.features[0].geometry.coordinates;
      const results = await processGPSData(coordinates, (progress, message) => {
        // Optionally handle progress
      });
      setGpsData(results.points);
      setSlopes(results.slopes);
      setCumulativeDistances(results.cumulativeDistances);
      setCumulativeElevations(results.cumulativeElevations);
      setCumulativeElevationLosses(results.cumulativeElevationLosses);
      setStats({
        distance: results.totalDistance || 0,
        elevationGain: results.totalElevation || 0,
        elevationLoss: results.totalElevationLoss || 0,
        pointCount: results.pointCount || 0,
      });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleProcessSections = async (sections) => {
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
      setError(err.message);
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
          />
        )}
      </AutoSizer>
      <TopSheetPanel>
        <Navigation />
      </TopSheetPanel>
      <BottomSheetPanel>
        <TrailData />
      </BottomSheetPanel>
      <Commands />
    </div>
  );
}

export default style(App);
