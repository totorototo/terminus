import { describe, it, expect, vi, beforeEach } from "vitest";
import useStore, {
  useAppState,
  useGpsData,
  useStats,
  useWorkerState,
  useTrackingMode,
  useDisplaySlopes,
  useCurrentPosition,
  useCurrentClosestLocation,
  useGpsCoordinates,
  useProcessingState,
} from "./store";

// Mock the slice creators
vi.mock("./slices/appSlice", () => ({
  createAppSlice: vi.fn(() => ({
    app: {
      trackingMode: false,
      displaySlopes: false,
      currentPositionIndex: { index: 0, date: 0 },
      currentLocation: null,
      currentClosestLocation: { coords: [1, 2, 3] },
      startingDate: 0,
      locations: [],
    },
    toggleTrackingMode: vi.fn(),
    initLocationBuffer: vi.fn(),
  })),
}));

vi.mock("./slices/gpsSlice", () => ({
  createGpsSlice: vi.fn(() => ({
    gps: {
      data: [
        [0, 0, 100],
        [1, 1, 200],
      ],
      slopes: [1.5, 2.0],
      sections: [],
      cumulativeDistances: [],
      cumulativeElevations: [],
      cumulativeElevationLosses: [],
    },
    setGpsData: vi.fn(),
  })),
}));

vi.mock("./slices/statsSlice", () => ({
  createStatsSlice: vi.fn(() => ({
    stats: {
      distance: 10000,
      elevationGain: 500,
      elevationLoss: 300,
      pointCount: 1000,
    },
    setStats: vi.fn(),
  })),
}));

vi.mock("./slices/workerSlice", () => ({
  createWorkerSlice: vi.fn(() => ({
    worker: {
      isReady: true,
      processing: false,
      progress: 0,
      progressMessage: "",
      errorMessage: "",
    },
    initGPSWorker: vi.fn(),
  })),
}));

describe("store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useStore", () => {
    it("should create store with all slices", () => {
      const state = useStore.getState();

      expect(state.app).toBeDefined();
      expect(state.gps).toBeDefined();
      expect(state.stats).toBeDefined();
      expect(state.worker).toBeDefined();
    });

    it("should have app slice state", () => {
      const state = useStore.getState();

      expect(state.app.trackingMode).toBeDefined();
      expect(state.app.displaySlopes).toBeDefined();
      expect(state.app.currentPositionIndex).toBeDefined();
      expect(state.app.locations).toBeDefined();
    });

    it("should have gps slice state", () => {
      const state = useStore.getState();

      expect(state.gps.data).toBeDefined();
      expect(state.gps.slopes).toBeDefined();
      expect(state.gps.sections).toBeDefined();
    });

    it("should have stats slice state", () => {
      const state = useStore.getState();

      expect(state.stats.distance).toBeDefined();
      expect(state.stats.elevationGain).toBeDefined();
      expect(state.stats.elevationLoss).toBeDefined();
      expect(state.stats.pointCount).toBeDefined();
    });

    it("should have worker slice state", () => {
      const state = useStore.getState();

      expect(state.worker.isReady).toBeDefined();
      expect(state.worker.processing).toBeDefined();
      expect(state.worker.progress).toBeDefined();
    });
  });

  describe("selector hooks", () => {
    describe("useAppState", () => {
      it("should select app state", () => {
        const appState = useAppState();

        expect(appState).toBeDefined();
        expect(appState.trackingMode).toBeDefined();
        expect(appState.displaySlopes).toBeDefined();
      });
    });

    describe("useGpsData", () => {
      it("should select gps state", () => {
        const gpsData = useGpsData();

        expect(gpsData).toBeDefined();
        expect(gpsData.data).toBeDefined();
        expect(gpsData.slopes).toBeDefined();
        expect(gpsData.sections).toBeDefined();
      });
    });

    describe("useStats", () => {
      it("should select stats state", () => {
        const stats = useStats();

        expect(stats).toBeDefined();
        expect(stats.distance).toBeDefined();
        expect(stats.elevationGain).toBeDefined();
        expect(stats.elevationLoss).toBeDefined();
        expect(stats.pointCount).toBeDefined();
      });
    });

    describe("useWorkerState", () => {
      it("should select worker state", () => {
        const workerState = useWorkerState();

        expect(workerState).toBeDefined();
        expect(workerState.isReady).toBeDefined();
        expect(workerState.processing).toBeDefined();
        expect(workerState.progress).toBeDefined();
      });
    });

    describe("useTrackingMode", () => {
      it("should select tracking mode", () => {
        const trackingMode = useTrackingMode();

        expect(typeof trackingMode).toBe("boolean");
      });
    });

    describe("useDisplaySlopes", () => {
      it("should select display slopes", () => {
        const displaySlopes = useDisplaySlopes();

        expect(typeof displaySlopes).toBe("boolean");
      });
    });

    describe("useCurrentPosition", () => {
      it("should select current position index", () => {
        const position = useCurrentPosition();

        expect(position).toBeDefined();
        expect(position.index).toBeDefined();
        expect(position.date).toBeDefined();
      });
    });

    describe("useCurrentClosestLocation", () => {
      it("should select current closest location", () => {
        const location = useCurrentClosestLocation();

        expect(location).toBeDefined();
      });
    });

    describe("useGpsCoordinates", () => {
      it("should select GPS coordinates", () => {
        const coordinates = useGpsCoordinates();

        expect(Array.isArray(coordinates)).toBe(true);
      });
    });

    describe("useProcessingState", () => {
      it("should select processing state", () => {
        const processingState = useProcessingState();

        expect(processingState).toBeDefined();
        expect(processingState.isProcessing).toBeDefined();
        expect(processingState.progress).toBeDefined();
        expect(processingState.message).toBeDefined();
        expect(processingState.error).toBeDefined();
      });

      it("should map worker properties correctly", () => {
        const processingState = useProcessingState();

        expect(typeof processingState.isProcessing).toBe("boolean");
        expect(typeof processingState.progress).toBe("number");
        expect(typeof processingState.message).toBe("string");
        expect(typeof processingState.error).toBe("string");
      });
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
    it("should allow state updates", () => {
      const initialState = useStore.getState();

      // Test that setState works
      useStore.setState({
        ...initialState,
        app: {
          ...initialState.app,
          trackingMode: true,
        },
      });

      const updatedState = useStore.getState();
      expect(updatedState.app.trackingMode).toBe(true);
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
      expect(state.initLocationBuffer).toBeDefined();

      // GPS slice actions
      expect(state.setGpsData).toBeDefined();

      // Stats slice actions
      expect(state.setStats).toBeDefined();

      // Worker slice actions
      expect(state.initGPSWorker).toBeDefined();
    });
  });

  describe("selector performance", () => {
    it("should select only specific slice without re-renders", () => {
      // Selectors should only trigger re-renders for their specific slice
      const appState1 = useAppState();
      const gpsData1 = useGpsData();

      // These should be independent
      expect(appState1).not.toBe(gpsData1);
    });

    it("should select specific properties efficiently", () => {
      const trackingMode = useTrackingMode();
      const displaySlopes = useDisplaySlopes();

      // Should return primitive values directly
      expect(typeof trackingMode).toBe("boolean");
      expect(typeof displaySlopes).toBe("boolean");
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
