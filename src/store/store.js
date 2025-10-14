import { create } from "zustand";
import { devtools } from "zustand/middleware";

// Non-serializable (not in zustand state) references:
let worker = null;
const requests = new Map();

// Helper to create worker
function createGPSWorker() {
  return new Worker(new URL("../gpsWorker.js", import.meta.url), {
    type: "module",
  });
}

// Zustand store
const useStore = create(
  devtools(
    (set, get) => ({
      // --- App State ---
      trackingMode: true,
      displaySlopes: false,
      sections: [],
      gpsData: [],
      stats: {
        distance: 0,
        elevationGain: 0,
        elevationLoss: 0,
        pointCount: 0,
      },
      slopes: [],
      cumulativeDistances: [],
      cumulativeElevations: [],
      cumulativeElevationLosses: [],
      currentPositionIndex: 0,

      // --- Worker State ---
      isWorkerReady: false,
      processing: false,
      progress: 0,
      progressMessage: "",

      // --- App Mutations ---
      toggleTrackingMode: () =>
        set((state) => ({ trackingMode: !state.trackingMode })),
      toggleSlopesMode: () =>
        set((state) => ({ displaySlopes: !state.displaySlopes })),
      setSections: (sections) => set({ sections }),
      setGpsData: (data) => set({ gpsData: data }),
      setStats: (stats) =>
        set((state) => ({
          stats: {
            distance: stats.distance ?? state.stats.distance,
            elevationGain: stats.elevationGain ?? state.stats.elevationGain,
            elevationLoss: stats.elevationLoss ?? state.stats.elevationLoss,
            pointCount: stats.pointCount ?? state.stats.pointCount,
          },
        })),
      setSlopes: (slopes) => set({ slopes }),
      setCumulativeDistances: (distances) =>
        set({ cumulativeDistances: distances }),
      setCumulativeElevations: (elevations) =>
        set({ cumulativeElevations: elevations }),
      setCumulativeElevationLosses: (elevations) =>
        set({ cumulativeElevationLosses: elevations }),
      setCurrentPositionIndex: (index) => set({ currentPositionIndex: index }),

      // --- Worker Lifecycle ---
      initGPSWorker: () => {
        if (worker) return;
        worker = createGPSWorker();

        worker.onmessage = (e) => {
          const {
            type,
            id,
            results,
            error,
            progress: progressValue,
            message,
          } = e.data;
          const request = requests.get(id);
          if (!request) return;

          switch (type) {
            case "PROGRESS":
              set({ progress: progressValue, progressMessage: message });
              request.onProgress?.(progressValue, message);
              break;
            case "GPS_DATA_PROCESSED":
            case "SECTIONS_PROCESSED":
            case "ROUTE_STATS_CALCULATED":
            case "POINTS_FOUND":
            case "ROUTE_SECTION_READY":
              requests.delete(id);
              set({ processing: false, progress: 100 });
              request.resolve(results ?? e.data);
              break;
            case "ERROR":
              requests.delete(id);
              set({ processing: false, progress: 0 });
              request.reject(new Error(error));
              break;
          }
        };

        worker.onerror = (error) => {
          console.error("GPS Worker error:", error);
          set({ isWorkerReady: false });
        };

        set({ isWorkerReady: true });
      },

      terminateGPSWorker: () => {
        if (worker) {
          worker.terminate();
          worker = null;
        }
        set({ isWorkerReady: false });
      },

      // --- Worker Communication ---
      sendWorkerMessage: (type, data, onProgress) => {
        return new Promise((resolve, reject) => {
          if (!worker || !get().isWorkerReady) {
            reject(new Error("Worker not ready"));
            return;
          }
          const id = Date.now() + Math.random();
          requests.set(id, { resolve, reject, onProgress });
          set({
            processing: true,
            progress: 0,
            progressMessage: "Starting...",
          });
          worker.postMessage({ type, data, id });
        });
      },

      // --- Worker APIs Exposed as Actions with state updates ---
      processGPSData: async (coordinates, onProgress) => {
        const results = await get().sendWorkerMessage(
          "PROCESS_GPS_DATA",
          { coordinates },
          onProgress,
        );
        set({
          gpsData: results.points,
          slopes: results.slopes,
          cumulativeDistances: results.cumulativeDistances,
          cumulativeElevations: results.cumulativeElevations,
          cumulativeElevationLosses: results.cumulativeElevationLosses,
          stats: {
            distance: results.totalDistance ?? 0,
            elevationGain: results.totalElevation ?? 0,
            elevationLoss: results.totalElevationLoss ?? 0,
            pointCount: results.pointCount ?? 0,
          },
        });
        return results;
      },

      processSections: async (coordinates, sections, onProgress) => {
        const results = await get().sendWorkerMessage(
          "PROCESS_SECTIONS",
          { coordinates, sections },
          onProgress,
        );

        set({
          sections: results ?? get().sections,
          stats: {
            distance: results.totalDistance ?? get().stats.distance,
            elevationGain:
              results.totalElevationGain ?? get().stats.elevationGain,
            elevationLoss:
              results.totalElevationLoss ?? get().stats.elevationLoss,
            pointCount: results.pointCount ?? get().stats.pointCount,
          },
        });
        return results;
      },

      calculateRouteStats: async (coordinates, segments) => {
        const results = await get().sendWorkerMessage("CALCULATE_ROUTE_STATS", {
          coordinates,
          segments,
        });
        set({
          stats: {
            distance: results.distance ?? get().stats.distance,
            elevationGain: results.elevationGain ?? get().stats.elevationGain,
            elevationLoss: results.elevationLoss ?? get().stats.elevationLoss,
            pointCount: results.pointCount ?? get().stats.pointCount,
          },
        });
        return results;
      },

      findPointsAtDistances: async (coordinates, distances) => {
        const results = await get().sendWorkerMessage(
          "FIND_POINTS_AT_DISTANCES",
          { coordinates, distances },
        );
        // Update your store if needed, e.g.:
        // set({ pointsAtDistances: results.points ?? get().pointsAtDistances });
        return results;
      },

      getRouteSection: async (coordinates, start, end) => {
        const results = await get().sendWorkerMessage("GET_ROUTE_SECTION", {
          coordinates,
          start,
          end,
        });
        // Optionally update store, e.g.:
        // set({ currentRouteSection: results.section ?? get().currentRouteSection });
        return results;
      },
    }),
    { name: "Terminus Store", enabled: true },
  ),
);

export default useStore;
