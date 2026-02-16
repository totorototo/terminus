import {
  validateGPXResults,
  validateGPSDataResults,
  validateSectionsResults,
  validateRouteStatsResults,
  validatePointsAtDistancesResults,
  validateRouteSectionResults,
} from "./workerValidation.js";
import { createWorkerMessenger } from "./workerMessenger.js";

// Default worker factory (can be overridden for testing)
function createGPSWorker() {
  return new Worker(new URL("../../gpxWorker.js", import.meta.url), {
    type: "module",
  });
}

// Error messages for consistent user feedback and i18n support
const ERROR_MESSAGES = {
  GPX_FILE: "Failed to process GPX File",
  GPS_DATA: "Failed to process GPS Data",
  SECTIONS: "Failed to process Sections",
  ROUTE_STATS: "Failed to calculate Route Stats",
  POINTS_AT_DISTANCES: "Failed to find points at distances",
  ROUTE_SECTION: "Failed to get route section",
  CLOSEST_LOCATION: "Failed to find closest point",
  NOT_INITIALIZED: "Worker not initialized",
  NO_LOCATION: "No location or GPS data available",
};

export const createWorkerSlice = (set, get, workerFactory) => {
  // Handle case where Zustand middleware passes store API as 3rd parameter
  // When used with slices, workerFactory may be undefined or the store API object
  // In tests, workerFactory will be a function passed explicitly
  const factory =
    typeof workerFactory === "function" ? workerFactory : createGPSWorker;

  // Closure-local state (fresh for each store instance, no cross-test contamination)
  let worker = null;
  let messenger = null;

  // Helper: Update worker state on successful operation
  const updateWorkerSuccess = () =>
    set(
      (state) => ({
        ...state,
        worker: {
          ...state.worker,
          errorMessage: "",
        },
      }),
      undefined,
      "worker/updateWorkerSuccess",
    );

  // Helper: Handle worker operation errors and update state
  const handleWorkerError = (error, defaultMessage) => {
    set(
      (state) => ({
        ...state,
        worker: {
          ...state.worker,
          processing: false,
          progress: 0,
          errorMessage: error.message || defaultMessage,
        },
      }),
      undefined,
      "worker/setWorkerError",
    );
    throw error;
  };

  return {
    worker: {
      isReady: false,
      processing: false,
      progress: 0,
      progressMessage: "",
      errorMessage: "",
    },

    setWorkerState: (partialState) =>
      set(
        (state) => ({
          ...state,
          worker: {
            ...state.worker,
            ...partialState,
          },
        }),
        undefined,
        "worker/setWorkerState",
      ),

    clearError: () =>
      set(
        (state) => ({
          ...state,
          worker: {
            ...state.worker,
            errorMessage: "",
          },
        }),
        undefined,
        "worker/clearError",
      ),

    initGPXWorker: () => {
      if (worker) return;

      try {
        worker = factory();

        // Create messenger with state update callbacks
        messenger = createWorkerMessenger(worker, {
          onProgress: (progressValue, message) => {
            set(
              (state) => ({
                ...state,
                worker: {
                  ...state.worker,
                  progress: progressValue,
                  progressMessage: message,
                },
              }),
              undefined,
              "worker/setWorkerProgress",
            );
          },
          onComplete: () => {
            set(
              (state) => ({
                ...state,
                worker: {
                  ...state.worker,
                  processing: false,
                  progress: 100,
                  errorMessage: "",
                },
              }),
              undefined,
              "worker/setWorkerComplete",
            );
          },
          onError: (error) => {
            set(
              (state) => ({
                ...state,
                worker: {
                  ...state.worker,
                  processing: false,
                  progress: 0,
                  errorMessage: error,
                },
              }),
              undefined,
              "worker/setWorkerError",
            );
          },
          onTimeout: (errorMsg) => {
            set(
              (state) => ({
                ...state,
                worker: {
                  ...state.worker,
                  processing: false,
                  progress: 0,
                  errorMessage: errorMsg,
                },
              }),
              undefined,
              "worker/setWorkerTimeout",
            );
          },
          onProcessingStart: () => {
            set(
              (state) => ({
                ...state,
                worker: {
                  ...state.worker,
                  processing: true,
                  progress: 0,
                  progressMessage: "Starting...",
                  errorMessage: "",
                },
              }),
              undefined,
              "worker/sendWorkerMessage",
            );
          },
        });

        worker.onmessage = (e) => messenger.handleMessage(e);

        worker.onerror = (error) => {
          set(
            (state) => ({
              ...state,
              worker: {
                ...state.worker,
                isReady: false,
                errorMessage: "Worker initialization failed",
              },
            }),
            undefined,
            "worker/setWorkerError",
          );
        };

        set(
          (state) => ({
            ...state,
            worker: {
              ...state.worker,
              isReady: true,
              errorMessage: "",
            },
          }),
          undefined,
          "worker/setWorkerReady",
        );
      } catch (error) {
        set(
          (state) => ({
            ...state,
            worker: {
              ...state.worker,
              errorMessage: "Failed to initialize worker",
            },
          }),
          undefined,
          "worker/setWorkerError",
        );
      }
    },

    terminateGPXWorker: () => {
      if (worker) {
        worker.terminate();
        worker = null;
      }

      // Reject all pending requests to prevent hanging promises
      if (messenger) {
        messenger.cleanup(new Error("Worker was terminated"));
        messenger = null;
      }

      set(
        (state) => ({
          ...state,
          worker: {
            ...state.worker,
            isReady: false,
            processing: false,
            progress: 0,
            progressMessage: "",
            errorMessage: "",
          },
        }),
        undefined,
        "worker/setWorkerState",
      );
    },

    processGPXFile: async (gpxBytes, onProgress) => {
      try {
        if (!messenger) {
          throw new Error(ERROR_MESSAGES.NOT_INITIALIZED);
        }

        const results = await messenger.send(
          "PROCESS_GPX_FILE",
          { gpxBytes },
          onProgress,
        );

        // Validate worker results before setting state
        validateGPXResults(results);

        set(
          (state) => ({
            stats: {
              ...state.stats,
              distance: results.trace.totalDistance ?? 0,
              elevationGain: results.trace.totalElevation ?? 0,
              elevationLoss: results.trace.totalElevationLoss ?? 0,
              pointCount: results.trace.points.length ?? 0,
            },
            gpx: {
              ...state.gpx,
              metadata: { ...state.gpx.metadata, ...results.metadata },
              peaks: results.trace.peaks,
              data: results.trace.points,
              slopes: results.trace.slopes,
              cumulativeDistances: results.trace.cumulativeDistances,
              cumulativeElevations: results.trace.cumulativeElevations,
              cumulativeElevationLosses: results.trace.cumulativeElevationLoss,
            },
            sections: results.sections,
            waypoints: results.waypoints,
            worker: { ...state.worker, errorMessage: "" },
          }),
          undefined,
          "worker/processGPXFile",
        );

        return results;
      } catch (error) {
        handleWorkerError(error, ERROR_MESSAGES.GPX_FILE);
      }
    },

    processGPSData: async (coordinates, onProgress) => {
      try {
        if (!messenger) {
          throw new Error(ERROR_MESSAGES.NOT_INITIALIZED);
        }

        const results = await messenger.send(
          "PROCESS_GPS_DATA",
          { coordinates },
          onProgress,
        );

        // Validate worker results before setting state
        validateGPSDataResults(results);

        get().setGpxData(results.points);
        get().setSlopes(results.slopes);
        get().setCumulativeDistances(results.cumulativeDistances);
        get().setCumulativeElevations(results.cumulativeElevations);
        get().setCumulativeElevationLosses(results.cumulativeElevationLoss);

        get().updateStats({
          distance: results.totalDistance ?? 0,
          elevationGain: results.totalElevation ?? 0,
          elevationLoss: results.totalElevationLoss ?? 0,
          pointCount: results.pointCount ?? 0,
        });

        set(
          (state) => ({
            ...state,
            worker: {
              ...state.worker,
              errorMessage: "",
            },
          }),
          undefined,
          "worker/setWorkerState",
        );

        return results;
      } catch (error) {
        handleWorkerError(error, ERROR_MESSAGES.GPS_DATA);
      }
    },

    processSections: async (coordinates, sections, onProgress) => {
      try {
        if (!messenger) {
          throw new Error(ERROR_MESSAGES.NOT_INITIALIZED);
        }

        const results = await messenger.send(
          "PROCESS_SECTIONS",
          { coordinates, sections },
          onProgress,
        );

        // Validate worker results before setting state
        if (results) {
          validateSectionsResults(results);
        }

        get().setSections(results ?? []);
        get().updateStats({
          distance: results?.totalDistance ?? 0,
          elevationGain: results?.totalElevationGain ?? 0,
          elevationLoss: results?.totalElevationLoss ?? 0,
          pointCount: results?.pointCount ?? 0,
        });

        set(
          (state) => ({
            ...state,
            worker: {
              ...state.worker,
              errorMessage: "",
            },
          }),
          undefined,
          "worker/setWorkerState",
        );

        return results;
      } catch (error) {
        handleWorkerError(error, ERROR_MESSAGES.SECTIONS);
      }
    },

    calculateRouteStats: async (coordinates, segments) => {
      try {
        if (!messenger) {
          throw new Error(ERROR_MESSAGES.NOT_INITIALIZED);
        }

        const results = await messenger.send("CALCULATE_ROUTE_STATS", {
          coordinates,
          segments,
        });

        // Validate worker results before setting state
        validateRouteStatsResults(results);

        get().updateStats({
          distance: results.distance,
          elevationGain: results.elevationGain,
          elevationLoss: results.elevationLoss,
          pointCount: results.pointCount,
        });

        set(
          (state) => ({
            ...state,
            worker: {
              ...state.worker,
              errorMessage: "",
            },
          }),
          undefined,
          "worker/setWorkerState",
        );

        return results;
      } catch (error) {
        handleWorkerError(error, ERROR_MESSAGES.ROUTE_STATS);
      }
    },

    findPointsAtDistances: async (coordinates, distances) => {
      try {
        if (!messenger) {
          throw new Error(ERROR_MESSAGES.NOT_INITIALIZED);
        }

        const results = await messenger.send("FIND_POINTS_AT_DISTANCES", {
          coordinates,
          distances,
        });

        // Validate worker results before returning
        validatePointsAtDistancesResults(results);

        set(
          (state) => ({
            ...state,
            worker: {
              ...state.worker,
              errorMessage: "",
            },
          }),
          undefined,
          "worker/setWorkerState",
        );

        return results;
      } catch (error) {
        handleWorkerError(error, ERROR_MESSAGES.POINTS_AT_DISTANCES);
      }
    },

    getRouteSection: async (coordinates, start, end) => {
      try {
        if (!messenger) {
          throw new Error(ERROR_MESSAGES.NOT_INITIALIZED);
        }

        const results = await messenger.send("GET_ROUTE_SECTION", {
          coordinates,
          start,
          end,
        });

        // Validate worker results before returning
        validateRouteSectionResults(results);

        set(
          (state) => ({
            ...state,
            worker: {
              ...state.worker,
              errorMessage: "",
            },
          }),
          undefined,
          "worker/setWorkerState",
        );

        return results;
      } catch (error) {
        handleWorkerError(error, ERROR_MESSAGES.ROUTE_SECTION);
      }
    },

    findClosestLocation: async () => {
      try {
        if (!messenger) {
          throw new Error(ERROR_MESSAGES.NOT_INITIALIZED);
        }

        const { gps, gpx } = get();
        const point = gps.location.coords;
        const coordinates = gpx.data;

        if (!point || !coordinates || coordinates.length === 0) {
          set(
            (state) => ({
              ...state,
              worker: {
                ...state.worker,
                processing: false,
                progress: 0,
                errorMessage: ERROR_MESSAGES.NO_LOCATION,
              },
            }),
            undefined,
            "worker/setWorkerState",
          );
          return null;
        }

        const results = await messenger.send("FIND_CLOSEST_LOCATION", {
          coordinates,
          target: point,
        });

        if (results && results.closestLocation) {
          set(
            (state) => ({
              ...state,
              worker: {
                ...state.worker,
                processing: false,
                progress: 100,
                errorMessage: "",
              },
            }),
            undefined,
            "worker/setWorkerState",
          );
        }

        return results;
      } catch (error) {
        handleWorkerError(error, ERROR_MESSAGES.CLOSEST_LOCATION);
      }
    },
  };
};
