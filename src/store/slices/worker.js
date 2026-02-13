let worker = null;
const requests = new Map();
const WORKER_TIMEOUT = 60000; // 60 seconds

// Helper to create worker
function createGPSWorker() {
  return new Worker(new URL("../../gpxWorker.js", import.meta.url), {
    type: "module",
  });
}

// Validation helpers for worker results
function validateArray(value, name) {
  if (!Array.isArray(value)) {
    throw new Error(`Expected ${name} to be an array, got ${typeof value}`);
  }
  return value;
}

function validateObject(value, name) {
  if (!value || typeof value !== "object") {
    throw new Error(`Expected ${name} to be an object, got ${typeof value}`);
  }
  return value;
}

function validateGPXResults(results) {
  if (!results) throw new Error("No results returned from worker");

  const trace = validateObject(results.trace, "results.trace");
  validateArray(trace.points, "trace.points");
  validateArray(trace.peaks, "trace.peaks");
  validateArray(trace.slopes, "trace.slopes");
  validateArray(trace.cumulativeDistances, "trace.cumulativeDistances");
  validateArray(trace.cumulativeElevations, "trace.cumulativeElevations");
  validateArray(trace.cumulativeElevationLoss, "trace.cumulativeElevationLoss");

  if (typeof trace.totalDistance !== "number") {
    throw new Error("Expected totalDistance to be a number");
  }
  if (typeof trace.totalElevation !== "number") {
    throw new Error("Expected totalElevation to be a number");
  }
  if (typeof trace.totalElevationLoss !== "number") {
    throw new Error("Expected totalElevationLoss to be a number");
  }

  validateArray(results.sections, "results.sections");
  validateArray(results.waypoints, "results.waypoints");
  validateObject(results.metadata, "results.metadata");

  return true;
}

function validateGPSDataResults(results) {
  if (!results) throw new Error("No results returned from worker");

  validateArray(results.points, "results.points");
  validateArray(results.slopes, "results.slopes");
  validateArray(results.cumulativeDistances, "results.cumulativeDistances");
  validateArray(results.cumulativeElevations, "results.cumulativeElevations");
  validateArray(
    results.cumulativeElevationLoss,
    "results.cumulativeElevationLoss",
  );

  if (typeof results.totalDistance !== "number") {
    throw new Error("Expected totalDistance to be a number");
  }
  if (typeof results.totalElevation !== "number") {
    throw new Error("Expected totalElevation to be a number");
  }
  if (typeof results.totalElevationLoss !== "number") {
    throw new Error("Expected totalElevationLoss to be a number");
  }
  if (typeof results.pointCount !== "number") {
    throw new Error("Expected pointCount to be a number");
  }

  return true;
}

function validateSectionsResults(results) {
  if (!results) throw new Error("No results returned from worker");

  validateArray(results, "results");

  if (typeof results.totalDistance !== "number") {
    throw new Error("Expected totalDistance to be a number");
  }
  if (typeof results.totalElevationGain !== "number") {
    throw new Error("Expected totalElevationGain to be a number");
  }
  if (typeof results.totalElevationLoss !== "number") {
    throw new Error("Expected totalElevationLoss to be a number");
  }
  if (typeof results.pointCount !== "number") {
    throw new Error("Expected pointCount to be a number");
  }

  return true;
}

export const createWorkerSlice = (set, get) => {
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
        requests.delete(id);
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
              break;

            case "GPX_FILE_PROCESSED":
            case "GPS_DATA_PROCESSED":
            case "SECTIONS_PROCESSED":
            case "ROUTE_STATS_CALCULATED":
            case "POINTS_FOUND":
            case "ROUTE_SECTION_READY":
            case "CLOSEST_POINT_FOUND":
              requests.delete(id);
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
              break;

            case "ERROR":
              requests.delete(id);
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
              break;
          }
        };

        worker.onerror = (error) => {
          console.error("GPS Worker error:", error);
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
        console.error("Failed to create GPS Worker:", error);
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
      for (const [id, request] of requests.entries()) {
        clearTimeout(request.timeoutHandle);
        request.reject(new Error("Worker was terminated"));
      }
      requests.clear();

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
        const results = await sendWorkerMessage("CALCULATE_ROUTE_STATS", {
          coordinates,
          segments,
        });

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
        const results = await sendWorkerMessage("FIND_POINTS_AT_DISTANCES", {
          coordinates,
          distances,
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
        const results = await sendWorkerMessage("GET_ROUTE_SECTION", {
          coordinates,
          start,
          end,
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

        const results = await sendWorkerMessage("FIND_CLOSEST_LOCATION", {
          coordinates,
          target: point,
        });

        if (results && results.closestLocation) {
          const closestCoord = results.closestLocation;
          const closestIndex = results.closestIndex;

          // get().setClosestLocation(closestCoord, closestIndex);

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

    // Testing only: expose sendWorkerMessage for testing concurrent requests
    __TESTING_ONLY_sendWorkerMessage: sendWorkerMessage,
  };
};

// Testing only: reset module-level state
export function __TESTING_ONLY_resetWorkerState() {
  worker = null;
  requests.clear();
}
