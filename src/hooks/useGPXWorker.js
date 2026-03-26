import { useEffect, useRef } from "react";

import { useShallow } from "zustand/react/shallow";

import useStore from "../store/store.js";

export function useGPXWorker(raceId) {
  const prevRaceIdRef = useRef(null);
  const {
    initGPXWorker,
    terminateGPXWorker,
    isWorkerReady,
    processGPXFile,
    setSections,
    flush,
  } = useStore(
    useShallow((state) => ({
      initGPXWorker: state.initGPXWorker,
      terminateGPXWorker: state.terminateGPXWorker,
      isWorkerReady: state.worker.isReady,
      processGPXFile: state.processGPXFile,
      setSections: state.setSections,
      flush: state.flush,
    })),
  );

  useEffect(() => {
    initGPXWorker();
    return () => terminateGPXWorker();
  }, [initGPXWorker, terminateGPXWorker]);

  useEffect(() => {
    if (!isWorkerReady || !raceId) return;

    // Clear sections immediately so all Profile components unmount before new
    // race data arrives — ensures all sections remount simultaneously as fresh
    // components, avoiding shader/material initialization issues.
    setSections([]);
    // Only flush GPS state on trail switch, not on initial load, so that
    // rehydrated GPS positions are preserved across page reloads.
    if (prevRaceIdRef.current !== null && prevRaceIdRef.current !== raceId) {
      flush();
    }
    prevRaceIdRef.current = raceId;

    const controller = new AbortController();

    async function loadAndProcessGPX() {
      if (!/^[a-zA-Z0-9_-]+$/.test(raceId) || raceId.length > 64)
        throw new Error(`Invalid race ID: ${raceId}`);
      const response = await fetch(`/${raceId}.gpx`, {
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`GPX not found: ${raceId}`);
      const gpxArrayBuffer = await response.arrayBuffer();
      if (gpxArrayBuffer.byteLength > 50 * 1024 * 1024)
        throw new Error("GPX file too large");
      if (controller.signal.aborted) return;
      await processGPXFile(gpxArrayBuffer);
    }

    loadAndProcessGPX().catch((err) => {
      if (err.name !== "AbortError") console.error("GPX load failed:", err);
    });

    return () => controller.abort();
  }, [isWorkerReady, raceId, processGPXFile, setSections, flush]);

  return { isWorkerReady };
}
