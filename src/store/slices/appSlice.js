export const createAppSlice = (set, get) => ({
  app: {
    trackingMode: false,
    displaySlopes: false,
    currentPositionIndex: { index: 0, date: 0 },
    currentLocation: null,
    currentClosestLocation: null,
    startingDate: 0, //Unix timestamp
  },

  // App Actions
  getCurrentLocation: async () => {
    set((state) => ({
      ...state,
      app: {
        ...state.app,
        loading: true,
      },
    }));
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const coords = [position.coords.longitude, position.coords.latitude, 0];

      const date = position.timestamp;

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

  // Selectors
  getStartingDate: () => get().app.startingDate,
  getTrackingMode: () => get().app.trackingMode,
  getDisplaySlopes: () => get().app.displaySlopes,
  getCurrentPositionIndex: () => get().app.currentPositionIndex,
});
