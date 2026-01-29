export const createAppSlice = (set, get) => {
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
  };
};
