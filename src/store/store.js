import { create } from "zustand";
import { devtools, subscribeWithSelector, persist } from "zustand/middleware";
import { createAppSlice } from "./slices/appSlice";
import { createGpsSlice } from "./slices/gpsSlice";
import { createStatsSlice } from "./slices/statsSlice";
import { createWorkerSlice } from "./slices/workerSlice";

// Create store by combining slices
const useStore = create(
  devtools(
    persist(
      subscribeWithSelector((...a) => ({
        ...createAppSlice(...a),
        ...createGpsSlice(...a),
        ...createStatsSlice(...a),
        ...createWorkerSlice(...a),
      })),
      {
        name: "terminus-storage",
        partialize: (state) => ({
          app: {
            trackingMode: state.app.trackingMode,
            displaySlopes: state.app.displaySlopes,
            profileMode: state.app.profileMode,
            currentLocation: state.app.currentLocation,
            currentClosestLocation: state.app.currentClosestLocation,
            startingDate: state.app.startingDate,
            locations: state.app.locations,
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
export const useGpsData = () => useStore((state) => state.gps);
export const useStats = () => useStore((state) => state.stats);
export const useWorkerState = () => useStore((state) => state.worker);

// Specific selectors for common use cases
export const useTrackingMode = () =>
  useStore((state) => state.app.trackingMode);
export const useDisplaySlopes = () =>
  useStore((state) => state.app.displaySlopes);
export const useCurrentPosition = () =>
  useStore((state) => state.app.currentPositionIndex);
export const useCurrentClosestLocation = () =>
  useStore((state) => state.app.currentClosestLocation);
export const useCurrentClosestLocationIndex = () =>
  useStore((state) => state.app.currentClosestLocationIndex);
export const useGpsCoordinates = () => useStore((state) => state.gps.data);
export const useProcessingState = () =>
  useStore((state) => ({
    isProcessing: state.worker.processing,
    progress: state.worker.progress,
    message: state.worker.progressMessage,
    error: state.worker.errorMessage,
  }));

export default useStore;
