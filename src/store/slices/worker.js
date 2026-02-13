import {
  validateGPXResults,
  validateGPSDataResults,
  validateSectionsResults,
} from "./workerValidation.js";
import { MESSAGE_TYPES, SUCCESS_RESPONSE_TYPES } from "./workerTypes.js";

const WORKER_TIMEOUT = 60000; // 60 seconds

// Default worker factory (can be overridden for testing)
function createGPSWorker() {
  return new Worker(new URL("../../gpxWorker.js", import.meta.url), {
    type: "module",
  });
}

// Clean up a single pending request and cancel its timeout
function cleanupRequest(requests, id) {
  const request = requests.get(id);
  if (request) {
    clearTimeout(request.timeoutHandle);
  }
  requests.delete(id);
}

// Clean up all pending requests (e.g., on worker termination)
function cleanupAllRequests(requests, error) {
  for (const [id, request] of requests.entries()) {
    clearTimeout(request.timeoutHandle);
    request.reject(error);
  }
  requests.clear();
}

// Create the message handler for the worker
function createMessageHandler(set, get, requests) {
  return function handleWorkerMessage(e) {
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

    if (type === MESSAGE_TYPES.RESPONSE.PROGRESS) {
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
      request.onProgress?.(progressValue, message);
    } else if (SUCCESS_RESPONSE_TYPES.has(type)) {
      cleanupRequest(requests, id);
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
      request.resolve(results ?? e.data);
    } else if (type === MESSAGE_TYPES.RESPONSE.ERROR) {
      cleanupRequest(requests, id);
      set(
        (state) => ({
          ...state,
          worker: {
            ...state.worker,
            processing: false,
            progress: 0,
            errorMessage: error ?? "Unknown worker error",
          },
        }),
        undefined,
        "worker/setWorkerError",
      );
      request.reject(new Error(error));
    }
  };
}

export const createWorkerSlice = (set, get, workerFactory) => {
  // Handle case where Zustand middleware passes store API as 3rd parameter
  // When used with slices, workerFactory may be undefined or the store API object
  // In tests, workerFactory will be a function passed explicitly
  const factory =
    typeof workerFactory === "function" ? workerFactory : createGPSWorker;

  // Closure-local state (fresh for each store instance, no cross-test contamination)
  let worker = null;
  const requests = new Map();

  // Worker Communication
  async function sendWorkerMessage(type, data, onProgress) {
    return new Promise((resolve, reject) => {
      const state = get();
      if (!worker || !state.worker.isReady) {
        reject(new Error("Worker not ready"));
        return;
      }

      const id = Date.now() + Math.random();
      let timeoutHandle;

      // Wrap resolve/reject to clear timeout before completing
      const wrappedResolve = (result) => {
        clearTimeout(timeoutHandle);
        resolve(result);
      };

      const wrappedReject = (error) => {
        clearTimeout(timeoutHandle);
        reject(error);
      };

      // Set up timeout to cleanup if worker doesn't respond
      timeoutHandle = setTimeout(() => {
        cleanupRequest(requests, id);
        const errorMsg = `Worker request ${type} timed out after ${WORKER_TIMEOUT}ms`;
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
        wrappedReject(new Error(errorMsg));
      }, WORKER_TIMEOUT);

      requests.set(id, {
        resolve: wrappedResolve,
        reject: wrappedReject,
        onProgress,
        timeoutHandle,
      });

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

      worker.postMessage({ type, data, id });
    });
  }

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

        worker.onmessage = createMessageHandler(set, get, requests);

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
      cleanupAllRequests(requests, new Error("Worker was terminated"));

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
        const results = await sendWorkerMessage(
          MESSAGE_TYPES.REQUEST.PROCESS_GPX_FILE,
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
        set(
          (state) => ({
            ...state,
            worker: {
              ...state.worker,
              processing: false,
              progress: 0,
              errorMessage: error.message || "Failed to process GPX File",
            },
          }),
          undefined,
          "worker/setWorkerError",
        );
        throw error;
      }
    },

    processGPSData: async (coordinates, onProgress) => {
      try {
        const results = await sendWorkerMessage(
          MESSAGE_TYPES.REQUEST.PROCESS_GPS_DATA,
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
        set(
          (state) => ({
            ...state,
            worker: {
              ...state.worker,
              processing: false,
              progress: 0,
              errorMessage: error.message || "Failed to process GPS Data",
            },
          }),
          undefined,
          "worker/setWorkerError",
        );
        throw error;
      }
    },

    processSections: async (coordinates, sections, onProgress) => {
      try {
        const results = await sendWorkerMessage(
          MESSAGE_TYPES.REQUEST.PROCESS_SECTIONS,
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
        set(
          (state) => ({
            ...state,
            worker: {
              ...state.worker,
              processing: false,
              progress: 0,
              errorMessage: error.message || "Failed to process Sections",
            },
          }),
          undefined,
          "worker/setWorkerError",
        );
        throw error;
      }
    },

    calculateRouteStats: async (coordinates, segments) => {
      try {
        const results = await sendWorkerMessage(
          MESSAGE_TYPES.REQUEST.CALCULATE_ROUTE_STATS,
          {
            coordinates,
            segments,
          },
        );

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
        set(
          (state) => ({
            ...state,
            worker: {
              ...state.worker,
              processing: false,
              progress: 0,
              errorMessage: error.message || "Failed to calculate Route Stats",
            },
          }),
          undefined,
          "worker/setWorkerError",
        );
        throw error;
      }
    },

    findPointsAtDistances: async (coordinates, distances) => {
      try {
        const results = await sendWorkerMessage(
          MESSAGE_TYPES.REQUEST.FIND_POINTS_AT_DISTANCES,
          {
            coordinates,
            distances,
          },
        );

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
        set(
          (state) => ({
            ...state,
            worker: {
              ...state.worker,
              processing: false,
              progress: 0,
              errorMessage:
                error.message || "Failed to find points at distances",
            },
          }),
          undefined,
          "worker/setWorkerError",
        );
        throw error;
      }
    },

    getRouteSection: async (coordinates, start, end) => {
      try {
        const results = await sendWorkerMessage(
          MESSAGE_TYPES.REQUEST.GET_ROUTE_SECTION,
          {
            coordinates,
            start,
            end,
          },
        );

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
        set(
          (state) => ({
            ...state,
            worker: {
              ...state.worker,
              processing: false,
              progress: 0,
              errorMessage: error.message || "Failed to get route section",
            },
          }),
          undefined,
          "worker/setWorkerError",
        );
        throw error;
      }
    },

    findClosestLocation: async () => {
      try {
        const point = get().gps.location.coords;
        const coordinates = get().gpx.data;

        if (!point || !coordinates || coordinates.length === 0) {
          set(
            (state) => ({
              ...state,
              worker: {
                ...state.worker,
                processing: false,
                progress: 0,
                errorMessage: "No location or GPS data available",
              },
            }),
            undefined,
            "worker/setWorkerState",
          );
          return null;
        }

        const results = await sendWorkerMessage(
          MESSAGE_TYPES.REQUEST.FIND_CLOSEST_LOCATION,
          {
            coordinates,
            target: point,
          },
        );

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
        set(
          (state) => ({
            ...state,
            worker: {
              ...state.worker,
              processing: false,
              progress: 0,
              errorMessage: error.message || "Failed to find closest point",
            },
          }),
          undefined,
          "worker/setWorkerError",
        );
        throw error;
      }
    },

    // Testing only: expose sendWorkerMessage for testing internal message flow
    __TESTING_ONLY_sendWorkerMessage: sendWorkerMessage,
  };
};
