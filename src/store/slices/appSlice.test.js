import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { create } from "zustand";
import { createAppSlice } from "./appSlice";

// Mock createRingBuffer
vi.mock("../../helpers/createRingBuffer", () => ({
  default: vi.fn((capacity, initialData = []) => {
    const buffer = [...initialData];
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

describe("appSlice", () => {
  let store;

  beforeEach(() => {
    // Create a test store with only the appSlice
    store = create((set, get) => ({
      ...createAppSlice(set, get),
    }));

    // Mock geolocation API
    global.navigator.geolocation = {
      getCurrentPosition: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("should have correct initial state", () => {
      const state = store.getState();

      expect(state.app.trackingMode).toBe(false);
      expect(state.app.displaySlopes).toBe(false);
      expect(state.app.currentPositionIndex).toEqual({ index: 0, date: 0 });
      expect(state.app.currentLocation).toBeNull();
      expect(state.app.currentClosestLocation).toBeNull();
      expect(state.app.startingDate).toBe(0);
      expect(state.app.locations).toEqual([]);
    });
  });

  describe("toggleTrackingMode", () => {
    it("should toggle tracking mode from false to true", () => {
      const { toggleTrackingMode, app } = store.getState();

      expect(app.trackingMode).toBe(false);

      toggleTrackingMode();

      expect(store.getState().app.trackingMode).toBe(true);
    });

    it("should toggle tracking mode from true to false", () => {
      const { toggleTrackingMode } = store.getState();

      toggleTrackingMode(); // true
      toggleTrackingMode(); // false

      expect(store.getState().app.trackingMode).toBe(false);
    });
  });

  describe("toggleSlopesMode", () => {
    it("should toggle slopes mode", () => {
      const { toggleSlopesMode } = store.getState();

      expect(store.getState().app.displaySlopes).toBe(false);

      toggleSlopesMode();
      expect(store.getState().app.displaySlopes).toBe(true);

      toggleSlopesMode();
      expect(store.getState().app.displaySlopes).toBe(false);
    });
  });

  describe("setCurrentPositionIndex", () => {
    it("should update current position index", () => {
      const { setCurrentPositionIndex } = store.getState();
      const newPosition = { index: 5, date: 1234567890 };

      setCurrentPositionIndex(newPosition);

      expect(store.getState().app.currentPositionIndex).toEqual(newPosition);
    });
  });

  describe("setStartingDate", () => {
    it("should set starting date", () => {
      const { setStartingDate } = store.getState();
      const timestamp = 1698624000000;

      setStartingDate(timestamp);

      expect(store.getState().app.startingDate).toBe(timestamp);
    });
  });

  describe("getCurrentLocation", () => {
    it("should get current location successfully", async () => {
      const mockPosition = {
        coords: {
          longitude: -122.4194,
          latitude: 37.7749,
        },
        timestamp: 1698624000000,
      };

      global.navigator.geolocation.getCurrentPosition.mockImplementation(
        (success) => success(mockPosition),
      );

      const { getCurrentLocation } = store.getState();

      await getCurrentLocation();

      const state = store.getState();
      expect(state.app.currentLocation).toBeDefined();
      expect(state.app.currentLocation.coords).toEqual([-122.4194, 37.7749, 0]);
      expect(state.app.currentLocation.date).toBe(1698624000000);
    });

    it("should set loading state during fetch", async () => {
      let loadingDuringFetch = false;

      global.navigator.geolocation.getCurrentPosition.mockImplementation(
        (success) => {
          // Check loading state while geolocation is in progress
          loadingDuringFetch = store.getState().app.loading === true;
          success({
            coords: { longitude: 0, latitude: 0 },
            timestamp: Date.now(),
          });
        },
      );

      const { getCurrentLocation } = store.getState();
      await getCurrentLocation();

      expect(loadingDuringFetch).toBe(true);
      expect(store.getState().app.loading).toBe(false);
    });

    it("should handle geolocation errors", async () => {
      const mockError = new Error("Location permission denied");

      global.navigator.geolocation.getCurrentPosition.mockImplementation(
        (success, error) => error(mockError),
      );

      const { getCurrentLocation } = store.getState();

      await getCurrentLocation();

      const state = store.getState();
      expect(state.app.error).toBe("Location permission denied");
      expect(state.app.loading).toBe(false);
    });

    it("should add location to buffer and update locations array", async () => {
      const mockPosition = {
        coords: { longitude: 1, latitude: 2 },
        timestamp: 1000,
      };

      global.navigator.geolocation.getCurrentPosition.mockImplementation(
        (success) => success(mockPosition),
      );

      const { getCurrentLocation } = store.getState();
      await getCurrentLocation();

      const state = store.getState();
      expect(state.app.locations.length).toBeGreaterThan(0);
    });
  });

  describe("getLocationHistory", () => {
    it("should return location history from buffer", () => {
      const { getLocationHistory } = store.getState();

      const history = getLocationHistory();

      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe("getLocationBufferInfo", () => {
    it("should return buffer information", () => {
      const { getLocationBufferInfo } = store.getState();

      const info = getLocationBufferInfo();

      expect(info).toBeDefined();
      expect(info.count).toBeDefined();
      expect(info.isFull).toBeDefined();
      expect(info.isEmpty).toBeDefined();
      expect(typeof info.count).toBe("number");
      expect(typeof info.isFull).toBe("boolean");
      expect(typeof info.isEmpty).toBe("boolean");
    });
  });

  describe("selectors", () => {
    it("should get starting date", () => {
      const { setStartingDate, getStartingDate } = store.getState();
      const timestamp = 1698624000000;

      setStartingDate(timestamp);

      expect(getStartingDate()).toBe(timestamp);
    });

    it("should get tracking mode", () => {
      const { toggleTrackingMode, getTrackingMode } = store.getState();

      expect(getTrackingMode()).toBe(false);

      toggleTrackingMode();

      expect(getTrackingMode()).toBe(true);
    });

    it("should get display slopes", () => {
      const { toggleSlopesMode, getDisplaySlopes } = store.getState();

      expect(getDisplaySlopes()).toBe(false);

      toggleSlopesMode();

      expect(getDisplaySlopes()).toBe(true);
    });

    it("should get current position index", () => {
      const { setCurrentPositionIndex, getCurrentPositionIndex } =
        store.getState();
      const position = { index: 10, date: 5000 };

      setCurrentPositionIndex(position);

      expect(getCurrentPositionIndex()).toEqual(position);
    });
  });

  describe("initLocationBuffer", () => {
    it("should initialize buffer from persisted locations", () => {
      // Simulate persisted state
      store.setState({
        app: {
          ...store.getState().app,
          locations: [
            { coords: [1, 2, 0], date: 1000 },
            { coords: [3, 4, 0], date: 2000 },
          ],
        },
      });

      const { initLocationBuffer } = store.getState();
      initLocationBuffer();

      // Buffer should be initialized, subsequent operations should work
      const { getLocationHistory } = store.getState();
      const history = getLocationHistory();

      expect(history).toBeDefined();
    });

    it("should handle empty locations array", () => {
      const { initLocationBuffer } = store.getState();

      // Should not throw when initializing with empty array
      expect(() => initLocationBuffer()).not.toThrow();
    });
  });

  describe("ensureBuffer behavior", () => {
    it("should initialize buffer lazily on first use", () => {
      const { getLocationHistory } = store.getState();

      // First call should initialize buffer
      const history1 = getLocationHistory();
      expect(Array.isArray(history1)).toBe(true);

      // Second call should reuse same buffer
      const history2 = getLocationHistory();
      expect(Array.isArray(history2)).toBe(true);
    });

    it("should use persisted locations when buffer is initialized lazily", () => {
      // Set some persisted locations
      store.setState({
        app: {
          ...store.getState().app,
          locations: [{ coords: [1, 2, 0], date: 1000 }],
        },
      });

      const { getLocationHistory } = store.getState();
      const history = getLocationHistory();

      // Should have loaded persisted location
      expect(history.length).toBeGreaterThan(0);
    });
  });

  describe("edge cases", () => {
    it("should handle multiple rapid getCurrentLocation calls", async () => {
      let callCount = 0;
      global.navigator.geolocation.getCurrentPosition.mockImplementation(
        (success) => {
          callCount++;
          success({
            coords: { longitude: callCount, latitude: callCount },
            timestamp: Date.now() + callCount,
          });
        },
      );

      const { getCurrentLocation } = store.getState();

      // Call multiple times
      await Promise.all([
        getCurrentLocation(),
        getCurrentLocation(),
        getCurrentLocation(),
      ]);

      // All should complete successfully
      expect(callCount).toBe(3);
    });

    it("should preserve other app state when updating", () => {
      const { setStartingDate, toggleTrackingMode } = store.getState();

      setStartingDate(123456);
      toggleTrackingMode();

      const { setCurrentPositionIndex } = store.getState();
      setCurrentPositionIndex({ index: 5, date: 789 });

      const state = store.getState().app;
      expect(state.startingDate).toBe(123456);
      expect(state.trackingMode).toBe(true);
      expect(state.currentPositionIndex).toEqual({ index: 5, date: 789 });
    });
  });
});
