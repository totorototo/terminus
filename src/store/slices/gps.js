import createRingBuffer from "../../helpers/createRingBuffer";
import { track } from "../../lib/analytics.js";

export const createGPSSlice = (set, get) => {
  // Create ring buffer for storing last 10 GPS positions
  // Will be initialized lazily to handle rehydration
  let locationBuffer = null;
  let autoShareIntervalId = null;
  let isTogglingAutoShare = false;

  const AUTO_SHARE_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

  const ensureBuffer = () => {
    if (!locationBuffer) {
      const locations = get().gps.savedLocations || [];
      locationBuffer = createRingBuffer(10, locations);
    }
    return locationBuffer;
  };

  return {
    gps: {
      location: {
        timestamp: 0,
        coords: [],
      },
      projectedLocation: {
        timestamp: 0,
        coords: [],
        index: null,
      },
      deviationDistance: 0,
      isOffCourse: false,
      savedLocations: [],
      autoShareEnabled: false,
    },

    // Initialize/sync buffer from persisted state (called after rehydration)
    initLocationBuffer: () => {
      const locations = get().gps.savedLocations || [];
      locationBuffer = createRingBuffer(10, locations);
    },

    flush: () => {
      const buffer = ensureBuffer();
      buffer.flush();
      set(
        (state) => ({
          gps: {
            ...state.gps,
            savedLocations: [],
            location: { timestamp: 0, coords: [] },
            projectedLocation: { timestamp: 0, coords: [], index: null },
            deviationDistance: 0,
            isOffCourse: false,
          },
        }),
        undefined,
        "gps/flush",
      );
    },

    setLocation: (location) =>
      set(
        (state) => ({
          gps: {
            ...state.gps,
            location: location,
          },
        }),
        undefined,
        "gps/setLocation",
      ),

    setProjectedLocation: (projectedLocation) =>
      set(
        (state) => ({
          gps: {
            ...state.gps,
            projectedLocation: projectedLocation,
          },
        }),
        undefined,
        "gps/setProjectedLocation",
      ),

    spotMe: async () => {
      track("spot-me");
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 30000,
          });
        });

        // Store as [lat, lon, ele] to match Zig coordinate format
        const coords = [position.coords.latitude, position.coords.longitude, 0];
        const date = position.timestamp;
        const location = { coords, date };

        // Add to ring buffer (ensure buffer is initialized)
        const buffer = ensureBuffer();
        buffer.push(location);

        set(
          (state) => ({
            ...state,
            gps: {
              ...state.gps,
              location: location,
              savedLocations: buffer.dump(),
            },
          }),
          undefined,
          "gps/spotMe",
        );

        const projectedLocation = await get().findClosestLocation();
        if (!projectedLocation) return; // GPX not loaded yet

        const projected = {
          timestamp: location.date,
          coords: projectedLocation.closestLocation,
          index: projectedLocation.closestIndex,
        };

        const OFF_COURSE_THRESHOLD = 100; // meters
        const deviationDistance = projectedLocation.deviationDistance ?? 0;

        set(
          (state) => ({
            ...state,
            gps: {
              ...state.gps,
              projectedLocation: projected,
              deviationDistance,
              isOffCourse: deviationDistance > OFF_COURSE_THRESHOLD,
            },
          }),
          undefined,
          "gps/setProjectedLocation",
        );

        // Refine ETAs against the new fix (best-effort, non-blocking).
        get().recalibrate?.();
      } catch (error) {
        let errorMessage = "Failed to get current location";

        if (error.code === 1) {
          errorMessage = "Location permission denied";
        } else if (error.code === 2) {
          errorMessage = "Location unavailable";
        } else if (error.code === 3) {
          errorMessage = "Location request timed out";
        } else if (error.message) {
          errorMessage = error.message;
        }

        set(
          (state) => ({
            ...state,
            worker: {
              ...(state.worker || {}),
              errorMessage,
            },
          }),
          undefined,
          "gps/spotMeError",
        );
      }
    },

    // Get all locations from buffer
    getLocationHistory: () => ensureBuffer().dump(),

    // Get location buffer info
    getLocationBufferInfo: () => {
      const buffer = ensureBuffer();
      return {
        count: buffer.count(),
        isFull: buffer.isFull(),
        isEmpty: buffer.isEmpty(),
      };
    },

    toggleAutoShare: async () => {
      if (isTogglingAutoShare) return;
      const enabled = get().gps.autoShareEnabled;

      if (enabled) {
        clearInterval(autoShareIntervalId);
        autoShareIntervalId = null;
        set(
          (state) => ({ gps: { ...state.gps, autoShareEnabled: false } }),
          undefined,
          "gps/autoShareDisabled",
        );
      } else {
        isTogglingAutoShare = true;
        try {
          // Immediate fix, then repeat every 30 min
          await get().spotMe();
          autoShareIntervalId = setInterval(() => {
            get().spotMe();
          }, AUTO_SHARE_INTERVAL_MS);
          set(
            (state) => ({ gps: { ...state.gps, autoShareEnabled: true } }),
            undefined,
            "gps/autoShareEnabled",
          );
        } catch (error) {
          if (error?.name !== "AbortError") {
            set(
              (state) => ({
                ...state,
                worker: {
                  ...(state.worker || {}),
                  errorMessage: error?.message || "Failed to start auto-share",
                },
              }),
              undefined,
              "gps/autoShareError",
            );
          }
        } finally {
          isTogglingAutoShare = false;
        }
      }
    },

    // Re-arm the 30 min fix loop after a reload when auto-share was persisted
    // as enabled. Called by the trailer screen once it mounts (geolocation and
    // worker are ready by then). It restores the interval AND re-asserts the
    // flag, so it self-heals if StrictMode's mount/unmount cycle cleared it via
    // disconnectTrailerSession.
    resumeAutoShare: async () => {
      if (autoShareIntervalId || isTogglingAutoShare) return;
      isTogglingAutoShare = true;
      try {
        await get().spotMe();
        autoShareIntervalId = setInterval(() => {
          get().spotMe();
        }, AUTO_SHARE_INTERVAL_MS);
        set(
          (state) => ({ gps: { ...state.gps, autoShareEnabled: true } }),
          undefined,
          "gps/resumeAutoShare",
        );
      } catch (error) {
        if (error?.name !== "AbortError") {
          set(
            (state) => ({ gps: { ...state.gps, autoShareEnabled: false } }),
            undefined,
            "gps/resumeAutoShareError",
          );
        }
      } finally {
        isTogglingAutoShare = false;
      }
    },

    disconnectTrailerSession: () => {
      clearInterval(autoShareIntervalId);
      autoShareIntervalId = null;
      set(
        (state) => ({ gps: { ...state.gps, autoShareEnabled: false } }),
        undefined,
        "gps/disconnectTrailerSession",
      );
    },
  };
};
