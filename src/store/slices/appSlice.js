import createRingBuffer from "../../helpers/createRingBuffer";

export const createAppSlice = (set, get) => {
  // Create ring buffer for storing last 10 GPS positions
  // Will be initialized lazily to handle rehydration
  let locationBuffer = null;

  const ensureBuffer = () => {
    if (!locationBuffer) {
      const locations = get().app.locations || [];
      locationBuffer = createRingBuffer(10, locations);
    }
    return locationBuffer;
  };

  return {
    app: {
      trackingMode: false,
      displaySlopes: false,
      profileMode: false,
      currentPositionIndex: { index: 0, date: 0 },
      currentLocation: null,
      currentClosestLocation: null,
      currentClosestLocationIndex: 0,
      startingDate: 0, //Unix timestamp
      locations: [],
    },

    // Initialize/sync buffer from persisted state (called after rehydration)
    initLocationBuffer: () => {
      const locations = get().app.locations || [];
      locationBuffer = createRingBuffer(10, locations);
    },

    // App Actions
    getCurrentLocation: async () => {
      set(
        (state) => ({
          ...state,
          app: {
            ...state.app,
            loading: true,
          },
        }),
        undefined,
        "app/getCurrentLocation",
      );
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
            app: {
              ...state.app,
              currentLocation: location,
              loading: false,
              locations: buffer.dump(),
            },
          }),
          undefined,
          "app/getCurrentLocation",
        );
      } catch (error) {
        set(
          (state) => ({
            ...state,
            app: {
              ...state.app,
              error: error.message,
              loading: false,
            },
          }),
          undefined,
          "app/getCurrentLocationError",
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

    toggleTrackingMode: () =>
      set(
        (state) => ({
          ...state,
          app: {
            ...state.app,
            trackingMode: !state.app.trackingMode,
          },
        }),
        undefined,
        "app/toggleTrackingMode",
      ),

    toggleProfileMode: () =>
      set(
        (state) => ({
          ...state,
          app: {
            ...state.app,
            profileMode: !state.app.profileMode,
          },
        }),
        undefined,
        "app/toggleProfileMode",
      ),
    toggleSlopesMode: () =>
      set(
        (state) => ({
          ...state,
          app: {
            ...state.app,
            displaySlopes: !state.app.displaySlopes,
          },
        }),
        undefined,
        "app/toggleSlopesMode",
      ),

    setCurrentPositionIndex: (value) =>
      set(
        (state) => ({
          ...state,
          app: {
            ...state.app,
            currentPositionIndex: value,
          },
        }),
        undefined,
        "app/setCurrentPositionIndex",
      ),

    setStartingDate: (date) => {
      set(
        (state) => ({
          ...state,
          app: {
            ...state.app,
            startingDate: date,
          },
        }),
        undefined,
        "app/setStartingDate",
      );
    },

    setClosestLocation: (location, index) =>
      set(
        (state) => ({
          ...state,
          app: {
            ...state.app,
            currentClosestLocation: location,
            currentClosestLocationIndex: index,
          },
        }),
        undefined,
        "app/setClosestLocation",
      ),
  };
};
