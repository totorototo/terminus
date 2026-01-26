import { describe, it, expect, beforeEach } from "vitest";
import { create } from "zustand";
import { createGpxSlice } from "./gpxSlice";

describe("gpxSlice", () => {
  let store;

  beforeEach(() => {
    store = create((set, get) => ({
      ...createGpxSlice(set, get),
    }));
  });

  describe("initial state", () => {
    it("should have correct initial state", () => {
      const state = store.getState();

      expect(state.gpx.data).toEqual([]);
      expect(state.gpx.slopes).toEqual([]);
      expect(state.gpx.sections).toEqual([]);
      expect(state.gpx.cumulativeDistances).toEqual([]);
      expect(state.gpx.cumulativeElevations).toEqual([]);
      expect(state.gpx.cumulativeElevationLosses).toEqual([]);
    });
  });

  describe("setGpxData", () => {
    it("should set GPX data", () => {
      const { setGpxData } = store.getState();
      const testData = [
        [0, 0, 100],
        [1, 1, 200],
        [2, 2, 150],
      ];

      setGpxData(testData);

      expect(store.getState().gpx.data).toEqual(testData);
    });

    it("should preserve other gpx properties when setting data", () => {
      const { setGpxData, setSlopes } = store.getState();

      setSlopes([1, 2, 3]);
      setGpxData([[0, 0, 0]]);
      const state = store.getState().gpx;
      expect(state.data).toEqual([[0, 0, 0]]);
      expect(state.slopes).toEqual([1, 2, 3]);
    });
  });

  describe("setSlopes", () => {
    it("should set slopes", () => {
      const { setSlopes } = store.getState();
      const testSlopes = [0.5, 1.2, -0.3, 2.1];

      setSlopes(testSlopes);

      expect(store.getState().gpx.slopes).toEqual(testSlopes);
    });

    it("should handle empty slopes array", () => {
      const { setSlopes } = store.getState();

      setSlopes([]);

      expect(store.getState().gpx.slopes).toEqual([]);
    });
  });

  describe("setSections", () => {
    it("should set sections", () => {
      const { setSections } = store.getState();
      const testSections = [
        {
          id: "section-1",
          startKm: 0,
          endKm: 5,
          points: [[0, 0, 0]],
        },
        {
          id: "section-2",
          startKm: 5,
          endKm: 10,
          points: [[1, 1, 100]],
        },
      ];

      setSections(testSections);

      expect(store.getState().gpx.sections).toEqual(testSections);
    });

    it("should replace existing sections", () => {
      const { setSections } = store.getState();

      setSections([{ id: "old" }]);
      setSections([{ id: "new" }]);

      expect(store.getState().gpx.sections).toEqual([{ id: "new" }]);
    });
  });

  describe("setCumulativeDistances", () => {
    it("should set cumulative distances", () => {
      const { setCumulativeDistances } = store.getState();
      const distances = [0, 100, 250, 400, 600];

      setCumulativeDistances(distances);

      expect(store.getState().gpx.cumulativeDistances).toEqual(distances);
    });
  });

  describe("setCumulativeElevations", () => {
    it("should set cumulative elevations", () => {
      const { setCumulativeElevations } = store.getState();
      const elevations = [0, 50, 120, 180, 250];

      setCumulativeElevations(elevations);

      expect(store.getState().gpx.cumulativeElevations).toEqual(elevations);
    });
  });

  describe("setCumulativeElevationLosses", () => {
    it("should set cumulative elevation losses", () => {
      const { setCumulativeElevationLosses } = store.getState();
      const losses = [0, 10, 30, 45, 60];

      setCumulativeElevationLosses(losses);

      expect(store.getState().gpx.cumulativeElevationLosses).toEqual(losses);
    });
  });

  describe("state access", () => {
    it("should set and retrieve GPX data", () => {
      const { setGpxData } = store.getState();
      const testData = [[1, 2, 3]];

      setGpxData(testData);

      expect(store.getState().gpx.data).toEqual(testData);
    });

    it("should set and retrieve slopes", () => {
      const { setSlopes } = store.getState();
      const testSlopes = [1.5, 2.0];

      setSlopes(testSlopes);

      expect(store.getState().gpx.slopes).toEqual(testSlopes);
    });

    it("should set and retrieve sections", () => {
      const { setSections } = store.getState();
      const testSections = [{ id: "test" }];

      setSections(testSections);

      expect(store.getState().gpx.sections).toEqual(testSections);
    });
  });

  describe("integration", () => {
    it("should update multiple GPX properties independently", () => {
      const {
        setGpxData,
        setSlopes,
        setSections,
        setCumulativeDistances,
        setCumulativeElevations,
        setCumulativeElevationLosses,
      } = store.getState();

      setGpxData([[0, 0, 0]]);
      setSlopes([1.0]);
      setSections([{ id: "s1" }]);
      setCumulativeDistances([0, 100]);
      setCumulativeElevations([0, 50]);
      setCumulativeElevationLosses([0, 10]);

      const state = store.getState().gpx;
      expect(state.data).toEqual([[0, 0, 0]]);
      expect(state.slopes).toEqual([1.0]);
      expect(state.sections).toEqual([{ id: "s1" }]);
      expect(state.cumulativeDistances).toEqual([0, 100]);
      expect(state.cumulativeElevations).toEqual([0, 50]);
      expect(state.cumulativeElevationLosses).toEqual([0, 10]);
    });
  });
});
