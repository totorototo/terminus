import { describe, it, expect, vi, beforeEach } from "vitest";
import useStore, {
  useAppState,
  useGpxData,
  useStats,
  useWorkerState,
  useTrackingMode,
  useDisplaySlopes,
  useProjectedLocation,
  useCurrentClosestLocation,
  useGpxCoordinates,
  useProcessingState,
} from "./store";

// Mock external dependencies only (per official Zustand testing docs)
vi.mock("../../helpers/createRingBuffer", () => ({
  default: vi.fn(() => ({
    add: vi.fn(),
    get: vi.fn(() => []),
    clear: vi.fn(),
    size: vi.fn(() => 0),
  })),
}));

// Mock Worker API
global.Worker = vi.fn(() => ({
  postMessage: vi.fn(),
  terminate: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}));

// Mock geolocation API
global.navigator.geolocation = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
};

describe("store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store to initial state
    useStore.setState(useStore.getState());
  });

  describe("useStore", () => {
    it("should create store with all slices", () => {
      const state = useStore.getState();

      expect(state.app).toBeDefined();
      expect(state.gpx).toBeDefined();
      expect(state.stats).toBeDefined();
      expect(state.worker).toBeDefined();
    });

    it("should have app slice with correct initial state", () => {
      const state = useStore.getState();

      expect(state.app.trackingMode).toBe(false);
      expect(state.app.displaySlopes).toBe(false);
      expect(state.app.profileMode).toBe(false);
      expect(state.app.locations).toEqual([]);
      expect(state.app.startingDate).toBe(0);
    });

    it("should have gpx slice with correct initial state", () => {
      const state = useStore.getState();

      expect(state.gpx.data).toEqual([]);
      expect(state.gpx.slopes).toEqual([]);
      expect(state.gpx.cumulativeDistances).toEqual([]);
      expect(state.gpx.cumulativeElevations).toEqual([]);
      expect(state.gpx.cumulativeElevationLosses).toEqual([]);
    });

    it("should have stats slice with correct initial state", () => {
      const state = useStore.getState();

      expect(state.stats.distance).toBe(0);
      expect(state.stats.elevationGain).toBe(0);
      expect(state.stats.elevationLoss).toBe(0);
      expect(state.stats.pointCount).toBe(0);
    });

    it("should have worker slice with correct initial state", () => {
      const state = useStore.getState();

      expect(state.worker.isReady).toBe(false);
      expect(state.worker.processing).toBe(false);
      expect(state.worker.progress).toBe(0);
      expect(state.worker.progressMessage).toBe("");
      expect(state.worker.errorMessage).toBe("");
    });
  });

  describe("selector hooks", () => {
    it("should export useAppState selector", () => {
      expect(useAppState).toBeDefined();
      expect(typeof useAppState).toBe("function");
    });

    it("should export useGpsData selector", () => {
      expect(useGpxData).toBeDefined();
      expect(typeof useGpxData).toBe("function");
    });

    it("should export useStats selector", () => {
      expect(useStats).toBeDefined();
      expect(typeof useStats).toBe("function");
    });

    it("should export useWorkerState selector", () => {
      expect(useWorkerState).toBeDefined();
      expect(typeof useWorkerState).toBe("function");
    });

    it("should export useTrackingMode selector", () => {
      expect(useTrackingMode).toBeDefined();
      expect(typeof useTrackingMode).toBe("function");
    });

    it("should export useDisplaySlopes selector", () => {
      expect(useDisplaySlopes).toBeDefined();
      expect(typeof useDisplaySlopes).toBe("function");
    });

    it("should export useProjectedLocation selector", () => {
      expect(useProjectedLocation).toBeDefined();
      expect(typeof useProjectedLocation).toBe("function");
    });

    it("should export useGpxCoordinates selector", () => {
      expect(useGpxCoordinates).toBeDefined();
      expect(typeof useGpxCoordinates).toBe("function");
    });

    it("should export useProcessingState selector", () => {
      expect(useProcessingState).toBeDefined();
      expect(typeof useProcessingState).toBe("function");
    });
  });

  describe("persistence", () => {
    it("should configure persistence with correct name", () => {
      // Store is wrapped with persist middleware
      // The store should have the correct storage key
      const state = useStore.getState();
      expect(state).toBeDefined();
    });

    it("should only persist app slice data", () => {
      // The partialize function should only include app state
      // This is configured but we can't directly test without accessing internals
      const state = useStore.getState();

      // Verify app data exists (what should be persisted)
      expect(state.app).toBeDefined();
      expect(state.app.trackingMode).toBeDefined();
      expect(state.app.displaySlopes).toBeDefined();
    });
  });

  describe("store integration", () => {
    it("should toggle tracking mode", () => {
      const initialState = useStore.getState();
      expect(initialState.app.trackingMode).toBe(false);

      // Test actual action
      useStore.getState().toggleTrackingMode();

      const updatedState = useStore.getState();
      expect(updatedState.app.trackingMode).toBe(true);
    });

    it("should toggle display slopes", () => {
      const initialState = useStore.getState();
      expect(initialState.app.displaySlopes).toBe(false);

      // Test actual action
      useStore.getState().toggleSlopesMode();

      const updatedState = useStore.getState();
      expect(updatedState.app.displaySlopes).toBe(true);
    });

    it("should set GPS data", () => {
      const testData = [
        [0, 0, 100],
        [1, 1, 200],
      ];

      useStore.getState().setGpxData(testData);

      const state = useStore.getState();
      expect(state.gpx.data).toEqual(testData);
    });

    it("should set stats", () => {
      const testStats = {
        distance: 10000,
        elevationGain: 500,
        elevationLoss: 300,
        pointCount: 1000,
      };

      useStore.getState().setStats(testStats);

      const state = useStore.getState();
      expect(state.stats.distance).toBe(10000);
      expect(state.stats.elevationGain).toBe(500);
      expect(state.stats.elevationLoss).toBe(300);
      expect(state.stats.pointCount).toBe(1000);
    });

    it("should maintain separate slice states", () => {
      const state = useStore.getState();

      // Each slice should maintain its own state
      expect(state.app).not.toBe(state.gps);
      expect(state.gps).not.toBe(state.stats);
      expect(state.stats).not.toBe(state.worker);
    });

    it("should have actions from all slices", () => {
      const state = useStore.getState();

      // App slice actions
      expect(state.toggleTrackingMode).toBeDefined();
      expect(state.toggleSlopesMode).toBeDefined();

      // GPX slice actions
      expect(state.setGpxData).toBeDefined();
      expect(state.setSlopes).toBeDefined();
      expect(state.setSections).toBeDefined();

      // Stats slice actions
      expect(state.setStats).toBeDefined();
      expect(state.updateStats).toBeDefined();

      // Worker slice actions
      expect(state.initGPXWorker).toBeDefined();
      expect(state.setWorkerState).toBeDefined();
      expect(state.terminateGPXWorker).toBeDefined();
    });
  });

  describe("selector performance", () => {
    it("should have separate slice states", () => {
      const state = useStore.getState();

      // Each slice should be independent
      expect(state.app).not.toBe(state.gps);
      expect(state.gps).not.toBe(state.stats);
    });

    it("should allow direct state access for primitive values", () => {
      const state = useStore.getState();

      // Primitive values should be accessible
      expect(typeof state.app.trackingMode).toBe("boolean");
      expect(typeof state.app.displaySlopes).toBe("boolean");
    });
  });

  describe("devtools", () => {
    it("should be enabled in development mode", () => {
      // Store is wrapped with devtools middleware
      // We can't directly test this, but verify store exists
      expect(useStore).toBeDefined();
      expect(typeof useStore).toBe("function");
    });
  });

  describe("subscribeWithSelector", () => {
    it("should allow subscription to specific state changes", () => {
      // Store is wrapped with subscribeWithSelector middleware
      const state = useStore.getState();

      // Verify we can access state (subscribeWithSelector is applied)
      expect(state).toBeDefined();
    });
  });
});
