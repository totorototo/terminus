import createRingBuffer from "../../helpers/createRingBuffer";
import {
  notifyLocationUpdate,
  requestNotificationPermission,
  subscribeToPush,
} from "../../helpers/notify";
import { track } from "../../lib/analytics.js";
import { deriveRoomId, generateWriteKey } from "../../lib/roomAuth.js";

let PartySocketModule = null;
const getPartySocket = async () => {
  if (!PartySocketModule) {
    PartySocketModule = (await import("partysocket")).default;
  }
  return PartySocketModule;
};

const PARTYKIT_HOST = import.meta.env.VITE_PARTYKIT_HOST ?? "localhost:1999";

// Bounds for pace settings received from a runner over the relay. Generous
// margins around the UI presets (pace 300–600 s/km, kFatigue 0.001–0.004,
// stop 0–7200 s) so any sane runner value passes while rejecting non-finite
// or absurd inputs before they reach the pace model.
const isFiniteInRange = (v, min, max) =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;

const isValidPaceSettings = (p) =>
  p != null &&
  typeof p === "object" &&
  isFiniteInRange(p.basePaceSPerKm, 60, 3600) &&
  isFiniteInRange(p.kFatigue, 0, 0.05) &&
  (p.lifeBaseStopS == null || isFiniteInRange(p.lifeBaseStopS, 0, 86_400));

export const createGPSSlice = (set, get) => {
  // Create ring buffer for storing last 10 GPS positions
  // Will be initialized lazily to handle rehydration
  let locationBuffer = null;
  let partySocket = null;
  let followerSocket = null;
  let pendingMessage = null;
  let autoShareIntervalId = null;
  let isTogglingAutoShare = false;

  const AUTO_SHARE_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

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
    // Only the holder of the room's secret write key may broadcast. Without it
    // the relay rejects the message, so there is nothing to send.
    const writeKey = get().app.liveWriteKey;
    if (!writeKey) return;
    await ensureSocket(sessionId);
    const { timestamp, coords, index } = location;
    const message = JSON.stringify({
      type: "location",
      timestamp,
      coords,
      index,
      raceId,
      paceSettings,
      writeKey,
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
      autoShareEnabled: false,
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

        // Refine ETAs against the new fix (best-effort, non-blocking).
        get().recalibrate?.();

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
      // Regenerate when there is no session yet, or when an older persisted
      // session predates write keys (sessionId present but no key) — otherwise
      // broadcasts would be rejected by the relay.
      if (!sessionId || !get().app.liveWriteKey) {
        // Generate a secret write key and derive the public room id from it.
        // Only this device keeps the write key; the shared link carries the
        // room id alone, so followers can read but never spoof positions.
        const writeKey = generateWriteKey();
        sessionId = await deriveRoomId(writeKey);
        get().setLiveWriteKey(writeKey);
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

          // Refine ETAs against the runner's broadcast fix (best-effort).
          get().recalibrate?.();

          // Apply runner's pace settings if they differ — triggers re-processing
          // so followers see the same ETAs as the trailer. Validate first: even
          // though only an authorized runner can broadcast, never feed
          // out-of-range or non-finite values into the pace model.
          if (isValidPaceSettings(msg.paceSettings)) {
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

    toggleAutoShare: async () => {
      if (isTogglingAutoShare) return;
      const enabled = get().gps.autoShareEnabled;

      if (enabled) {
        clearInterval(autoShareIntervalId);
        autoShareIntervalId = null;
        set(
          (state) => ({ gps: { ...state.gps, autoShareEnabled: false } }),
          undefined,
          "gps/autoShareDisabled",
        );
      } else {
        isTogglingAutoShare = true;
        try {
          // Ensure a session exists so spotMe() can broadcast
          if (!get().app.liveSessionId || !get().app.liveWriteKey) {
            await get().shareLocation();
          }
          // Immediate broadcast, then repeat every 30 min
          await get().spotMe();
          autoShareIntervalId = setInterval(() => {
            get().spotMe();
          }, AUTO_SHARE_INTERVAL_MS);
          set(
            (state) => ({ gps: { ...state.gps, autoShareEnabled: true } }),
            undefined,
            "gps/autoShareEnabled",
          );
        } catch (error) {
          if (error?.name !== "AbortError") {
            set(
              (state) => ({
                ...state,
                worker: {
                  ...(state.worker || {}),
                  errorMessage: error?.message || "Failed to start auto-share",
                },
              }),
              undefined,
              "gps/autoShareError",
            );
          }
        } finally {
          isTogglingAutoShare = false;
        }
      }
    },

    // Re-arm the broadcast loop after a reload when auto-share was persisted as
    // enabled. Called by the trailer screen once it mounts (geolocation, worker
    // and raceId are ready by then). It restores the interval AND re-asserts the
    // flag, so it self-heals if StrictMode's mount/unmount cycle cleared it via
    // disconnectTrailerSession.
    resumeAutoShare: async () => {
      if (autoShareIntervalId || isTogglingAutoShare) return;
      isTogglingAutoShare = true;
      try {
        if (!get().app.liveSessionId || !get().app.liveWriteKey) {
          await get().shareLocation();
        }
        await get().spotMe();
        autoShareIntervalId = setInterval(() => {
          get().spotMe();
        }, AUTO_SHARE_INTERVAL_MS);
        set(
          (state) => ({ gps: { ...state.gps, autoShareEnabled: true } }),
          undefined,
          "gps/resumeAutoShare",
        );
      } catch (error) {
        if (error?.name !== "AbortError") {
          set(
            (state) => ({ gps: { ...state.gps, autoShareEnabled: false } }),
            undefined,
            "gps/resumeAutoShareError",
          );
        }
      } finally {
        isTogglingAutoShare = false;
      }
    },

    disconnectTrailerSession: () => {
      clearInterval(autoShareIntervalId);
      autoShareIntervalId = null;
      if (partySocket) {
        partySocket.close();
        partySocket = null;
      }
      pendingMessage = null;
      set(
        (state) => ({ gps: { ...state.gps, autoShareEnabled: false } }),
        undefined,
        "gps/disconnectTrailerSession",
      );
    },
  };
};
