export const createAppSlice = (set, get) => {
  return {
    app: {
      trackingMode: false,
      displaySlopes: false,
      profileMode: false,
      locations: [],
      pendingUrl: null,
      liveSessionId: Math.random().toString(36).slice(2, 8).toUpperCase(),
      mode: null,
      followerRoomId: null,
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

    setLiveSessionId: (id) =>
      set(
        (state) => ({ app: { ...state.app, liveSessionId: id } }),
        undefined,
        "app/setLiveSessionId",
      ),

    setMode: (mode) =>
      set(
        (state) => ({ app: { ...state.app, mode } }),
        undefined,
        "app/setMode",
      ),

    setFollowerRoomId: (id) =>
      set(
        (state) => ({ app: { ...state.app, followerRoomId: id } }),
        undefined,
        "app/setFollowerRoomId",
      ),
  };
};
