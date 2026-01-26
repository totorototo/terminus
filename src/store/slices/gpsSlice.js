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

    setLocation: (location) =>
      set(
        (state) => ({
          ...state,
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
          ...state,
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
          navigator.geolocation.getCurrentPosition(resolve, reject);
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
      } catch (error) {}
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
  };
};
