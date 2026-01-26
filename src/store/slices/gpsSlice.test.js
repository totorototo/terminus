import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { create } from "zustand";
import { createGPSSlice } from "./gpsSlice";
import createRingBuffer from "../../helpers/createRingBuffer";

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
  });
});
