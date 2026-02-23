import createRingBuffer from "../../helpers/createRingBuffer";

export const createGPSSlice = (set, get) => {
  // Create ring buffer for storing last 10 GPS positions
  // Will be initialized lazily to handle rehydration
  let locationBuffer = null;

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
      savedLocations: [],
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

        set(
          (state) => ({
            ...state,
            gps: {
              ...state.gps,
              projectedLocation: {
                timestamp: location.date,
                coords: projectedLocation.closestLocation,
                index: projectedLocation.closestIndex,
              },
            },
          }),
          undefined,
          "gps/setProjectedLocation",
        );
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

        console.error("Geolocation error:", errorMessage, error);

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

    shareLocation: async () => {
      const location = get().gps.projectedLocation;
      if (!location || !location.coords || location.coords.length < 2) {
        console.warn("No location available to share");
        return;
      }

      const [lat, lon] = location.coords;
      const { timestamp, index } = location;
      const url = `${import.meta.env.PROD ? "https://terminus-beta.netlify.app/follower" : "http://localhost:5173/follower"}?q=${lat},${lon}&index=${index}&timestamp=${timestamp}`;

      // Try Web Share API first (mobile-friendly)
      if (navigator.share) {
        try {
          await navigator.share({
            title: "My Location",
            url: url,
          });
          console.log("Location shared successfully");
        } catch (error) {
          // User cancelled or share failed
          if (error.name !== "AbortError") {
            console.error("Error sharing location:", error);
          }
        }
      } else {
        // Fallback to clipboard for desktop browsers
        try {
          await navigator.clipboard.writeText(url);
          console.log("Location copied to clipboard");
        } catch (error) {
          console.error("Error copying location to clipboard:", error);
        }
      }
    },
  };
};
