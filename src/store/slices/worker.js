import { createWorkerMessenger } from "./workerMessenger.js";
import { MESSAGE_TYPES } from "./workerTypes.js";
import {
  validateGPXResults,
  validatePointsAtDistancesResults,
  validateRouteSectionResults,
} from "./workerValidation.js";

// Default worker factory (can be overridden for testing)
function createGPSWorker() {
  return new Worker(new URL("../../gpxWorker.js", import.meta.url), {
    type: "module",
  });
}

// Error messages for consistent user feedback and i18n support
const ERROR_MESSAGES = {
  GPX_FILE: "Failed to process GPX File",
  POINTS_AT_DISTANCES: "Failed to find points at distances",
  ROUTE_SECTION: "Failed to get route section",
  CLOSEST_LOCATION: "Failed to find closest point",
  AUDIO_FRAMES: "Failed to generate audio frames",
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
  let rawGpxBytes = null; // stored so we can re-process with updated pace settings

  // Route-identity handshake for findClosestLocation, which fires on every GPS
  // fix: `routeVersion` bumps whenever a route is (re)loaded, and
  // `coordinatesSentForVersion` tracks whether the worker's resident trace
  // already matches it. Once they match, the full coordinate array (which can
  // be tens of thousands of points) no longer needs to be re-cloned through
  // postMessage on every fix — see getResidentTrace in gpxWorker.js.
  let routeVersion = 0;
  let coordinatesSentForVersion = null;

  // Helper: Handle worker operation errors and update state
  const handleWorkerError = (error, defaultMessage) => {
    set(
      (state) => ({
        ...state,
        worker: {
          ...state.worker,
          processing: false,
          progress: 0,
          progressMessage: "",
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
        // A freshly created worker has no resident trace yet — force the next
        // findClosestLocation call to (re)send coordinates.
        coordinatesSentForVersion = null;

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

        worker.onerror = (_error) => {
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
      } catch (_error) {
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

      // The next worker instance starts with an empty resident-trace cache.
      coordinatesSentForVersion = null;

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

        // A genuinely new route invalidates any previously fetched forecasts so
        // weather from the prior route cannot leak into the new estimates.
        const isNewFile = rawGpxBytes !== gpxBytes;
        if (isNewFile) {
          get().clearWeatherForecasts?.();
        }

        rawGpxBytes = gpxBytes;
        const {
          basePaceSPerKm = 500,
          kFatigue = 0.002,
          lifeBaseStopS = 3600,
        } = get().app?.paceSettings ?? {};
        // Forecasts (keyed by checkpoint name) refine per-section estimates in
        // Zig. Empty/absent on first load → weather-neutral; populated on a later
        // reprocess once ETAs are known and weather has been fetched.
        const weatherByCheckpoint = get().weather?.forecasts ?? null;
        const results = await messenger.send(
          "PROCESS_GPX_FILE",
          {
            gpxBytes,
            basePaceSPerKm,
            kFatigue,
            lifeBaseStopS,
            weatherByCheckpoint,
          },
          onProgress,
        );

        // Validate worker results before setting state
        validateGPXResults(results);

        // A newly (re)parsed route means the worker's PROCESS_GPX_FILE call
        // rebuilt its GPXData/trace from scratch — any resident trace cached
        // from a prior findClosestLocation call for the old route is now
        // stale, so bump routeVersion and force the next findClosestLocation
        // call to resend coordinates once.
        routeVersion += 1;
        coordinatesSentForVersion = null;

        get().setTraceData({
          data: results.trace.points,
          slopes: results.trace.slopes,
          cumulativeDistances: results.trace.cumulativeDistances,
          cumulativeElevations: results.trace.cumulativeElevations,
          cumulativeElevationLoss: results.trace.cumulativeElevationLoss,
        });
        get().setMetadata(results.metadata);
        get().setPeaks(results.trace.peaks);
        get().setValleys(results.trace.valleys);
        get().setClimbs(results.climbs ?? []);
        get().setRouteLatLonEle(results.routeLatLonEle ?? null);

        get().updateStats({
          distance: results.trace.totalDistance ?? 0,
          elevationGain: results.trace.totalElevation ?? 0,
          elevationLoss: results.trace.totalElevationLoss ?? 0,
          pointCount: results.trace.points.length ?? 0,
        });

        get().setLegs(results.legs);
        get().setSections(results.sections);
        get().setStages(results.stages);
        get().setWayPoints(results.waypoints);

        return results;
      } catch (error) {
        handleWorkerError(error, ERROR_MESSAGES.GPX_FILE);
      }
    },

    reprocessGPXFile: async () => {
      if (!rawGpxBytes || !messenger) return;
      await get().processGPXFile(rawGpxBytes);
    },

    // Recalibrate section and stage ETAs against the runner's current trace index
    // and elapsed time. Best-effort: without a fix or race start the result stays
    // null and the hooks fall back to the a-priori model.
    recalibrate: async () => {
      if (!rawGpxBytes || !messenger) return;

      const { gps, sections } = get();
      const currentIndex = gps?.projectedLocation?.index;
      // Without a fix snapped onto the trace there is nothing to calibrate from.
      if (currentIndex == null) return;

      // Race start anchors elapsed time; the first section carries it.
      const startTime = sections?.[0]?.startTime;
      if (startTime == null) return;

      const raceStartMs = startTime * 1000;
      const nowMs = gps.projectedLocation.timestamp || Date.now();
      const actualElapsedS = (nowMs - raceStartMs) / 1000;
      if (actualElapsedS <= 0) return; // before the gun, nothing to calibrate

      const {
        basePaceSPerKm = 500,
        kFatigue = 0.002,
        lifeBaseStopS = 3600,
      } = get().app?.paceSettings ?? {};
      const weatherByCheckpoint = get().weather?.forecasts ?? null;

      // No gpxBytes: the worker retained them from PROCESS_GPX_FILE and keeps a
      // resident parsed route, so each tick avoids cloning + re-parsing the file.
      const payload = {
        currentIndex,
        actualElapsedS,
        basePaceSPerKm,
        kFatigue,
        lifeBaseStopS,
        weatherByCheckpoint,
      };

      try {
        const { recalibration } = await messenger.send("RECALIBRATE", payload);
        get().setRecalibration("section", recalibration?.section ?? null);
        get().setRecalibration("stage", recalibration?.stage ?? null);
      } catch (error) {
        // Recalibration is a refinement, not a hard dependency — log and move on.
        console.error("Recalibration failed:", error.message);
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

    workerGenerateAudioFrames: async (
      elevations,
      distances,
      slopes,
      sections,
    ) => {
      try {
        if (!messenger) {
          throw new Error(ERROR_MESSAGES.NOT_INITIALIZED);
        }

        const response = await messenger.send(
          MESSAGE_TYPES.REQUEST.GENERATE_AUDIO_FRAMES,
          {
            elevations,
            distances,
            slopes,
            sections,
          },
        );

        return response.frames;
      } catch (error) {
        handleWorkerError(error, ERROR_MESSAGES.AUDIO_FRAMES);
        throw error;
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

        // Send the full coordinate array (which can be tens of thousands of
        // points) only on the first call for this route — the worker caches
        // it in a resident Trace keyed by routeVersion, and findClosestLocation
        // fires on every GPS fix, so every call after the first can skip
        // re-cloning it through postMessage.
        const needsCoordinates = coordinatesSentForVersion !== routeVersion;
        const payload = { routeVersion, target: point };
        if (needsCoordinates) {
          payload.coordinates = coordinates;
        }

        const results = await messenger.send("FIND_CLOSEST_LOCATION", payload);
        coordinatesSentForVersion = routeVersion;

        return results;
      } catch (error) {
        handleWorkerError(error, ERROR_MESSAGES.CLOSEST_LOCATION);
      }
    },
  };
};
