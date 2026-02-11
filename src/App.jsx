import { useEffect, lazy, Suspense } from "react";
import AutoSizer from "react-virtualized-auto-sizer";
import style from "./App.style.js";
import useStore from "./store/store.js";
import TrailData from "./components/trailData/TrailData.jsx";
import BottomSheetPanel from "./components/bottomSheetPanel/BottomSheetPanel.jsx";
import TopSheetPanel from "./components/topSheetPanel/TopSheetPanel.jsx";
import Navigation from "./components/navigation/Navigation.jsx";
import Commands from "./components/commands/Commands.jsx";
import { useShallow } from "zustand/react/shallow";

// Lazy load 3D Scene (imports Three.js, React Three Fiber, Drei)
const Scene = lazy(() => import("./components/scene/Scene.jsx"));

function App({ className }) {
  const { initGPXWorker, terminateGPXWorker, isWorkerReady, processGPXFile } =
    useStore(
      useShallow((state) => ({
        initGPXWorker: state.initGPXWorker,
        terminateGPXWorker: state.terminateGPXWorker,
        isWorkerReady: state.worker.isReady,
        processGPSData: state.processGPSData,
        processSections: state.processSections,
        processGPXFile: state.processGPXFile,
      })),
    );

  useEffect(() => {
    initGPXWorker();

    return () => terminateGPXWorker();
  }, []);

  useEffect(() => {
    if (!isWorkerReady) return;

    async function loadAndProcessGPX() {
      const response = await fetch("/vvx-xgtv-2026.gpx");
      const gpxArrayBuffer = await response.arrayBuffer();
      await processGPXFile(gpxArrayBuffer);
    }

    loadAndProcessGPX();
  }, [isWorkerReady, processGPXFile]);

  return (
    isWorkerReady && (
      <div className={className}>
        <Suspense fallback={<div style={{ width: "100%", height: "100%" }} />}>
          <AutoSizer>
            {({ width, height }) => <Scene width={width} height={height} />}
          </AutoSizer>
        </Suspense>
        <TopSheetPanel>
          <Navigation />
        </TopSheetPanel>
        <BottomSheetPanel>
          <TrailData />
        </BottomSheetPanel>
        <Commands />
      </div>
    )
  );
}

export default style(App);
