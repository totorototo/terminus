import { create } from "zustand";
import { devtools, subscribeWithSelector, persist } from "zustand/middleware";
import { createAppSlice } from "./slices/app";
import { createGpxSlice } from "./slices/gpx";
import { createStatsSlice } from "./slices/stats";
import { createWorkerSlice } from "./slices/worker";
import { createWayPointsSlice } from "./slices/wayPoints";
import { createSectionsSlice } from "./slices/sections";
import { createGPSSlice } from "./slices/gps";

const useStore = create(
  devtools(
    persist(
      subscribeWithSelector((...a) => ({
        ...createAppSlice(...a),
        ...createGpxSlice(...a),
        ...createStatsSlice(...a),
        ...createWorkerSlice(...a),
        ...createWayPointsSlice(...a),
        ...createSectionsSlice(...a),
        ...createGPSSlice(...a),
      })),
      {
        name: "terminus-storage",
        partialize: (state) => ({
          app: {
            trackingMode: state.app.trackingMode,
            displaySlopes: state.app.displaySlopes,
            profileMode: state.app.profileMode,
          },
          gps: {
            location: state.gps.location,
            projectedLocation: state.gps.projectedLocation,
            savedLocations: state.gps.savedLocations,
          },
        }),
        onRehydrateStorage: () => (state) => {
          // Initialize location buffer from persisted locations after rehydration
          if (state?.initLocationBuffer) {
            state.initLocationBuffer();
          }
        },
      },
    ),
    {
      name: "Terminus Store",
      enabled: process.env.NODE_ENV === "development",
      actionsDenylist: ["setCurrentPositionIndex"],
    },
  ),
);

// --- Selector Hooks for Performance ---
// These hooks prevent unnecessary re-renders by selecting only specific slices
export const useAppState = () => useStore((state) => state.app);
export const useGpxData = () => useStore((state) => state.gpx);
export const useStats = () => useStore((state) => state.stats);
export const useWorkerState = () => useStore((state) => state.worker);

// Specific selectors for common use cases
export const useTrackingMode = () =>
  useStore((state) => state.app.trackingMode);
export const useDisplaySlopes = () =>
  useStore((state) => state.app.displaySlopes);
export const useProjectedLocation = () =>
  useStore((state) => state.gps.projectedLocation);
export const useGpxCoordinates = () => useStore((state) => state.gpx.data);
export const useProcessingState = () =>
  useStore((state) => ({
    isProcessing: state.worker.processing,
    progress: state.worker.progress,
    message: state.worker.progressMessage,
    error: state.worker.errorMessage,
  }));

export default useStore;
