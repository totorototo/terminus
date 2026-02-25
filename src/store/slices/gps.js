import PartySocket from "partysocket";

import createRingBuffer from "../../helpers/createRingBuffer";

const PARTYKIT_HOST = import.meta.env.VITE_PARTYKIT_HOST ?? "localhost:1999";

const generateSessionId = () =>
  Math.random().toString(36).slice(2, 8).toUpperCase();

export const createGPSSlice = (set, get) => {
  // Create ring buffer for storing last 10 GPS positions
  // Will be initialized lazily to handle rehydration
  let locationBuffer = null;
  let partySocket = null;
  let followerSocket = null;
  let pendingMessage = null;

  const ensureSocket = (sessionId) => {
    const isUnusable =
      !partySocket ||
      partySocket.readyState === WebSocket.CLOSED ||
      partySocket.readyState === WebSocket.CLOSING;

    if (isUnusable) {
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

  const broadcastLocation = (sessionId, location) => {
    ensureSocket(sessionId);
    const { timestamp, coords, index } = location;
    const message = JSON.stringify({
      type: "location",
      timestamp,
      coords,
      index,
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
      savedLocations: [],
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

        set(
          (state) => ({
            ...state,
            gps: { ...state.gps, projectedLocation: projected },
          }),
          undefined,
          "gps/setProjectedLocation",
        );

        // Broadcast to followers if in trailer mode
        const sessionId = get().app.liveSessionId;
        if (get().app.mode === "trailer" && sessionId) {
          broadcastLocation(sessionId, projected);
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

        console.error("Geolocation error:", errorMessage, error);

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
      let sessionId = get().app.liveSessionId;
      if (!sessionId) {
        sessionId = generateSessionId();
        get().setLiveSessionId(sessionId);
      }

      if (navigator.share) {
        try {
          await navigator.share({ title: "Follow my run", text: sessionId });
        } catch (error) {
          if (error.name !== "AbortError") {
            console.error("Error sharing room code:", error);
          }
        }
      } else {
        try {
          await navigator.clipboard.writeText(sessionId);
        } catch (error) {
          console.error("Error copying room code to clipboard:", error);
        }
      }
    },

    connectToFollowerSession: (roomId) => {
      if (!roomId) return;

      // Close existing follower socket if any
      if (followerSocket) {
        followerSocket.close();
      }

      followerSocket = new PartySocket({
        host: PARTYKIT_HOST,
        room: roomId,
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
        }
      });
    },

    disconnectFollowerSession: () => {
      if (followerSocket) {
        followerSocket.close();
        followerSocket = null;
      }
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
