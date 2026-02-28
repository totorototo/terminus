export const createAppSlice = (set, get) => {
  return {
    app: {
      trackingMode: false,
      displaySlopes: false,
      profileMode: false,
      locations: [],
      pendingUrl: null,
      liveSessionId: null,
      mode: null,
      followerRoomId: null,
      currentRoute: "/",
      flythroughIsPlaying: true,
      flythroughSpeed: 1,
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

    setMode: (mode) => {
      set(
        (state) => ({ app: { ...state.app, mode } }),
        undefined,
        "app/setMode",
      );
      // Clear follower room when returning to the wizard so the app
      // doesn't auto-reconnect to the previous session on next cold start
      if (mode === null) {
        get().setFollowerRoomId(null);
      }
    },

    setFollowerRoomId: (id) =>
      set(
        (state) => ({ app: { ...state.app, followerRoomId: id } }),
        undefined,
        "app/setFollowerRoomId",
      ),

    setCurrentRoute: (route) =>
      set(
        (state) => ({ app: { ...state.app, currentRoute: route } }),
        undefined,
        "app/setCurrentRoute",
      ),

    setFlythroughIsPlaying: (v) =>
      set(
        (state) => ({ app: { ...state.app, flythroughIsPlaying: v } }),
        undefined,
        "app/setFlythroughIsPlaying",
      ),

    setFlythroughSpeed: (s) =>
      set(
        (state) => ({ app: { ...state.app, flythroughSpeed: s } }),
        undefined,
        "app/setFlythroughSpeed",
      ),
  };
};
