import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { create } from "zustand";

import createRingBuffer from "../../helpers/createRingBuffer";
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

describe("GPS Slice", () => {
  let store;
  let mockFindClosestLocation;
  let mockGetCurrentPosition;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

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
        raceId: null,
        mode: null,
      },
      setLiveSessionId: vi.fn((id) => {
        set({ app: { ...get().app, liveSessionId: id } });
      }),
      setRaceId: vi.fn((id) => {
        set({ app: { ...get().app, raceId: id } });
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
        url: expect.stringMatching(/\/follow\/test-race-2026\/[A-Z0-9]{6}$/),
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
        url: expect.stringMatching(/\/follow\/test-race-2026\/[A-Z0-9]{6}$/),
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
});
