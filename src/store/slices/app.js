export const createAppSlice = (set, get) => {
  return {
    app: {
      trackingMode: false,
      displaySlopes: false,
      profileMode: false,
      locations: [],
      pendingUrl: null,
    },

    toggleTrackingMode: () =>
      set(
        (state) => ({
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
          app: {
            ...state.app,
            displaySlopes: !state.app.displaySlopes,
          },
        }),
        undefined,
        "app/toggleSlopesMode",
      ),

    setPendingUrl: (url) =>
      set(
        (state) => ({ app: { ...state.app, pendingUrl: url } }),
        undefined,
        "app/setPendingUrl",
      ),
  };
};
