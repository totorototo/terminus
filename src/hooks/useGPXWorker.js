import { useEffect, useState } from "react";

import { useShallow } from "zustand/react/shallow";

import { loadLocalGpx } from "../lib/localGpx.js";
import useStore from "../store/store.js";

// Starts the worker and feeds it a GPX: by default the one opened from the
// wizard, or whatever `loadGpx` resolves to (a followed race). `missing` turns
// true when there is none (cleared site data, /run opened directly, a shared
// route that expired), so the screen can send the user back to the wizard.
// `loadGpx` must be stable across renders: a new function reloads the route.
export function useGPXWorker(loadGpx = loadLocalGpx) {
  const [missing, setMissing] = useState(false);
  const {
    initGPXWorker,
    terminateGPXWorker,
    isWorkerReady,
    processGPXFile,
    setSections,
    setLegs,
  } = useStore(
    useShallow((state) => ({
      initGPXWorker: state.initGPXWorker,
      terminateGPXWorker: state.terminateGPXWorker,
      isWorkerReady: state.worker.isReady,
      processGPXFile: state.processGPXFile,
      setSections: state.setSections,
      setLegs: state.setLegs,
    })),
  );

  useEffect(() => {
    initGPXWorker();
    return () => terminateGPXWorker();
  }, [initGPXWorker, terminateGPXWorker]);

  useEffect(() => {
    if (!isWorkerReady) return;

    // Clear legs and sections immediately so EnhancedProfile renders nothing
    // until the route's own legs arrive.
    setSections([]);
    setLegs([]);

    let cancelled = false;

    async function loadAndProcessGPX() {
      const stored = await loadGpx();
      if (cancelled) return;
      if (!stored) {
        setMissing(true);
        return;
      }
      // The worker parses the GPX in Zig and returns the full-resolution route
      // coordinates, so the map renders the original trackpoints without the
      // store ever holding the raw XML or re-parsing it on the main thread.
      await processGPXFile(stored.bytes, { fileName: stored.name });
    }

    loadAndProcessGPX().catch((err) => console.error("GPX load failed:", err));

    return () => {
      cancelled = true;
    };
  }, [isWorkerReady, loadGpx, processGPXFile, setSections, setLegs]);

  return { isWorkerReady, missing };
}
