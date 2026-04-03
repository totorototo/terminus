import { track } from "../../lib/analytics.js";

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
      raceId: null,
      currentRoute: "/",
      installPromptDismissed: false,
      highlightedClimbIndex: null,
      theme:
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light",
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

    toggleProfileMode: () => {
      track("toggle-profile");
      set(
        (state) => ({
          app: {
            ...state.app,
            profileMode: !state.app.profileMode,
          },
        }),
        undefined,
        "app/toggleProfileMode",
      );
    },
    toggleSlopesMode: () => {
      track("toggle-slopes");
      set(
        (state) => ({
          app: {
            ...state.app,
            displaySlopes: !state.app.displaySlopes,
          },
        }),
        undefined,
        "app/toggleSlopesMode",
      );
    },

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

    setRaceId: (id) =>
      set(
        (state) => ({ app: { ...state.app, raceId: id } }),
        undefined,
        "app/setRaceId",
      ),

    setCurrentRoute: (route) =>
      set(
        (state) => ({ app: { ...state.app, currentRoute: route } }),
        undefined,
        "app/setCurrentRoute",
      ),

    toggleTheme: () => {
      track("toggle-theme");
      set(
        (state) => ({
          app: {
            ...state.app,
            theme: state.app.theme === "dark" ? "light" : "dark",
          },
        }),
        undefined,
        "app/toggleTheme",
      );
    },

    dismissInstallPrompt: () =>
      set(
        (state) => ({ app: { ...state.app, installPromptDismissed: true } }),
        undefined,
        "app/dismissInstallPrompt",
      ),

    setHighlightedClimb: (index) =>
      set(
        (state) => ({ app: { ...state.app, highlightedClimbIndex: index } }),
        undefined,
        "app/setHighlightedClimb",
      ),
  };
};
