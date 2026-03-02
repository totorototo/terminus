import { useEffect } from "react";

import { useShallow } from "zustand/react/shallow";

import useStore from "../store/store.js";

export function useGPXWorker() {
  const {
    initGPXWorker,
    terminateGPXWorker,
    isWorkerReady,
    processGPXFile,
    raceId,
  } = useStore(
    useShallow((state) => ({
      initGPXWorker: state.initGPXWorker,
      terminateGPXWorker: state.terminateGPXWorker,
      isWorkerReady: state.worker.isReady,
      processGPXFile: state.processGPXFile,
      raceId: state.app.raceId,
    })),
  );

  useEffect(() => {
    initGPXWorker();
    return () => terminateGPXWorker();
  }, []);

  useEffect(() => {
    if (!isWorkerReady || !raceId) return;

    async function loadAndProcessGPX() {
      const response = await fetch(`/${raceId}.gpx`);
      if (!response.ok) throw new Error(`GPX not found: ${raceId}`);
      const gpxArrayBuffer = await response.arrayBuffer();
      await processGPXFile(gpxArrayBuffer);
    }

    loadAndProcessGPX();
  }, [isWorkerReady, raceId, processGPXFile]);

  return { isWorkerReady };
}
