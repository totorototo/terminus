import { useEffect, lazy, Suspense } from "react";
import AutoSizer from "react-virtualized-auto-sizer";
import style from "./Trailer.style";
import useStore from "../../store/store.js";
import LoadingSpinner from "../loadingSpinner/LoadingSpinner.jsx";
import TopSheetPanel from "../topSheetPanel/TopSheetPanel.jsx";
import Navigation from "../navigation/Navigation.jsx";
import BottomSheetPanel from "../bottomSheetPanel/BottomSheetPanel.jsx";
import TrailData from "../trailData/TrailData.jsx";
import Commands from "../commands/Commands.jsx";
import { useShallow } from "zustand/react/shallow";

// Lazy load 3D Scene (imports Three.js, React Three Fiber, Drei)
const Scene = lazy(() => import("../scene/Scene.jsx"));

function Trailer({ className }) {
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
        <Suspense fallback={<LoadingSpinner />}>
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

export default style(Trailer);
