import { useEffect } from "react";
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
import { useShallow } from "zustand/react/shallow";

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
  const {
    initGPSWorker,
    terminateGPSWorker,
    isWorkerReady,
    processGPSData,
    processSections,
  } = useStore(
    useShallow((state) => ({
      initGPSWorker: state.initGPSWorker,
      terminateGPSWorker: state.terminateGPSWorker,
      isWorkerReady: state.worker.isReady,
      processGPSData: state.processGPSData,
      processSections: state.processSections,
    })),
  );

  useEffect(() => {
    initGPSWorker();

    return () => terminateGPSWorker();
  }, []);

  useEffect(() => {
    if (!isWorkerReady) return;

    async function processGPSThenSections() {
      const coordinates = gpx.features[0].geometry.coordinates;
      await processGPSData(coordinates, (progress, message) => {
        // optional
      });

      if (csv.length) {
        const computedSections = computeSectionsFromCheckpoints(csv);
        await processSections(
          coordinates,
          computedSections,
          (progress, message) => {
            // optional
          },
        );
      }
    }

    processGPSThenSections();
  }, [isWorkerReady]);

  return (
    <div className={className}>
      <AutoSizer>
        {({ width, height }) => <Scene width={width} height={height} />}
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
