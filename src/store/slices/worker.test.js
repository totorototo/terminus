import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { create } from "zustand";

import { createWorkerSlice } from "./worker";

// Mock Worker API at module level
let mockWorkerInstance = {
  postMessage: vi.fn(),
  terminate: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  onmessage: null,
  onerror: null,
};

global.Worker = vi.fn(function () {
  mockWorkerInstance = {
    postMessage: vi.fn(),
    terminate: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    onmessage: null,
    onerror: null,
  };
  return mockWorkerInstance;
});

describe("Worker Slice", () => {
  let store;

  beforeEach(() => {
    // Reset all Vitest mocks
    vi.clearAllMocks();

    // Create fresh store with all required slices mocked
    store = create((set, get) => ({
      // Mock dependent slices
      stats: {
        distance: 0,
        elevationGain: 0,
        elevationLoss: 0,
        pointCount: 0,
      },
      gpx: {
        data: [],
        slopes: [],
        peaks: [],
        metadata: {},
        cumulativeDistances: [],
        cumulativeElevations: [],
        cumulativeElevationLosses: [],
      },
      sections: [],
      waypoints: [],
      gps: {
        location: { timestamp: 0, coords: [] },
        projectedLocation: { timestamp: 0, coords: [], index: null },
        savedLocations: [],
      },

      // Mock store methods that worker slice calls
      setGpxData: (data) =>
        set(
          (state) => ({
            ...state,
            gpx: { ...state.gpx, data },
          }),
          undefined,
          "gpx/setGpxData",
        ),
      setSlopes: (slopes) =>
        set(
          (state) => ({
            ...state,
            gpx: { ...state.gpx, slopes },
          }),
          undefined,
          "gpx/setSlopes",
        ),
      setCumulativeDistances: (cumulativeDistances) =>
        set(
          (state) => ({
            ...state,
            gpx: { ...state.gpx, cumulativeDistances },
          }),
          undefined,
          "gpx/setCumulativeDistances",
        ),
      setCumulativeElevations: (cumulativeElevations) =>
        set(
          (state) => ({
            ...state,
            gpx: { ...state.gpx, cumulativeElevations },
          }),
          undefined,
          "gpx/setCumulativeElevations",
        ),
      setCumulativeElevationLosses: (cumulativeElevationLosses) =>
        set(
          (state) => ({
            ...state,
            gpx: { ...state.gpx, cumulativeElevationLosses },
          }),
          undefined,
          "gpx/setCumulativeElevationLosses",
        ),
      setMetadata: (metadata) =>
        set(
          (state) => ({
            ...state,
            gpx: {
              ...state.gpx,
              metadata: { ...state.gpx.metadata, ...metadata },
            },
          }),
          undefined,
          "gpx/setMetadata",
        ),
      setPeaks: (peaks) =>
        set(
          (state) => ({
            ...state,
            gpx: { ...state.gpx, peaks },
          }),
          undefined,
          "gpx/setPeaks",
        ),
      updateStats: (updates) =>
        set(
          (state) => ({
            ...state,
            stats: { ...state.stats, ...updates },
          }),
          undefined,
          "stats/updateStats",
        ),
      setSections: (sections) =>
        set(
          (state) => ({
            ...state,
            sections,
          }),
          undefined,
          "sections/setSections",
        ),

      // The actual slice under test, with injected worker factory (closure-local state)
      ...createWorkerSlice(set, get, () => mockWorkerInstance),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // CATEGORY 1: INITIALIZATION & WORKER LIFECYCLE
  // =========================================================================

  describe("Initial State", () => {
    it("should have correct initial state", () => {
      const state = store.getState().worker;

      expect(state.isReady).toBe(false);
      expect(state.processing).toBe(false);
      expect(state.progress).toBe(0);
      expect(state.progressMessage).toBe("");
      expect(state.errorMessage).toBe("");
    });
  });

  describe("initGPXWorker", () => {
    it("should create worker and set isReady to true", () => {
      store.getState().initGPXWorker();

      const state = store.getState().worker;
      expect(state.isReady).toBe(true);
      expect(state.errorMessage).toBe("");
      expect(mockWorkerInstance.onmessage).not.toBeNull();
    });

    it("should not create duplicate workers", () => {
      store.getState().initGPXWorker();
      const firstInstance = mockWorkerInstance;

      store.getState().initGPXWorker();
      const secondInstance = mockWorkerInstance;

      // initGPXWorker should return early if worker already exists
      expect(firstInstance).toBe(secondInstance);
    });

    it("should attach onmessage handler", () => {
      store.getState().initGPXWorker();

      expect(mockWorkerInstance.onmessage).not.toBeNull();
      expect(typeof mockWorkerInstance.onmessage).toBe("function");
    });

    it("should attach onerror handler", () => {
      store.getState().initGPXWorker();

      expect(mockWorkerInstance.onerror).not.toBeNull();
      expect(typeof mockWorkerInstance.onerror).toBe("function");
    });

    it("should handle worker creation error", () => {
      // Create a new store with a factory that throws
      const errorStore = create((set, get) => ({
        stats: {
          distance: 0,
          elevationGain: 0,
          elevationLoss: 0,
          pointCount: 0,
        },
        gpx: {
          data: [],
          slopes: [],
          peaks: [],
          metadata: {},
          cumulativeDistances: [],
          cumulativeElevations: [],
          cumulativeElevationLosses: [],
        },
        sections: [],
        waypoints: [],
        gps: {
          location: { timestamp: 0, coords: [] },
          projectedLocation: { timestamp: 0, coords: [], index: null },
          savedLocations: [],
        },
        setGpxData: (data) =>
          set(
            (state) => ({
              ...state,
              gpx: { ...state.gpx, data },
            }),
            undefined,
            "gpx/setGpxData",
          ),
        setSlopes: (slopes) =>
          set(
            (state) => ({
              ...state,
              gpx: { ...state.gpx, slopes },
            }),
            undefined,
            "gpx/setSlopes",
          ),
        setCumulativeDistances: (cumulativeDistances) =>
          set(
            (state) => ({
              ...state,
              gpx: { ...state.gpx, cumulativeDistances },
            }),
            undefined,
            "gpx/setCumulativeDistances",
          ),
        setCumulativeElevations: (cumulativeElevations) =>
          set(
            (state) => ({
              ...state,
              gpx: { ...state.gpx, cumulativeElevations },
            }),
            undefined,
            "gpx/setCumulativeElevations",
          ),
        setCumulativeElevationLosses: (cumulativeElevationLosses) =>
          set(
            (state) => ({
              ...state,
              gpx: { ...state.gpx, cumulativeElevationLosses },
            }),
            undefined,
            "gpx/setCumulativeElevationLosses",
          ),
        setMetadata: (metadata) =>
          set(
            (state) => ({
              ...state,
              gpx: {
                ...state.gpx,
                metadata: { ...state.gpx.metadata, ...metadata },
              },
            }),
            undefined,
            "gpx/setMetadata",
          ),
        setPeaks: (peaks) =>
          set(
            (state) => ({
              ...state,
              gpx: { ...state.gpx, peaks },
            }),
            undefined,
            "gpx/setPeaks",
          ),
        updateStats: (updates) =>
          set(
            (state) => ({ ...state, stats: { ...state.stats, ...updates } }),
            undefined,
            "stats/updateStats",
          ),
        setSections: (sections) =>
          set(
            (state) => ({
              ...state,
              sections,
            }),
            undefined,
            "sections/setSections",
          ),
        // Pass a factory that throws
        ...createWorkerSlice(set, get, () => {
          throw new Error("Worker creation failed");
        }),
      }));

      errorStore.getState().initGPXWorker();

      const state = errorStore.getState().worker;
      expect(state.isReady).toBe(false);
      expect(state.errorMessage).toBe("Failed to initialize worker");
    });
  });

  describe("terminateGPXWorker", () => {
    it("should terminate worker and reset state", () => {
      store.getState().initGPXWorker();
      store.getState().terminateGPXWorker();

      expect(mockWorkerInstance.terminate).toHaveBeenCalled();

      const state = store.getState().worker;
      expect(state.isReady).toBe(false);
      expect(state.processing).toBe(false);
      expect(state.progress).toBe(0);
      expect(state.progressMessage).toBe("");
    });

    it("should handle termination when no worker exists", () => {
      expect(() => store.getState().terminateGPXWorker()).not.toThrow();
      expect(store.getState().worker.isReady).toBe(false);
    });

    it("should reject all pending requests on termination", async () => {
      store.getState().initGPXWorker();

      // Start a processGPXFile operation (doesn't matter that it will fail)
      const processPromise = store
        .getState()
        .processGPXFile(new Uint8Array([1, 2, 3]))
        .catch((e) => e);

      // Allow request to be registered
      await new Promise((resolve) => setImmediate(resolve));

      // Terminate before worker responds - should reject the pending promise
      store.getState().terminateGPXWorker();

      const error = await processPromise;
      expect(error.message).toContain("Worker was terminated");
    });
  });

  describe("setWorkerState", () => {
    it("should update worker state", () => {
      store.getState().setWorkerState({ errorMessage: "Test error" });

      expect(store.getState().worker.errorMessage).toBe("Test error");
    });

    it("should merge with existing state", () => {
      store.getState().setWorkerState({ progress: 50 });
      store.getState().setWorkerState({ progressMessage: "Loading..." });

      const state = store.getState().worker;
      expect(state.progress).toBe(50);
      expect(state.progressMessage).toBe("Loading...");
    });
  });

  describe("clearError", () => {
    it("should clear error message", () => {
      store.getState().setWorkerState({ errorMessage: "Some error" });
      store.getState().clearError();

      expect(store.getState().worker.errorMessage).toBe("");
    });

    it("should preserve other state when clearing error", () => {
      store.getState().setWorkerState({
        errorMessage: "Error",
        progress: 50,
      });

      store.getState().clearError();

      expect(store.getState().worker.progress).toBe(50);
      expect(store.getState().worker.errorMessage).toBe("");
    });
  });

  // =========================================================================
  // NOTE: Low-level message handling tests (message sending, timeouts,
  // progress tracking, concurrent requests) are now in workerMessenger.test.js
  // This file focuses on worker slice integration and high-level methods.
  // =========================================================================

  // =========================================================================
  // CATEGORY 2: HIGH-LEVEL METHODS (processGPXFile, etc.)
  // =========================================================================

  describe("processGPXFile", () => {
    beforeEach(() => {
      store.getState().initGPXWorker();
    });

    it("should send GPX file and validate results", async () => {
      const gpxData = new ArrayBuffer(100);
      const validResults = {
        trace: {
          points: [[1, 2, 3]],
          peaks: [],
          slopes: [],
          cumulativeDistances: [],
          cumulativeElevations: [],
          cumulativeElevationLoss: [],
          totalDistance: 100,
          totalElevation: 50,
          totalElevationLoss: 20,
        },
        sections: [],
        waypoints: [],
        metadata: { name: "test.gpx" },
      };

      const processPromise = store.getState().processGPXFile(gpxData);

      await new Promise((resolve) => setImmediate(resolve));

      const message = mockWorkerInstance.postMessage.mock.calls[0][0];

      expect(message.type).toBe("PROCESS_GPX_FILE");
      expect(message.data.gpxBytes).toBe(gpxData);

      mockWorkerInstance.onmessage({
        data: {
          type: "GPX_FILE_PROCESSED",
          id: message.id,
          results: validResults,
        },
      });

      const result = await processPromise;

      expect(result).toEqual(validResults);
    });

    it("should update stats from GPX results", async () => {
      const gpxData = new ArrayBuffer(100);
      const validResults = {
        trace: {
          points: [[1, 2, 3]],
          peaks: [],
          slopes: [],
          cumulativeDistances: [],
          cumulativeElevations: [],
          cumulativeElevationLoss: [],
          totalDistance: 250.5,
          totalElevation: 125.3,
          totalElevationLoss: 87.2,
        },
        sections: [],
        waypoints: [],
        metadata: {},
      };

      const processPromise = store.getState().processGPXFile(gpxData);

      await new Promise((resolve) => setImmediate(resolve));

      const message = mockWorkerInstance.postMessage.mock.calls[0][0];

      mockWorkerInstance.onmessage({
        data: {
          type: "GPX_FILE_PROCESSED",
          id: message.id,
          results: validResults,
        },
      });

      await processPromise;

      expect(store.getState().stats.distance).toBe(250.5);
      expect(store.getState().stats.elevationGain).toBe(125.3);
      expect(store.getState().stats.elevationLoss).toBe(87.2);
    });

    it("should update GPX state slice on success", async () => {
      const gpxData = new ArrayBuffer(100);
      const pointData = [
        [1, 2, 3],
        [4, 5, 6],
      ];
      const validResults = {
        trace: {
          points: pointData,
          peaks: [[2, 3, 4]],
          slopes: [1.5, 2.5],
          cumulativeDistances: [0, 100],
          cumulativeElevations: [0, 50],
          cumulativeElevationLoss: [0, 20],
          totalDistance: 100,
          totalElevation: 50,
          totalElevationLoss: 20,
        },
        sections: [{ id: 1 }],
        waypoints: [{ id: 1 }],
        metadata: { name: "test" },
      };

      const processPromise = store.getState().processGPXFile(gpxData);

      await new Promise((resolve) => setImmediate(resolve));

      const message = mockWorkerInstance.postMessage.mock.calls[0][0];

      mockWorkerInstance.onmessage({
        data: {
          type: "GPX_FILE_PROCESSED",
          id: message.id,
          results: validResults,
        },
      });

      await processPromise;

      expect(store.getState().gpx.data).toEqual(pointData);
      expect(store.getState().gpx.peaks).toEqual(validResults.trace.peaks);
      expect(store.getState().sections).toEqual(validResults.sections);
      expect(store.getState().waypoints).toEqual(validResults.waypoints);
    });

    it("should call onProgress callback if provided", async () => {
      const gpxData = new ArrayBuffer(100);
      const onProgress = vi.fn();

      const processPromise = store
        .getState()
        .processGPXFile(gpxData, onProgress);

      await new Promise((resolve) => setImmediate(resolve));

      const message = mockWorkerInstance.postMessage.mock.calls[0][0];

      mockWorkerInstance.onmessage({
        data: {
          type: "PROGRESS",
          id: message.id,
          progress: 25,
          message: "Parsing GPX...",
        },
      });

      expect(onProgress).toHaveBeenCalledWith(25, "Parsing GPX...");

      mockWorkerInstance.onmessage({
        data: {
          type: "GPX_FILE_PROCESSED",
          id: message.id,
          results: {
            trace: {
              points: [],
              peaks: [],
              slopes: [],
              cumulativeDistances: [],
              cumulativeElevations: [],
              cumulativeElevationLoss: [],
              totalDistance: 100,
              totalElevation: 50,
              totalElevationLoss: 20,
            },
            sections: [],
            waypoints: [],
            metadata: {},
          },
        },
      });

      await processPromise;
    });

    it("should handle validation error", async () => {
      const gpxData = new ArrayBuffer(100);
      const invalidResults = {
        trace: {
          points: "not an array", // Invalid
          peaks: [],
          slopes: [],
          cumulativeDistances: [],
          cumulativeElevations: [],
          cumulativeElevationLoss: [],
          totalDistance: 100,
          totalElevation: 50,
          totalElevationLoss: 20,
        },
        sections: [],
        waypoints: [],
        metadata: {},
      };

      const processPromise = store.getState().processGPXFile(gpxData);

      await new Promise((resolve) => setImmediate(resolve));

      const message = mockWorkerInstance.postMessage.mock.calls[0][0];

      mockWorkerInstance.onmessage({
        data: {
          type: "GPX_FILE_PROCESSED",
          id: message.id,
          results: invalidResults,
        },
      });

      await expect(processPromise).rejects.toThrow(
        "Expected trace.points to be an array",
      );

      expect(store.getState().worker.errorMessage).toContain("Expected");
    });

    it("should set error state on worker error", async () => {
      const gpxData = new ArrayBuffer(100);

      const processPromise = store.getState().processGPXFile(gpxData);

      await new Promise((resolve) => setImmediate(resolve));

      const message = mockWorkerInstance.postMessage.mock.calls[0][0];

      mockWorkerInstance.onmessage({
        data: {
          type: "ERROR",
          id: message.id,
          error: "GPX file corrupted",
        },
      });

      await expect(processPromise).rejects.toThrow();
      expect(store.getState().worker.errorMessage).toBe("GPX file corrupted");
    });

    it("should handle null results gracefully", async () => {
      const gpxData = new ArrayBuffer(100);

      const processPromise = store.getState().processGPXFile(gpxData);

      await new Promise((resolve) => setImmediate(resolve));

      const message = mockWorkerInstance.postMessage.mock.calls[0][0];

      mockWorkerInstance.onmessage({
        data: {
          type: "ERROR",
          id: message.id,
          error: "No results returned from worker",
        },
      });

      await expect(processPromise).rejects.toThrow();
    });
  });

  describe("processGPSData", () => {
    beforeEach(() => {
      store.getState().initGPXWorker();
    });

    it("should process GPS data and update state", async () => {
      const coordinates = [
        [1, 2, 3],
        [4, 5, 6],
      ];
      const results = {
        points: coordinates,
        slopes: [1.5, 2.5],
        cumulativeDistances: [0, 100],
        cumulativeElevations: [0, 50],
        cumulativeElevationLoss: [0, 20],
        totalDistance: 100,
        totalElevation: 50,
        totalElevationLoss: 20,
        pointCount: 2,
      };

      const processPromise = store
        .getState()
        .processGPSData(coordinates, undefined);

      const message = mockWorkerInstance.postMessage.mock.calls[0][0];

      mockWorkerInstance.onmessage({
        data: {
          type: "GPS_DATA_PROCESSED",
          id: message.id,
          results,
        },
      });

      await processPromise;

      expect(store.getState().stats.distance).toBe(100);
      expect(store.getState().stats.pointCount).toBe(2);
    });

    it("should support onProgress callback during GPS data processing", async () => {
      const onProgress = vi.fn();
      const coordinates = [[1, 2, 3]];

      const processPromise = store
        .getState()
        .processGPSData(coordinates, onProgress);

      await new Promise((resolve) => setImmediate(resolve));

      const message = mockWorkerInstance.postMessage.mock.calls[0][0];

      mockWorkerInstance.onmessage({
        data: {
          type: "PROGRESS",
          id: message.id,
          progress: 75,
          message: "Processing GPS coordinates",
        },
      });

      expect(onProgress).toHaveBeenCalledWith(75, "Processing GPS coordinates");

      mockWorkerInstance.onmessage({
        data: {
          type: "GPS_DATA_PROCESSED",
          id: message.id,
          results: {
            points: coordinates,
            slopes: [1.5],
            cumulativeDistances: [0],
            cumulativeElevations: [0],
            cumulativeElevationLoss: [0],
            totalDistance: 50,
            totalElevation: 25,
            totalElevationLoss: 10,
            pointCount: 1,
          },
        },
      });

      await processPromise;
    });

    it("should handle validation error for GPS data results", async () => {
      const coordinates = [[1, 2, 3]];
      const invalidResults = {
        points: "not an array", // Invalid
        slopes: [1.5],
        cumulativeDistances: [0],
        cumulativeElevations: [0],
        cumulativeElevationLoss: [0],
        totalDistance: 50,
        totalElevation: 25,
        totalElevationLoss: 10,
        pointCount: 1,
      };

      const processPromise = store
        .getState()
        .processGPSData(coordinates, undefined);

      await new Promise((resolve) => setImmediate(resolve));

      const message = mockWorkerInstance.postMessage.mock.calls[0][0];

      mockWorkerInstance.onmessage({
        data: {
          type: "GPS_DATA_PROCESSED",
          id: message.id,
          results: invalidResults,
        },
      });

      await expect(processPromise).rejects.toThrow(
        "Expected results.points to be an array",
      );
      expect(store.getState().worker.errorMessage).toContain("Expected");
      expect(store.getState().worker.processing).toBe(false);
    });

    it("should handle worker error during GPS data processing", async () => {
      const processPromise = store
        .getState()
        .processGPSData([[1, 2, 3]], undefined);

      await new Promise((resolve) => setImmediate(resolve));

      const message = mockWorkerInstance.postMessage.mock.calls[0][0];

      mockWorkerInstance.onmessage({
        data: {
          type: "ERROR",
          id: message.id,
          error: "Failed to process GPS coordinates",
        },
      });

      await expect(processPromise).rejects.toThrow();
      expect(store.getState().worker.errorMessage).toBe(
        "Failed to process GPS coordinates",
      );
      expect(store.getState().worker.processing).toBe(false);
    });

    it("should clear error message on successful GPS data processing", async () => {
      store.getState().setWorkerState({ errorMessage: "Previous GPS error" });

      const coordinates = [[1, 2, 3]];
      const processPromise = store
        .getState()
        .processGPSData(coordinates, undefined);

      await new Promise((resolve) => setImmediate(resolve));

      const message = mockWorkerInstance.postMessage.mock.calls[0][0];

      mockWorkerInstance.onmessage({
        data: {
          type: "GPS_DATA_PROCESSED",
          id: message.id,
          results: {
            points: coordinates,
            slopes: [1.5],
            cumulativeDistances: [0],
            cumulativeElevations: [0],
            cumulativeElevationLoss: [0],
            totalDistance: 50,
            totalElevation: 25,
            totalElevationLoss: 10,
            pointCount: 1,
          },
        },
      });

      await processPromise;

      expect(store.getState().worker.errorMessage).toBe("");
    });
  });

  describe("findClosestLocation", () => {
    beforeEach(() => {
      store.getState().initGPXWorker();
    });

    it("should handle missing GPS location", async () => {
      store.setState({
        gps: {
          location: { timestamp: 0, coords: [] },
          projectedLocation: { timestamp: 0, coords: [], index: null },
          savedLocations: [],
        },
      });

      const result = await store.getState().findClosestLocation();

      expect(result).toBeNull();
      expect(store.getState().worker.errorMessage).toContain(
        "No location or GPS data available",
      );
    });

    it("should send current location to worker", async () => {
      store.setState({
        gps: {
          location: { timestamp: 1000, coords: [10, 20, 300] },
          projectedLocation: { timestamp: 0, coords: [], index: null },
          savedLocations: [],
        },
        gpx: {
          ...store.getState().gpx,
          data: [
            [1, 2, 3],
            [4, 5, 6],
          ],
        },
      });

      const findPromise = store.getState().findClosestLocation();

      await new Promise((resolve) => setImmediate(resolve));

      const message = mockWorkerInstance.postMessage.mock.calls[0][0];

      expect(message.type).toBe("FIND_CLOSEST_LOCATION");
      expect(message.data.target).toEqual([10, 20, 300]);
      expect(message.data.coordinates).toEqual([
        [1, 2, 3],
        [4, 5, 6],
      ]);

      mockWorkerInstance.onmessage({
        data: {
          type: "CLOSEST_POINT_FOUND",
          id: message.id,
          results: {
            closestLocation: [1.5, 2.5, 4.5],
            closestIndex: 0,
          },
        },
      });

      const result = await findPromise;
      expect(result.closestLocation).toEqual([1.5, 2.5, 4.5]);
    });
  });

  // =========================================================================
  // CATEGORY 3: processSections
  // =========================================================================

  describe("processSections", () => {
    beforeEach(() => {
      store.getState().initGPXWorker();
    });

    it("should process sections and update state", async () => {
      const coordinates = [
        [1, 2, 3],
        [4, 5, 6],
      ];
      const sections = [{ id: 1 }, { id: 2 }];
      const results = [
        { id: 1, totalDistance: 100 },
        { id: 2, totalDistance: 50 },
      ];
      results.totalDistance = 150;
      results.totalElevationGain = 75;
      results.totalElevationLoss = 50;
      results.pointCount = 2;

      const processPromise = store
        .getState()
        .processSections(coordinates, sections);

      await new Promise((resolve) => setImmediate(resolve));

      const message = mockWorkerInstance.postMessage.mock.calls[0][0];

      expect(message.type).toBe("PROCESS_SECTIONS");
      expect(message.data.coordinates).toEqual(coordinates);
      expect(message.data.sections).toEqual(sections);

      mockWorkerInstance.onmessage({
        data: {
          type: "SECTIONS_PROCESSED",
          id: message.id,
          results,
        },
      });

      await processPromise;

      expect(store.getState().stats.distance).toBe(150);
      expect(store.getState().stats.elevationGain).toBe(75);
      expect(store.getState().stats.elevationLoss).toBe(50);
      expect(store.getState().stats.pointCount).toBe(2);
    });

    it("should support onProgress callback", async () => {
      const onProgress = vi.fn();
      const coordinates = [[1, 2, 3]];
      const sections = [];

      const processPromise = store
        .getState()
        .processSections(coordinates, sections, onProgress);

      await new Promise((resolve) => setImmediate(resolve));

      const message = mockWorkerInstance.postMessage.mock.calls[0][0];

      mockWorkerInstance.onmessage({
        data: {
          type: "PROGRESS",
          id: message.id,
          progress: 50,
          message: "Processing sections",
        },
      });

      expect(onProgress).toHaveBeenCalledWith(50, "Processing sections");

      const resultsArray = [{ id: 1 }];
      resultsArray.totalDistance = 100;
      resultsArray.totalElevationGain = 50;
      resultsArray.totalElevationLoss = 30;
      resultsArray.pointCount = 1;

      mockWorkerInstance.onmessage({
        data: {
          type: "SECTIONS_PROCESSED",
          id: message.id,
          results: resultsArray,
        },
      });

      await processPromise;
    });

    it("should handle validation error for sections", async () => {
      const coordinates = [[1, 2, 3]];
      const sections = [];
      const invalidResults = {
        totalDistance: "not a number",
        totalElevationGain: 50,
        totalElevationLoss: 30,
        pointCount: 1,
      };

      const processPromise = store
        .getState()
        .processSections(coordinates, sections);

      await new Promise((resolve) => setImmediate(resolve));

      const message = mockWorkerInstance.postMessage.mock.calls[0][0];

      mockWorkerInstance.onmessage({
        data: {
          type: "SECTIONS_PROCESSED",
          id: message.id,
          results: invalidResults,
        },
      });

      await expect(processPromise).rejects.toThrow();
      expect(store.getState().worker.errorMessage).toBeTruthy();
    });

    it("should handle worker error during sections processing", async () => {
      const processPromise = store.getState().processSections([[1, 2, 3]], []);

      await new Promise((resolve) => setImmediate(resolve));

      const message = mockWorkerInstance.postMessage.mock.calls[0][0];

      mockWorkerInstance.onmessage({
        data: {
          type: "ERROR",
          id: message.id,
          error: "Failed to process sections",
        },
      });

      await expect(processPromise).rejects.toThrow();
      expect(store.getState().worker.errorMessage).toBe(
        "Failed to process sections",
      );
      expect(store.getState().worker.processing).toBe(false);
    });
  });

  // =========================================================================
  // CATEGORY 8: calculateRouteStats
  // =========================================================================

  describe("calculateRouteStats", () => {
    beforeEach(() => {
      store.getState().initGPXWorker();
    });

    it("should calculate route stats and update state", async () => {
      const coordinates = [
        [1, 2, 3],
        [4, 5, 6],
      ];
      const segments = [{ start: 0, end: 1 }];
      const results = {
        distance: 250,
        elevationGain: 100,
        elevationLoss: 75,
        pointCount: 2,
      };

      const calculatePromise = store
        .getState()
        .calculateRouteStats(coordinates, segments);

      await new Promise((resolve) => setImmediate(resolve));

      const message = mockWorkerInstance.postMessage.mock.calls[0][0];

      expect(message.type).toBe("CALCULATE_ROUTE_STATS");
      expect(message.data.coordinates).toEqual(coordinates);
      expect(message.data.segments).toEqual(segments);

      mockWorkerInstance.onmessage({
        data: {
          type: "ROUTE_STATS_CALCULATED",
          id: message.id,
          results,
        },
      });

      await calculatePromise;

      expect(store.getState().stats.distance).toBe(250);
      expect(store.getState().stats.elevationGain).toBe(100);
      expect(store.getState().stats.elevationLoss).toBe(75);
      expect(store.getState().stats.pointCount).toBe(2);
    });

    it("should handle worker error during stats calculation", async () => {
      const calculatePromise = store
        .getState()
        .calculateRouteStats([[1, 2, 3]], []);

      await new Promise((resolve) => setImmediate(resolve));

      const message = mockWorkerInstance.postMessage.mock.calls[0][0];

      mockWorkerInstance.onmessage({
        data: {
          type: "ERROR",
          id: message.id,
          error: "Stats calculation failed",
        },
      });

      await expect(calculatePromise).rejects.toThrow();
      expect(store.getState().worker.errorMessage).toBe(
        "Stats calculation failed",
      );
      expect(store.getState().worker.processing).toBe(false);
    });

    it("should clear error message on success", async () => {
      store.getState().setWorkerState({ errorMessage: "Previous error" });

      const calculatePromise = store
        .getState()
        .calculateRouteStats([[1, 2, 3]], []);

      await new Promise((resolve) => setImmediate(resolve));

      const message = mockWorkerInstance.postMessage.mock.calls[0][0];

      mockWorkerInstance.onmessage({
        data: {
          type: "ROUTE_STATS_CALCULATED",
          id: message.id,
          results: {
            distance: 100,
            elevationGain: 50,
            elevationLoss: 30,
            pointCount: 1,
          },
        },
      });

      await calculatePromise;

      expect(store.getState().worker.errorMessage).toBe("");
    });
  });

  // =========================================================================
  // CATEGORY 9: findPointsAtDistances
  // =========================================================================

  describe("findPointsAtDistances", () => {
    beforeEach(() => {
      store.getState().initGPXWorker();
    });

    it("should find points at specified distances", async () => {
      const coordinates = [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
      ];
      const distances = [50, 100];
      const results = {
        points: [
          [2.5, 3.5, 4.5],
          [5.5, 6.5, 7.5],
        ],
      };

      const findPromise = store
        .getState()
        .findPointsAtDistances(coordinates, distances);

      await new Promise((resolve) => setImmediate(resolve));

      const message = mockWorkerInstance.postMessage.mock.calls[0][0];

      expect(message.type).toBe("FIND_POINTS_AT_DISTANCES");
      expect(message.data.coordinates).toEqual(coordinates);
      expect(message.data.distances).toEqual(distances);

      mockWorkerInstance.onmessage({
        data: {
          type: "POINTS_FOUND",
          id: message.id,
          results,
        },
      });

      const result = await findPromise;

      expect(result).toEqual(results);
      expect(store.getState().worker.errorMessage).toBe("");
    });

    it("should handle worker error when finding points", async () => {
      const findPromise = store
        .getState()
        .findPointsAtDistances([[1, 2, 3]], [50]);

      await new Promise((resolve) => setImmediate(resolve));

      const message = mockWorkerInstance.postMessage.mock.calls[0][0];

      mockWorkerInstance.onmessage({
        data: {
          type: "ERROR",
          id: message.id,
          error: "Cannot find points with invalid distances",
        },
      });

      await expect(findPromise).rejects.toThrow();
      expect(store.getState().worker.errorMessage).toContain("Cannot find");
      expect(store.getState().worker.processing).toBe(false);
    });
  });

  // =========================================================================
  // CATEGORY 10: getRouteSection
  // =========================================================================

  describe("getRouteSection", () => {
    beforeEach(() => {
      store.getState().initGPXWorker();
    });

    it("should get route section between start and end", async () => {
      const coordinates = [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
      ];
      const start = [1, 2, 3];
      const end = [7, 8, 9];
      const results = {
        section: [
          [1, 2, 3],
          [4, 5, 6],
          [7, 8, 9],
        ],
        distance: 200,
        elevation: 50,
      };

      const getSectionPromise = store
        .getState()
        .getRouteSection(coordinates, start, end);

      await new Promise((resolve) => setImmediate(resolve));

      const message = mockWorkerInstance.postMessage.mock.calls[0][0];

      expect(message.type).toBe("GET_ROUTE_SECTION");
      expect(message.data.coordinates).toEqual(coordinates);
      expect(message.data.start).toEqual(start);
      expect(message.data.end).toEqual(end);

      mockWorkerInstance.onmessage({
        data: {
          type: "ROUTE_SECTION_READY",
          id: message.id,
          results,
        },
      });

      const result = await getSectionPromise;

      expect(result).toEqual(results);
      expect(store.getState().worker.errorMessage).toBe("");
    });

    it("should handle worker error when getting section", async () => {
      const getSectionPromise = store
        .getState()
        .getRouteSection([[1, 2, 3]], [1, 2, 3], [4, 5, 6]);

      await new Promise((resolve) => setImmediate(resolve));

      const message = mockWorkerInstance.postMessage.mock.calls[0][0];

      mockWorkerInstance.onmessage({
        data: {
          type: "ERROR",
          id: message.id,
          error: "Route section not found",
        },
      });

      await expect(getSectionPromise).rejects.toThrow();
      expect(store.getState().worker.errorMessage).toBe(
        "Route section not found",
      );
      expect(store.getState().worker.processing).toBe(false);
    });

    it("should clear error on successful section retrieval", async () => {
      store.getState().setWorkerState({ errorMessage: "Previous error" });

      const getSectionPromise = store
        .getState()
        .getRouteSection([[1, 2, 3]], [1, 2, 3], [1, 2, 3]);

      await new Promise((resolve) => setImmediate(resolve));

      const message = mockWorkerInstance.postMessage.mock.calls[0][0];

      mockWorkerInstance.onmessage({
        data: {
          type: "ROUTE_SECTION_READY",
          id: message.id,
          results: { section: [[1, 2, 3]] },
        },
      });

      await getSectionPromise;

      expect(store.getState().worker.errorMessage).toBe("");
    });
  });

  // =========================================================================
  // CATEGORY 11: EDGE CASES & STATE MANAGEMENT
  // =========================================================================

  describe("Edge Cases & State Management", () => {
    beforeEach(() => {
      store.getState().initGPXWorker();
    });

    it("should handle multiple concurrent processGPXFile calls", async () => {
      const gpxData1 = new ArrayBuffer(100);
      const gpxData2 = new ArrayBuffer(200);

      const promise1 = store.getState().processGPXFile(gpxData1);
      const promise2 = store.getState().processGPXFile(gpxData2);

      await new Promise((resolve) => setImmediate(resolve));

      const calls = mockWorkerInstance.postMessage.mock.calls;
      const message1 = calls[0][0];
      const message2 = calls[1][0];

      // Verify different request IDs
      expect(message1.id).not.toBe(message2.id);

      // Respond to second request first
      mockWorkerInstance.onmessage({
        data: {
          type: "GPX_FILE_PROCESSED",
          id: message2.id,
          results: {
            trace: {
              points: [],
              peaks: [],
              slopes: [],
              cumulativeDistances: [],
              cumulativeElevations: [],
              cumulativeElevationLoss: [],
              totalDistance: 200,
              totalElevation: 100,
              totalElevationLoss: 50,
            },
            sections: [],
            waypoints: [],
            metadata: {},
          },
        },
      });

      // Then respond to first request
      mockWorkerInstance.onmessage({
        data: {
          type: "GPX_FILE_PROCESSED",
          id: message1.id,
          results: {
            trace: {
              points: [],
              peaks: [],
              slopes: [],
              cumulativeDistances: [],
              cumulativeElevations: [],
              cumulativeElevationLoss: [],
              totalDistance: 100,
              totalElevation: 50,
              totalElevationLoss: 20,
            },
            sections: [],
            waypoints: [],
            metadata: {},
          },
        },
      });

      const result1 = await promise1;
      const result2 = await promise2;

      // Verify each resolved with correct data
      expect(result1.trace.totalDistance).toBe(100);
      expect(result2.trace.totalDistance).toBe(200);
    });

    it("should handle message with unregistered ID gracefully", async () => {
      const fakeId = Date.now() + Math.random();

      // Send a message with an ID that was never registered
      mockWorkerInstance.onmessage({
        data: {
          type: "GPX_FILE_PROCESSED",
          id: fakeId,
          results: { data: "orphaned" },
        },
      });

      // Should not throw and state should remain unchanged
      expect(store.getState().worker.processing).toBe(false);
      expect(store.getState().worker.errorMessage).toBe("");
    });

    it("should handle empty arrays in valid results", async () => {
      const processPromise = store
        .getState()
        .processGPXFile(new ArrayBuffer(100));

      await new Promise((resolve) => setImmediate(resolve));

      const message = mockWorkerInstance.postMessage.mock.calls[0][0];

      // Empty arrays are valid
      mockWorkerInstance.onmessage({
        data: {
          type: "GPX_FILE_PROCESSED",
          id: message.id,
          results: {
            trace: {
              points: [],
              peaks: [],
              slopes: [],
              cumulativeDistances: [],
              cumulativeElevations: [],
              cumulativeElevationLoss: [],
              totalDistance: 0,
              totalElevation: 0,
              totalElevationLoss: 0,
            },
            sections: [],
            waypoints: [],
            metadata: {},
          },
        },
      });

      const result = await processPromise;

      expect(result.trace.points).toEqual([]);
      expect(store.getState().stats.distance).toBe(0);
      expect(store.getState().worker.processing).toBe(false);
    });

    it("should handle consecutive errors without state corruption", async () => {
      // First request
      const promise1 = store
        .getState()
        .processGPXFile(new Uint8Array([1, 2, 3]));

      await new Promise((resolve) => setImmediate(resolve));

      let message = mockWorkerInstance.postMessage.mock.calls[0][0];

      mockWorkerInstance.onmessage({
        data: {
          type: "ERROR",
          id: message.id,
          error: "First error",
        },
      });

      await expect(promise1).rejects.toThrow();
      expect(store.getState().worker.errorMessage).toBeTruthy();

      // Clear errors for second attempt
      store.getState().clearError();

      // Second request
      const promise2 = store
        .getState()
        .processGPXFile(new Uint8Array([4, 5, 6]));

      await new Promise((resolve) => setImmediate(resolve));

      message = mockWorkerInstance.postMessage.mock.calls[1][0];

      mockWorkerInstance.onmessage({
        data: {
          type: "ERROR",
          id: message.id,
          error: "Second error",
        },
      });

      await expect(promise2).rejects.toThrow();
      expect(store.getState().worker.errorMessage).toBeTruthy();
    });

    it("should maintain state consistency after operation failure", async () => {
      store.setState({
        gpx: {
          ...store.getState().gpx,
          data: [[1, 2, 3]],
        },
      });

      // Start an operation that will fail
      const promise = store.getState().processGPXFile(new Uint8Array([1]));

      await new Promise((resolve) => setImmediate(resolve));

      const message = mockWorkerInstance.postMessage.mock.calls[0][0];

      // Simulate error
      mockWorkerInstance.onmessage({
        data: {
          type: "ERROR",
          id: message.id,
          error: "Operation failed",
        },
      });

      await expect(promise).rejects.toThrow();

      // Verify state consistency - GPX data should be preserved
      expect(store.getState().gpx.data).toEqual([[1, 2, 3]]);
      expect(store.getState().worker.processing).toBe(false);
    });

    it("should handle null coordinates gracefully in findClosestLocation", async () => {
      store.setState({
        gps: {
          location: { timestamp: 0, coords: [] },
          projectedLocation: { timestamp: 0, coords: [], index: null },
          savedLocations: [],
        },
      });

      const result = await store.getState().findClosestLocation();

      expect(result).toBeNull();
      expect(store.getState().worker.errorMessage).toContain(
        "No location or GPS data available",
      );
    });

    it("should reset processing state when terminating during active operation", async () => {
      const promise = store
        .getState()
        .processGPXFile(new Uint8Array([1, 2, 3]));

      await new Promise((resolve) => setImmediate(resolve));

      expect(store.getState().worker.processing).toBe(true);

      store.getState().terminateGPXWorker();

      expect(store.getState().worker.processing).toBe(false);
      expect(store.getState().worker.isReady).toBe(false);

      await expect(promise).rejects.toThrow("Worker was terminated");
    });

    it("should handle rapid successive terminate calls", () => {
      store.getState().terminateGPXWorker();
      store.getState().terminateGPXWorker();
      store.getState().terminateGPXWorker();

      // Should not throw
      expect(store.getState().worker.isReady).toBe(false);
    });
  });

  // =========================================================================
  // CATEGORY 6: WORKER LIFECYCLE EDGE CASES
  // =========================================================================

  describe("Worker Lifecycle Edge Cases", () => {
    it("should handle worker onerror during initialization", () => {
      store.getState().initGPXWorker();

      mockWorkerInstance.onerror(new Error("Worker crashed"));

      // onerror should mark worker as not ready and set error state
      expect(store.getState().worker.isReady).toBe(false);
      expect(store.getState().worker.errorMessage).toBe(
        "Worker initialization failed",
      );
    });

    it("should handle worker reinitialization after onerror", () => {
      // First initialization
      store.getState().initGPXWorker();
      expect(store.getState().worker.isReady).toBe(true);

      // Simulate worker crash
      mockWorkerInstance.onerror(new Error("Worker crashed"));
      expect(store.getState().worker.isReady).toBe(false);
      expect(store.getState().worker.errorMessage).toBe(
        "Worker initialization failed",
      );

      // Terminate and reinitialize
      store.getState().terminateGPXWorker();
      expect(store.getState().worker.isReady).toBe(false);

      // Reinitialize the worker
      store.getState().initGPXWorker();
      expect(store.getState().worker.isReady).toBe(true);
      expect(store.getState().worker.errorMessage).toBe("");
    });
  });
});
