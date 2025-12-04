import { useEffect } from "react";
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

function App({ className }) {
  const { initGPSWorker, terminateGPSWorker, isWorkerReady, processGPXFile } =
    useStore(
      useShallow((state) => ({
        initGPSWorker: state.initGPSWorker,
        terminateGPSWorker: state.terminateGPSWorker,
        isWorkerReady: state.worker.isReady,
        processGPSData: state.processGPSData,
        processSections: state.processSections,
        processGPXFile: state.processGPXFile,
      })),
    );

  useEffect(() => {
    initGPSWorker();

    return () => terminateGPSWorker();
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
