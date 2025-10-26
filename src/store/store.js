import { create } from "zustand";
import { devtools, subscribeWithSelector, persist } from "zustand/middleware";

// Non-serializable references outside store state:
let worker = null;
const requests = new Map();

// Helper to create worker
function createGPSWorker() {
  return new Worker(new URL("../gpsWorker.js", import.meta.url), {
    type: "module",
  });
}

// Create store
const useStore = create(
  subscribeWithSelector(
    persist(
      devtools(
        (set, get) => ({
          // --- App State ---
          app: {
            trackingMode: false,
            displaySlopes: false,
            currentPositionIndex: { index: 0, date: 0 },
            currentLocation: null,
            currentClosestLocation: null,
            startingDate: 0, //Unix timestampjs
          },

          // --- GPS Data ---
          gps: {
            data: [],
            slopes: [],
            sections: [],
            cumulativeDistances: [],
            cumulativeElevations: [],
            cumulativeElevationLosses: [],
          },

          // --- Statistics ---
          stats: {
            distance: 0,
            elevationGain: 0,
            elevationLoss: 0,
            pointCount: 0,
          },

          // --- Worker State ---
          worker: {
            isReady: false,
            processing: false,
            progress: 0,
            progressMessage: "",
            errorMessage: "",
          },

          // --- App Actions ---
          getCurrentLocation: async () => {
            set((state) => ({
              ...state,
              app: {
                ...state.app,
                loading: true,
              },
            }));
            try {
              //TODO: get unix timestamp as well
              const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject);
              });

              const coords = [
                position.coords.longitude,
                position.coords.latitude,
                0,
              ];

              const date = position.timestamp;

              // Update Zustand state
              set((state) => ({
                ...state,
                app: {
                  ...state.app,
                  currentLocation: { coords, date },
                  loading: false,
                },
              }));
            } catch (error) {
              set((state) => ({
                ...state,
                app: {
                  ...state.app,
                  error: error.message,
                  loading: false,
                },
              }));
            }
          },

          toggleTrackingMode: () =>
            set((state) => ({
              ...state,
              app: {
                ...state.app,
                trackingMode: !state.app.trackingMode,
              },
            })),

          toggleSlopesMode: () =>
            set((state) => ({
              ...state,
              app: {
                ...state.app,
                displaySlopes: !state.app.displaySlopes,
              },
            })),

          setCurrentPositionIndex: (value) =>
            set((state) => ({
              ...state,
              app: {
                ...state.app,
                currentPositionIndex: value,
              },
            })),

          setStartingDate: (date) => {
            set((state) => ({
              ...state,
              app: {
                ...state.app,
                startingDate: date,
              },
            }));
          },

          // --- GPS Data Actions ---
          setGpsData: (data) =>
            set((state) => ({
              ...state,
              gps: {
                ...state.gps,
                data,
              },
            })),

          setSlopes: (slopes) =>
            set((state) => ({
              ...state,
              gps: {
                ...state.gps,
                slopes,
              },
            })),

          setSections: (sections) =>
            set((state) => ({
              ...state,
              gps: {
                ...state.gps,
                sections,
              },
            })),

          setCumulativeDistances: (distances) =>
            set((state) => ({
              ...state,
              gps: {
                ...state.gps,
                cumulativeDistances: distances,
              },
            })),

          setCumulativeElevations: (elevations) =>
            set((state) => ({
              ...state,
              gps: {
                ...state.gps,
                cumulativeElevations: elevations,
              },
            })),

          setCumulativeElevationLosses: (elevations) =>
            set((state) => ({
              ...state,
              gps: {
                ...state.gps,
                cumulativeElevationLosses: elevations,
              },
            })),

          // --- Stats Actions ---
          setStats: (newStats) =>
            set((state) => ({
              ...state,
              stats: {
                ...state.stats,
                ...newStats,
              },
            })),

          updateStats: (partialStats) =>
            set((state) => {
              const updatedStats = { ...state.stats };
              Object.entries(partialStats).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                  updatedStats[key] = value;
                }
              });
              return {
                ...state,
                stats: updatedStats,
              };
            }),

          // --- Worker Actions ---
          setWorkerState: (partialState) =>
            set((state) => ({
              ...state,
              worker: {
                ...state.worker,
                ...partialState,
              },
            })),

          clearError: () =>
            set((state) => ({
              ...state,
              worker: {
                ...state.worker,
                errorMessage: "",
              },
            })),

          // --- Worker Lifecycle ---
          initGPSWorker: () => {
            if (worker) return;

            try {
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
                    set((state) => ({
                      ...state,
                      worker: {
                        ...state.worker,
                        progress: progressValue,
                        progressMessage: message,
                      },
                    }));
                    request.onProgress?.(progressValue, message);
                    break;

                  case "GPS_DATA_PROCESSED":
                  case "SECTIONS_PROCESSED":
                  case "ROUTE_STATS_CALCULATED":
                  case "POINTS_FOUND":
                  case "ROUTE_SECTION_READY":
                  case "CLOSEST_POINT_FOUND":
                    requests.delete(id);
                    set((state) => ({
                      ...state,
                      worker: {
                        ...state.worker,
                        processing: false,
                        progress: 100,
                        errorMessage: "",
                      },
                    }));
                    request.resolve(results ?? e.data);
                    break;

                  case "ERROR":
                    requests.delete(id);
                    set((state) => ({
                      ...state,
                      worker: {
                        ...state.worker,
                        processing: false,
                        progress: 0,
                        errorMessage: error ?? "Unknown worker error",
                      },
                    }));
                    request.reject(new Error(error));
                    break;
                }
              };

              worker.onerror = (error) => {
                console.error("GPS Worker error:", error);
                set((state) => ({
                  ...state,
                  worker: {
                    ...state.worker,
                    isReady: false,
                    errorMessage: "Worker initialization failed",
                  },
                }));
              };

              set((state) => ({
                ...state,
                worker: {
                  ...state.worker,
                  isReady: true,
                  errorMessage: "",
                },
              }));
            } catch (error) {
              console.error("Failed to create GPS Worker:", error);
              set((state) => ({
                ...state,
                worker: {
                  ...state.worker,
                  errorMessage: "Failed to initialize worker",
                },
              }));
            }
          },

          terminateGPSWorker: () => {
            if (worker) {
              worker.terminate();
              worker = null;
            }
            requests.clear();
            set((state) => ({
              ...state,
              worker: {
                ...state.worker,
                isReady: false,
                processing: false,
                progress: 0,
                progressMessage: "",
              },
            }));
          },

          // --- Worker Communication ---
          sendWorkerMessage: (type, data, onProgress) => {
            return new Promise((resolve, reject) => {
              const state = get();
              if (!worker || !state.worker.isReady) {
                reject(new Error("Worker not ready"));
                return;
              }

              const id = Date.now() + Math.random();
              requests.set(id, { resolve, reject, onProgress });

              set((state) => ({
                ...state,
                worker: {
                  ...state.worker,
                  processing: true,
                  progress: 0,
                  progressMessage: "Starting...",
                  errorMessage: "",
                },
              }));

              worker.postMessage({ type, data, id });
            });
          },

          // --- Worker API Actions ---
          processGPSData: async (coordinates, onProgress) => {
            try {
              const results = await get().sendWorkerMessage(
                "PROCESS_GPS_DATA",
                { coordinates },
                onProgress,
              );

              set((state) => ({
                ...state,
                gps: {
                  ...state.gps,
                  data: results.points,
                  slopes: results.slopes,
                  cumulativeDistances: results.cumulativeDistances,
                  cumulativeElevations: results.cumulativeElevations,
                  cumulativeElevationLosses: results.cumulativeElevationLoss,
                },
                stats: {
                  distance: results.totalDistance ?? 0,
                  elevationGain: results.totalElevation ?? 0,
                  elevationLoss: results.totalElevationLoss ?? 0,
                  pointCount: results.pointCount ?? 0,
                },
                worker: {
                  ...state.worker,
                  errorMessage: "",
                },
              }));

              return results;
            } catch (error) {
              set((state) => ({
                ...state,
                worker: {
                  ...state.worker,
                  processing: false,
                  progress: 0,
                  errorMessage: error.message || "Failed to process GPS Data",
                },
              }));
              throw error;
            }
          },

          processSections: async (coordinates, sections, onProgress) => {
            try {
              const results = await get().sendWorkerMessage(
                "PROCESS_SECTIONS",
                { coordinates, sections },
                onProgress,
              );

              set((state) => ({
                ...state,
                gps: {
                  ...state.gps,
                  sections: results ?? state.gps.sections,
                },
                stats: {
                  ...state.stats,
                  ...(results?.totalDistance !== undefined && {
                    distance: results.totalDistance,
                  }),
                  ...(results?.totalElevationGain !== undefined && {
                    elevationGain: results.totalElevationGain,
                  }),
                  ...(results?.totalElevationLoss !== undefined && {
                    elevationLoss: results.totalElevationLoss,
                  }),
                  ...(results?.pointCount !== undefined && {
                    pointCount: results.pointCount,
                  }),
                },
                worker: {
                  ...state.worker,
                  errorMessage: "",
                },
              }));

              return results;
            } catch (error) {
              set((state) => ({
                ...state,
                worker: {
                  ...state.worker,
                  processing: false,
                  progress: 0,
                  errorMessage: error.message || "Failed to process Sections",
                },
              }));
              throw error;
            }
          },

          calculateRouteStats: async (coordinates, segments) => {
            try {
              const results = await get().sendWorkerMessage(
                "CALCULATE_ROUTE_STATS",
                { coordinates, segments },
              );

              set((state) => ({
                ...state,
                stats: {
                  ...state.stats,
                  ...(results?.distance !== undefined && {
                    distance: results.distance,
                  }),
                  ...(results?.elevationGain !== undefined && {
                    elevationGain: results.elevationGain,
                  }),
                  ...(results?.elevationLoss !== undefined && {
                    elevationLoss: results.elevationLoss,
                  }),
                  ...(results?.pointCount !== undefined && {
                    pointCount: results.pointCount,
                  }),
                },
                worker: {
                  ...state.worker,
                  errorMessage: "",
                },
              }));

              return results;
            } catch (error) {
              set((state) => ({
                ...state,
                worker: {
                  ...state.worker,
                  processing: false,
                  progress: 0,
                  errorMessage:
                    error.message || "Failed to calculate Route Stats",
                },
              }));
              throw error;
            }
          },

          findPointsAtDistances: async (coordinates, distances) => {
            try {
              const results = await get().sendWorkerMessage(
                "FIND_POINTS_AT_DISTANCES",
                { coordinates, distances },
              );

              set((state) => ({
                ...state,
                worker: {
                  ...state.worker,
                  errorMessage: "",
                },
              }));

              return results;
            } catch (error) {
              set((state) => ({
                ...state,
                worker: {
                  ...state.worker,
                  processing: false,
                  progress: 0,
                  errorMessage:
                    error.message || "Failed to find points at distances",
                },
              }));
              throw error;
            }
          },

          getRouteSection: async (coordinates, start, end) => {
            try {
              const results = await get().sendWorkerMessage(
                "GET_ROUTE_SECTION",
                {
                  coordinates,
                  start,
                  end,
                },
              );

              set((state) => ({
                ...state,
                worker: {
                  ...state.worker,
                  errorMessage: "",
                },
              }));

              return results;
            } catch (error) {
              set((state) => ({
                ...state,
                worker: {
                  ...state.worker,
                  processing: false,
                  progress: 0,
                  errorMessage: error.message || "Failed to get route section",
                },
              }));
              throw error;
            }
          },

          findClosestLocation: async () => {
            try {
              // get current location first (using store action)
              // and gps data
              await get().getCurrentLocation();
              const point = get().app.currentLocation.coords;
              const coordinates = get().gps.data;

              // safety check
              if (!point || !coordinates || coordinates.length === 0) {
                // set error in state
                set((state) => ({
                  ...state,
                  worker: {
                    ...state.worker,
                    processing: false,
                    progress: 0,
                    errorMessage: "No location or GPS data available",
                  },
                }));
                // and return null
                return null;
              }

              const results = await get().sendWorkerMessage(
                "FIND_CLOSEST_LOCATION",
                {
                  coordinates,
                  target: point,
                },
              );

              // update closest location in app state
              if (results && results.closestLocation) {
                const closestCoord = results.closestLocation;

                set((state) => ({
                  ...state,
                  app: {
                    ...state.app,
                    currentClosestLocation: closestCoord,
                  },
                }));
              }

              return results;
            } catch (error) {
              set((state) => ({
                ...state,
                worker: {
                  ...state.worker,
                  processing: false,
                  progress: 0,
                  errorMessage: error.message || "Failed to find closest point",
                },
              }));
              throw error;
            }
          },

          // --- Computed Selectors ---
          getStartingDate: () => get.app.startingDate,
          getTrackingMode: () => get().app.trackingMode,
          getDisplaySlopes: () => get().app.displaySlopes,
          getCurrentPositionIndex: () => get().app.currentPositionIndex,
          getGpsData: () => get().gps.data,
          getSlopes: () => get().gps.slopes,
          getSections: () => get().gps.sections,
          getStats: () => get().stats,
          getWorkerStatus: () => get().worker,
          getIsProcessing: () => get().worker.processing,
          getHasError: () => Boolean(get().worker.errorMessage),
        }),
        {
          name: "Terminus Store",
          enabled: process.env.NODE_ENV === "development",
        },
      ),
      {
        name: "terminus-storage",
        partialize: (state) => ({
          app: {
            trackingMode: state.app.trackingMode,
            displaySlopes: state.app.displaySlopes,
            currentLocation: state.app.currentLocation,
            currentClosestLocation: state.app.currentClosestLocation,
            startingDate: state.app.startingDate,
          },
        }),
      },
    ),
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
export const useGpsCoordinates = () => useStore((state) => state.gps.data);
export const useProcessingState = () =>
  useStore((state) => ({
    isProcessing: state.worker.processing,
    progress: state.worker.progress,
    message: state.worker.progressMessage,
    error: state.worker.errorMessage,
  }));

export default useStore;
