let worker = null;
const requests = new Map();

// Helper to create worker
function createGPSWorker() {
  return new Worker(new URL("../../gpxWorker.js", import.meta.url), {
    type: "module",
  });
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
      requests.set(id, { resolve, reject, onProgress });

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

        get().updateStats({
          distance: results.trace.totalDistance ?? 0,
          elevationGain: results.trace.totalElevation ?? 0,
          elevationLoss: results.trace.totalElevationLoss ?? 0,
          pointCount: results.trace.points.length ?? 0,
        });

        get().setMetadata(results.metadata);

        get().setGpxData(results.trace.points);
        get().setSlopes(results.trace.slopes);
        get().setCumulativeDistances(results.trace.cumulativeDistances);
        get().setCumulativeElevations(results.trace.cumulativeElevations);
        get().setCumulativeElevationLosses(
          results.trace.cumulativeElevationLoss,
        );
        get().setSections(results.sections);
        get().setWayPoints(results.waypoints);

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

        get().stats.updateStats({
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
  };
};
