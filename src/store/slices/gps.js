import createRingBuffer from "../../helpers/createRingBuffer";
import {
  notifyLocationUpdate,
  requestNotificationPermission,
  subscribeToPush,
} from "../../helpers/notify";
import { track } from "../../lib/analytics.js";

let PartySocketModule = null;
const getPartySocket = async () => {
  if (!PartySocketModule) {
    PartySocketModule = (await import("partysocket")).default;
  }
  return PartySocketModule;
};

const PARTYKIT_HOST = import.meta.env.VITE_PARTYKIT_HOST ?? "localhost:1999";

const generateSessionId = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();

export const createGPSSlice = (set, get) => {
  // Create ring buffer for storing last 10 GPS positions
  // Will be initialized lazily to handle rehydration
  let locationBuffer = null;
  let partySocket = null;
  let followerSocket = null;
  let pendingMessage = null;

  const ensureSocket = async (sessionId) => {
    const isUnusable =
      !partySocket ||
      partySocket.readyState === WebSocket.CLOSED ||
      partySocket.readyState === WebSocket.CLOSING;

    if (isUnusable) {
      const PartySocket = await getPartySocket();
      partySocket = new PartySocket({ host: PARTYKIT_HOST, room: sessionId });
      // Drain the single pending-message slot on every (re)connect
      const socket = partySocket;
      socket.addEventListener("open", () => {
        if (pendingMessage) {
          socket.send(pendingMessage);
          pendingMessage = null;
        }
      });
    }
  };

  const broadcastLocation = async (
    sessionId,
    location,
    raceId,
    paceSettings,
  ) => {
    await ensureSocket(sessionId);
    const { timestamp, coords, index } = location;
    const message = JSON.stringify({
      type: "location",
      timestamp,
      coords,
      index,
      raceId,
      paceSettings,
    });
    if (partySocket.readyState === WebSocket.OPEN) {
      partySocket.send(message);
    } else {
      // Overwrite — only the latest location matters
      pendingMessage = message;
    }
  };

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
      notificationPermission:
        typeof window !== "undefined" && "Notification" in window
          ? Notification.permission === "default"
            ? null
            : Notification.permission
          : null,
      followerConnectionStatus: "idle", // "idle" | "connecting" | "connected" | "disconnected"
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

        // Broadcast to followers if in trailer mode
        const sessionId = get().app.liveSessionId;
        if (get().app.mode === "trailer" && sessionId) {
          await broadcastLocation(
            sessionId,
            projected,
            get().app.raceId,
            get().app.paceSettings,
          );
        }
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

    shareLocation: async () => {
      track("share-location");
      const raceId = get().app.raceId;
      if (!raceId) return;

      let sessionId = get().app.liveSessionId;
      if (!sessionId) {
        sessionId = generateSessionId();
        get().setLiveSessionId(sessionId);
      }

      const url = `${window.location.origin}/follow/${raceId}/${sessionId}`;

      if (navigator.share) {
        try {
          await navigator.share({ title: "Follow my run", url });
        } catch (error) {
          if (error.name !== "AbortError") throw error;
        }
      } else {
        try {
          await navigator.clipboard.writeText(url);
        } catch {
          // Clipboard unavailable — silently fail
        }
      }
    },

    connectToFollowerSession: async (roomId) => {
      if (!roomId) return;
      track("follower-session-start", { raceId: get().app.raceId });

      get().setFollowerRoomId(roomId);

      // Close existing follower socket if any
      if (followerSocket) {
        followerSocket.close();
      }

      set(
        (state) => ({
          gps: { ...state.gps, followerConnectionStatus: "connecting" },
        }),
        undefined,
        "gps/followerConnectionStatus",
      );

      const PartySocket = await getPartySocket();
      followerSocket = new PartySocket({
        host: PARTYKIT_HOST,
        room: roomId,
      });

      followerSocket.addEventListener("open", async () => {
        set(
          (state) => ({
            gps: { ...state.gps, followerConnectionStatus: "connected" },
          }),
          undefined,
          "gps/followerConnectionStatus",
        );
        if (Notification.permission === "granted") {
          const subscription = await subscribeToPush();
          if (subscription && followerSocket?.readyState === WebSocket.OPEN) {
            followerSocket.send(
              JSON.stringify({
                type: "push_subscribe",
                subscription: subscription.toJSON(),
              }),
            );
          }
        }
      });

      followerSocket.addEventListener("close", () => {
        set(
          (state) => ({
            gps: { ...state.gps, followerConnectionStatus: "disconnected" },
          }),
          undefined,
          "gps/followerConnectionStatus",
        );
      });

      followerSocket.addEventListener("error", () => {
        set(
          (state) => ({
            gps: { ...state.gps, followerConnectionStatus: "disconnected" },
          }),
          undefined,
          "gps/followerConnectionStatus",
        );
      });

      followerSocket.addEventListener("message", (event) => {
        let msg;
        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }
        if (msg.type === "location" && Array.isArray(msg.coords)) {
          get().setProjectedLocation({
            timestamp: msg.timestamp,
            coords: msg.coords,
            index: msg.index,
          });
          notifyLocationUpdate(msg);

          // Apply runner's pace settings if they differ — triggers re-processing
          // so followers see the same ETAs as the trailer.
          if (msg.paceSettings) {
            const current = get().app.paceSettings;
            if (
              msg.paceSettings.basePaceSPerKm !== current.basePaceSPerKm ||
              msg.paceSettings.kFatigue !== current.kFatigue
            ) {
              get().setPaceSettings(msg.paceSettings);
              get().reprocessGPXFile();
            }
          }
        }
      });
    },

    enableNotifications: async () => {
      const permission = await requestNotificationPermission();
      set(
        (state) => ({
          gps: {
            ...state.gps,
            notificationPermission: permission,
          },
        }),
        undefined,
        "gps/enableNotifications",
      );
      if (permission === "granted") {
        const subscription = await subscribeToPush();
        if (subscription && followerSocket?.readyState === WebSocket.OPEN) {
          followerSocket.send(
            JSON.stringify({
              type: "push_subscribe",
              subscription: subscription.toJSON(),
            }),
          );
        }
      }
      return permission;
    },

    disconnectFollowerSession: () => {
      if (followerSocket) {
        followerSocket.close();
        followerSocket = null;
      }
      set(
        (state) => ({
          gps: { ...state.gps, followerConnectionStatus: "idle" },
        }),
        undefined,
        "gps/followerConnectionStatus",
      );
    },

    disconnectTrailerSession: () => {
      if (partySocket) {
        partySocket.close();
        partySocket = null;
      }
      pendingMessage = null;
    },
  };
};
