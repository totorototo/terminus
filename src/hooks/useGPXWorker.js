import { useEffect } from "react";

import { useShallow } from "zustand/react/shallow";

import useStore from "../store/store.js";

export function useGPXWorker(raceId) {
  const { initGPXWorker, terminateGPXWorker, isWorkerReady, processGPXFile } =
    useStore(
      useShallow((state) => ({
        initGPXWorker: state.initGPXWorker,
        terminateGPXWorker: state.terminateGPXWorker,
        isWorkerReady: state.worker.isReady,
        processGPXFile: state.processGPXFile,
      })),
    );

  useEffect(() => {
    initGPXWorker();
    return () => terminateGPXWorker();
  }, []);

  useEffect(() => {
    if (!isWorkerReady || !raceId) return;

    const controller = new AbortController();

    async function loadAndProcessGPX() {
      const response = await fetch(`/${raceId}.gpx`, {
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`GPX not found: ${raceId}`);
      const gpxArrayBuffer = await response.arrayBuffer();
      if (controller.signal.aborted) return;
      await processGPXFile(gpxArrayBuffer);
    }

    loadAndProcessGPX().catch((err) => {
      if (err.name !== "AbortError") console.error(err);
    });

    return () => controller.abort();
  }, [isWorkerReady, raceId, processGPXFile]);

  return { isWorkerReady };
}
