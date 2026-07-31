import PartySocket from "partysocket";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { create } from "zustand";

import createRingBuffer from "../../helpers/createRingBuffer";
import { showToast } from "../../helpers/toast.js";
import { createGPSSlice } from "./gps";

// Static mock at top of file (SIMPLEST approach)
vi.mock("../../helpers/createRingBuffer", () => ({
  default: vi.fn((capacity = 10, initialData = []) => {
    let buffer = [...initialData];
    return {
      push: vi.fn((item) => {
        if (buffer.length >= capacity) {
          buffer.shift();
        }
        buffer.push(item);
        return item;
      }),
      dump: vi.fn(() => [...buffer]),
      count: vi.fn(() => buffer.length),
      isFull: vi.fn(() => buffer.length >= capacity),
      isEmpty: vi.fn(() => buffer.length === 0),
    };
  }),
}));

vi.mock("../../helpers/toast.js", () => ({
  showToast: vi.fn(),
}));

vi.mock("../../helpers/notify", () => ({
  notifyLocationUpdate: vi.fn(),
  requestNotificationPermission: vi.fn(),
  subscribeToPush: vi.fn(),
}));

// Minimal fake WebSocket-ish PartySocket — exposes the same
// addEventListener/send/close/readyState surface gps.js relies on, plus a
// dispatch() helper tests use to simulate an inbound relay message.
vi.mock("partysocket", () => {
  class MockPartySocket {
    constructor(opts) {
      this.opts = opts;
      this.readyState = 1; // OPEN
      this.listeners = {};
      this.close = vi.fn();
      this.send = vi.fn();
      MockPartySocket.instances.push(this);
    }
    addEventListener(type, cb) {
      (this.listeners[type] ??= []).push(cb);
    }
    removeEventListener(type, cb) {
      this.listeners[type] = (this.listeners[type] || []).filter(
        (l) => l !== cb,
      );
    }
    dispatch(type, event) {
      (this.listeners[type] || []).forEach((cb) => cb(event));
    }
  }
  MockPartySocket.instances = [];
  return { default: MockPartySocket };
});

describe("GPS Slice", () => {
  let store;
  let mockFindClosestLocation;
  let mockGetCurrentPosition;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // jsdom does not implement the Notification API; connectToFollowerSession's
    // "open" handler reads Notification.permission before any push-subscribe logic.
    global.Notification = { permission: "denied" };

    // Create mock geolocation FIRST
    mockGetCurrentPosition = vi.fn();
    Object.defineProperty(navigator, "geolocation", {
      value: { getCurrentPosition: mockGetCurrentPosition },
      writable: true,
    });

    // Create store with findClosestLocation mocked from the START
    mockFindClosestLocation = vi.fn();
    store = create((set, get) => ({
      ...createGPSSlice(set, get),
      findClosestLocation: mockFindClosestLocation,
      app: {
        liveSessionId: null,
        liveWriteKey: null,
        raceId: null,
        mode: null,
        paceSettings: {
          basePaceSPerKm: 500,
          kFatigue: 0.002,
          lifeBaseStopS: 3600,
        },
      },
      recalibrate: vi.fn(),
      setPaceSettings: vi.fn(({ basePaceSPerKm, kFatigue, lifeBaseStopS }) => {
        set({
          app: {
            ...get().app,
            paceSettings: {
              basePaceSPerKm:
                basePaceSPerKm ?? get().app.paceSettings.basePaceSPerKm,
              kFatigue: kFatigue ?? get().app.paceSettings.kFatigue,
              lifeBaseStopS:
                lifeBaseStopS ?? get().app.paceSettings.lifeBaseStopS,
            },
          },
        });
      }),
      reprocessGPXFile: vi.fn(),
      setLiveSessionId: vi.fn((id) => {
        set({ app: { ...get().app, liveSessionId: id } });
      }),
      setLiveWriteKey: vi.fn((key) => {
        set({ app: { ...get().app, liveWriteKey: key } });
      }),
      setRaceId: vi.fn((id) => {
        set({ app: { ...get().app, raceId: id } });
      }),
      setFollowerRoomId: vi.fn((id) => {
        set({ app: { ...get().app, followerRoomId: id } });
      }),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initial state", () => {
    it("should have the correct initial state", () => {
      const state = store.getState();
      expect(state.gps.location).toEqual({ timestamp: 0, coords: [] });
      expect(state.gps.projectedLocation).toEqual({
        timestamp: 0,
        coords: [],
        index: null,
      });
      expect(state.gps.savedLocations).toEqual([]);
    });
  });

  describe("setLocation", () => {
    it("should update the location", () => {
      const newLoc = { timestamp: 123, coords: [1, 2, 3] };
      store.getState().setLocation(newLoc);
      expect(store.getState().gps.location).toEqual(newLoc);
    });
  });

  describe("setProjectedLocation", () => {
    it("should update the projected location", () => {
      const projLoc = { timestamp: 456, coords: [4, 5, 6], index: 2 };
      store.getState().setProjectedLocation(projLoc);
      expect(store.getState().gps.projectedLocation).toEqual(projLoc);
    });
  });

  describe("initLocationBuffer", () => {
    it("should initialize the buffer from savedLocations", () => {
      store.setState({
        gps: {
          ...store.getState().gps,
          savedLocations: [{ coords: [1, 2, 3], timestamp: 1 }],
        },
      });
      store.getState().initLocationBuffer();
      expect(createRingBuffer).toHaveBeenCalledWith(10, [
        { coords: [1, 2, 3], timestamp: 1 },
      ]);
    });
  });

  describe("getLocationHistory", () => {
    it("should return empty array initially", () => {
      const history = store.getState().getLocationHistory();
      expect(Array.isArray(history)).toBe(true);
      expect(history).toEqual([]);
    });
  });

  describe("getLocationBufferInfo", () => {
    it("should return buffer info for empty buffer", () => {
      const info = store.getState().getLocationBufferInfo();
      expect(info).toEqual({
        count: 0,
        isFull: false,
        isEmpty: true,
      });
    });
  });

  describe("spotMe", () => {
    it("should call geolocation and update state on success", async () => {
      // Arrange - Setup mocks BEFORE calling spotMe
      const fakePosition = {
        coords: { latitude: 1, longitude: 2 },
        timestamp: 999,
      };

      mockGetCurrentPosition.mockImplementationOnce((success) =>
        success(fakePosition),
      );

      mockFindClosestLocation.mockResolvedValueOnce({
        closestLocation: [1, 2, 0],
        closestIndex: 0,
      });

      // Act
      await store.getState().spotMe();

      // Assert
      expect(mockGetCurrentPosition).toHaveBeenCalledTimes(1);

      expect(store.getState().gps.location).toEqual({
        coords: [1, 2, 0],
        date: 999,
      });

      expect(store.getState().gps.savedLocations).toEqual([
        {
          coords: [1, 2, 0],
          date: 999,
        },
      ]);

      expect(store.getState().gps.projectedLocation).toEqual({
        timestamp: 999,
        coords: [1, 2, 0],
        index: 0,
      });

      expect(mockFindClosestLocation).toHaveBeenCalledTimes(1);
    });

    it("should handle geolocation error silently", async () => {
      mockGetCurrentPosition.mockImplementationOnce((_, reject) =>
        reject(new Error("Location blocked")),
      );

      await expect(store.getState().spotMe()).resolves.not.toThrow();

      expect(store.getState().gps.location.timestamp).toBe(0);
    });

    describe("off-course detection", () => {
      const makePosition = (lat = 1, lon = 2, ts = 999) => ({
        coords: { latitude: lat, longitude: lon },
        timestamp: ts,
      });

      it("should set isOffCourse=false and deviationDistance=0 when exactly on route", async () => {
        mockGetCurrentPosition.mockImplementationOnce((success) =>
          success(makePosition()),
        );
        mockFindClosestLocation.mockResolvedValueOnce({
          closestLocation: [1, 2, 0],
          closestIndex: 0,
          deviationDistance: 0,
        });

        await store.getState().spotMe();

        expect(store.getState().gps.isOffCourse).toBe(false);
        expect(store.getState().gps.deviationDistance).toBe(0);
      });

      it("should set isOffCourse=false when deviation is below threshold (99m)", async () => {
        mockGetCurrentPosition.mockImplementationOnce((success) =>
          success(makePosition()),
        );
        mockFindClosestLocation.mockResolvedValueOnce({
          closestLocation: [1, 2, 0],
          closestIndex: 0,
          deviationDistance: 99,
        });

        await store.getState().spotMe();

        expect(store.getState().gps.isOffCourse).toBe(false);
        expect(store.getState().gps.deviationDistance).toBe(99);
      });

      it("should set isOffCourse=false when deviation equals threshold exactly (100m)", async () => {
        mockGetCurrentPosition.mockImplementationOnce((success) =>
          success(makePosition()),
        );
        mockFindClosestLocation.mockResolvedValueOnce({
          closestLocation: [1, 2, 0],
          closestIndex: 0,
          deviationDistance: 100,
        });

        await store.getState().spotMe();

        expect(store.getState().gps.isOffCourse).toBe(false);
        expect(store.getState().gps.deviationDistance).toBe(100);
      });

      it("should set isOffCourse=true when deviation exceeds threshold (100.01m)", async () => {
        mockGetCurrentPosition.mockImplementationOnce((success) =>
          success(makePosition()),
        );
        mockFindClosestLocation.mockResolvedValueOnce({
          closestLocation: [1, 2, 0],
          closestIndex: 0,
          deviationDistance: 100.01,
        });

        await store.getState().spotMe();

        expect(store.getState().gps.isOffCourse).toBe(true);
        expect(store.getState().gps.deviationDistance).toBe(100.01);
      });

      it("should set isOffCourse=true when far off route (300m)", async () => {
        mockGetCurrentPosition.mockImplementationOnce((success) =>
          success(makePosition()),
        );
        mockFindClosestLocation.mockResolvedValueOnce({
          closestLocation: [1, 2, 0],
          closestIndex: 0,
          deviationDistance: 300,
        });

        await store.getState().spotMe();

        expect(store.getState().gps.isOffCourse).toBe(true);
        expect(store.getState().gps.deviationDistance).toBe(300);
      });

      it("should default deviationDistance to 0 when null is returned", async () => {
        mockGetCurrentPosition.mockImplementationOnce((success) =>
          success(makePosition()),
        );
        mockFindClosestLocation.mockResolvedValueOnce({
          closestLocation: [1, 2, 0],
          closestIndex: 0,
          deviationDistance: null,
        });

        await store.getState().spotMe();

        expect(store.getState().gps.isOffCourse).toBe(false);
        expect(store.getState().gps.deviationDistance).toBe(0);
      });

      it("should not update projectedLocation when GPX not loaded (null returned)", async () => {
        mockGetCurrentPosition.mockImplementationOnce((success) =>
          success(makePosition()),
        );
        mockFindClosestLocation.mockResolvedValueOnce(null);

        await store.getState().spotMe();

        expect(store.getState().gps.location).toEqual({
          coords: [1, 2, 0],
          date: 999,
        });
        expect(store.getState().gps.projectedLocation).toEqual({
          timestamp: 0,
          coords: [],
          index: null,
        });
        expect(store.getState().gps.isOffCourse).toBeFalsy();
      });

      it("should transition isOffCourse across consecutive spotMe calls", async () => {
        // On-course
        mockGetCurrentPosition.mockImplementationOnce((success) =>
          success(makePosition(1, 2, 1000)),
        );
        mockFindClosestLocation.mockResolvedValueOnce({
          closestLocation: [1, 2, 0],
          closestIndex: 0,
          deviationDistance: 50,
        });
        await store.getState().spotMe();
        expect(store.getState().gps.isOffCourse).toBe(false);

        // Off-course
        mockGetCurrentPosition.mockImplementationOnce((success) =>
          success(makePosition(1.1, 2.1, 2000)),
        );
        mockFindClosestLocation.mockResolvedValueOnce({
          closestLocation: [1, 2, 0],
          closestIndex: 0,
          deviationDistance: 150,
        });
        await store.getState().spotMe();
        expect(store.getState().gps.isOffCourse).toBe(true);

        // Back on-course
        mockGetCurrentPosition.mockImplementationOnce((success) =>
          success(makePosition(1, 2, 3000)),
        );
        mockFindClosestLocation.mockResolvedValueOnce({
          closestLocation: [1, 2, 0],
          closestIndex: 0,
          deviationDistance: 30,
        });
        await store.getState().spotMe();
        expect(store.getState().gps.isOffCourse).toBe(false);
      });
    });
  });

  describe("shareLocation", () => {
    let mockShare;
    let mockClipboard;

    beforeEach(() => {
      mockShare = vi.fn();
      mockClipboard = {
        writeText: vi.fn().mockResolvedValue(undefined),
      };

      // Set up initial location and raceId
      store.setState({
        app: { ...store.getState().app, raceId: "test-race-2026" },
        gps: {
          ...store.getState().gps,
          projectedLocation: {
            timestamp: 123,
            coords: [45.5, -122.7, 100],
            index: 0,
          },
        },
      });
    });

    it("should do nothing when raceId is not set", async () => {
      Object.defineProperty(navigator, "share", {
        value: mockShare.mockResolvedValue(undefined),
        writable: true,
        configurable: true,
      });

      store.setState({ app: { ...store.getState().app, raceId: null } });

      await store.getState().shareLocation();

      expect(mockShare).not.toHaveBeenCalled();
      expect(store.getState().setLiveSessionId).not.toHaveBeenCalled();
    });

    it("should use navigator.share when available", async () => {
      Object.defineProperty(navigator, "share", {
        value: mockShare.mockResolvedValue(undefined),
        writable: true,
        configurable: true,
      });

      await store.getState().shareLocation();

      expect(mockShare).toHaveBeenCalledWith({
        title: "Follow my run",
        url: expect.stringMatching(/\/follow\/test-race-2026\/[a-f0-9]{16}$/),
      });
      expect(store.getState().setLiveSessionId).toHaveBeenCalled();
    });

    it("should handle user canceling share (AbortError)", async () => {
      const abortError = new Error("User cancelled");
      abortError.name = "AbortError";

      Object.defineProperty(navigator, "share", {
        value: mockShare.mockRejectedValue(abortError),
        writable: true,
        configurable: true,
      });

      await expect(store.getState().shareLocation()).resolves.not.toThrow();
      expect(mockShare).toHaveBeenCalled();
    });

    it("should fall back to clipboard when navigator.share is not available", async () => {
      Object.defineProperty(navigator, "share", {
        value: undefined,
        writable: true,
        configurable: true,
      });

      Object.defineProperty(navigator, "clipboard", {
        value: mockClipboard,
        writable: true,
        configurable: true,
      });

      await store.getState().shareLocation();

      expect(mockClipboard.writeText).toHaveBeenCalledWith(expect.any(String));
      expect(store.getState().setLiveSessionId).toHaveBeenCalled();
    });

    it("should share session ID even without location", async () => {
      store.setState({
        gps: {
          ...store.getState().gps,
          projectedLocation: { timestamp: 0, coords: [], index: null },
        },
      });

      Object.defineProperty(navigator, "share", {
        value: mockShare.mockResolvedValue(undefined),
        writable: true,
        configurable: true,
      });

      await store.getState().shareLocation();

      expect(mockShare).toHaveBeenCalledWith({
        title: "Follow my run",
        url: expect.stringMatching(/\/follow\/test-race-2026\/[a-f0-9]{16}$/),
      });
    });

    it("should handle clipboard error gracefully", async () => {
      Object.defineProperty(navigator, "share", {
        value: undefined,
        writable: true,
        configurable: true,
      });

      Object.defineProperty(navigator, "clipboard", {
        value: {
          writeText: vi.fn().mockRejectedValue(new Error("Clipboard denied")),
        },
        writable: true,
        configurable: true,
      });

      await expect(store.getState().shareLocation()).resolves.not.toThrow();
    });
  });

  describe("broadcastPaceSettings", () => {
    beforeEach(() => {
      store.setState({
        app: {
          ...store.getState().app,
          mode: "trailer",
          liveSessionId: "session-1",
          liveWriteKey: "write-key-1",
        },
        gps: {
          ...store.getState().gps,
          projectedLocation: {
            timestamp: 123,
            coords: [45.5, -122.7, 100],
            index: 4,
          },
        },
      });
    });

    it("does nothing when there is no active trailer session", async () => {
      store.setState({ app: { ...store.getState().app, liveSessionId: null } });
      const countBefore = PartySocket.instances.length;
      await store.getState().broadcastPaceSettings();
      expect(PartySocket.instances.length).toBe(countBefore);
    });

    it("does nothing when not in trailer mode", async () => {
      store.setState({ app: { ...store.getState().app, mode: null } });
      const countBefore = PartySocket.instances.length;
      await store.getState().broadcastPaceSettings();
      expect(PartySocket.instances.length).toBe(countBefore);
    });

    it("does nothing when the runner hasn't broadcast a fix yet", async () => {
      store.setState({
        gps: {
          ...store.getState().gps,
          projectedLocation: { timestamp: 0, coords: [], index: null },
        },
      });
      const countBefore = PartySocket.instances.length;
      await store.getState().broadcastPaceSettings();
      expect(PartySocket.instances.length).toBe(countBefore);
    });

    it("re-sends the last known fix with the current pace settings", async () => {
      await store.getState().broadcastPaceSettings();

      const socket = PartySocket.instances.at(-1);
      expect(socket.send).toHaveBeenCalledTimes(1);
      const sent = JSON.parse(socket.send.mock.calls[0][0]);
      expect(sent).toMatchObject({
        type: "location",
        coords: [45.5, -122.7, 100],
        paceSettings: {
          basePaceSPerKm: 500,
          kFatigue: 0.002,
          lifeBaseStopS: 3600,
        },
        writeKey: "write-key-1",
      });
    });
  });

  describe("connectToFollowerSession — pace settings sync", () => {
    const runnerPaceSettings = {
      basePaceSPerKm: 420,
      kFatigue: 0.003,
      lifeBaseStopS: 1800,
    };

    const dispatchLocation = (paceSettings) => {
      const socket = PartySocket.instances.at(-1);
      socket.dispatch("message", {
        data: JSON.stringify({
          type: "location",
          timestamp: 123,
          coords: [45.5, -122.7, 100],
          index: 4,
          paceSettings,
        }),
      });
    };

    it("applies the runner's pace settings on first sync", async () => {
      await store.getState().connectToFollowerSession("room-1");

      dispatchLocation(runnerPaceSettings);

      expect(store.getState().setPaceSettings).toHaveBeenCalledWith(
        runnerPaceSettings,
      );
      expect(store.getState().reprocessGPXFile).toHaveBeenCalled();
      expect(store.getState().app.paceSettings).toEqual(runnerPaceSettings);
    });

    it("syncs a life-base-stop-only change even when pace and fatigue are unchanged", async () => {
      await store.getState().connectToFollowerSession("room-1");
      dispatchLocation(runnerPaceSettings);
      store.getState().setPaceSettings.mockClear();
      store.getState().reprocessGPXFile.mockClear();

      dispatchLocation({ ...runnerPaceSettings, lifeBaseStopS: 7200 });

      expect(store.getState().setPaceSettings).toHaveBeenCalledWith({
        ...runnerPaceSettings,
        lifeBaseStopS: 7200,
      });
      expect(store.getState().reprocessGPXFile).toHaveBeenCalled();
      expect(store.getState().app.paceSettings.lifeBaseStopS).toBe(7200);
    });

    it("skips the sync when pace settings are unchanged", async () => {
      await store.getState().connectToFollowerSession("room-1");
      dispatchLocation(runnerPaceSettings);
      store.getState().setPaceSettings.mockClear();
      store.getState().reprocessGPXFile.mockClear();

      dispatchLocation({ ...runnerPaceSettings });

      expect(store.getState().setPaceSettings).not.toHaveBeenCalled();
      expect(store.getState().reprocessGPXFile).not.toHaveBeenCalled();
    });

    it("ignores out-of-range pace settings", async () => {
      await store.getState().connectToFollowerSession("room-1");

      dispatchLocation({ ...runnerPaceSettings, basePaceSPerKm: 999_999 });

      expect(store.getState().setPaceSettings).not.toHaveBeenCalled();
    });
  });

  describe("connectToFollowerSession — connection status toasts", () => {
    it("does not toast on the initial connect", async () => {
      await store.getState().connectToFollowerSession("room-1");
      const socket = PartySocket.instances.at(-1);

      socket.dispatch("open", {});

      expect(showToast).not.toHaveBeenCalled();
    });

    it("does not toast a drop that happens before ever connecting", async () => {
      await store.getState().connectToFollowerSession("room-1");
      const socket = PartySocket.instances.at(-1);

      socket.dispatch("close", {});

      expect(showToast).not.toHaveBeenCalled();
    });

    it("toasts a connection drop only after having been connected", async () => {
      await store.getState().connectToFollowerSession("room-1");
      const socket = PartySocket.instances.at(-1);
      socket.dispatch("open", {});

      socket.dispatch("close", {});

      expect(showToast).toHaveBeenCalledWith("Connection lost. Reconnecting…", {
        type: "error",
      });
      expect(store.getState().gps.followerConnectionStatus).toBe(
        "disconnected",
      );
    });

    it("does not double-toast when error and close both fire for the same drop", async () => {
      await store.getState().connectToFollowerSession("room-1");
      const socket = PartySocket.instances.at(-1);
      socket.dispatch("open", {});

      socket.dispatch("error", {});
      socket.dispatch("close", {});

      expect(showToast).toHaveBeenCalledTimes(1);
    });

    it("toasts reconnection after a drop", async () => {
      await store.getState().connectToFollowerSession("room-1");
      const socket = PartySocket.instances.at(-1);
      socket.dispatch("open", {});
      socket.dispatch("close", {});
      showToast.mockClear();

      socket.dispatch("open", {});

      expect(showToast).toHaveBeenCalledWith("Back online", {
        type: "success",
      });
    });

    it("does not toast after an intentional disconnectFollowerSession", async () => {
      await store.getState().connectToFollowerSession("room-1");
      const socket = PartySocket.instances.at(-1);
      socket.dispatch("open", {});

      store.getState().disconnectFollowerSession();
      showToast.mockClear();
      socket.dispatch("close", {});

      expect(showToast).not.toHaveBeenCalled();
    });
  });
});
