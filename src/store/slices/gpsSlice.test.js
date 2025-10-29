import { describe, it, expect, beforeEach } from "vitest";
import { create } from "zustand";
import { createGpsSlice } from "./gpsSlice";

describe("gpsSlice", () => {
  let store;

  beforeEach(() => {
    store = create((set, get) => ({
      ...createGpsSlice(set, get),
    }));
  });

  describe("initial state", () => {
    it("should have correct initial state", () => {
      const state = store.getState();

      expect(state.gps.data).toEqual([]);
      expect(state.gps.slopes).toEqual([]);
      expect(state.gps.sections).toEqual([]);
      expect(state.gps.cumulativeDistances).toEqual([]);
      expect(state.gps.cumulativeElevations).toEqual([]);
      expect(state.gps.cumulativeElevationLosses).toEqual([]);
    });
  });

  describe("setGpsData", () => {
    it("should set GPS data", () => {
      const { setGpsData } = store.getState();
      const testData = [
        [0, 0, 100],
        [1, 1, 200],
        [2, 2, 150],
      ];

      setGpsData(testData);

      expect(store.getState().gps.data).toEqual(testData);
    });

    it("should preserve other gps properties when setting data", () => {
      const { setGpsData, setSlopes } = store.getState();

      setSlopes([1, 2, 3]);
      setGpsData([[0, 0, 0]]);

      const state = store.getState().gps;
      expect(state.data).toEqual([[0, 0, 0]]);
      expect(state.slopes).toEqual([1, 2, 3]);
    });
  });

  describe("setSlopes", () => {
    it("should set slopes", () => {
      const { setSlopes } = store.getState();
      const testSlopes = [0.5, 1.2, -0.3, 2.1];

      setSlopes(testSlopes);

      expect(store.getState().gps.slopes).toEqual(testSlopes);
    });

    it("should handle empty slopes array", () => {
      const { setSlopes } = store.getState();

      setSlopes([]);

      expect(store.getState().gps.slopes).toEqual([]);
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

      expect(store.getState().gps.sections).toEqual(testSections);
    });

    it("should replace existing sections", () => {
      const { setSections } = store.getState();

      setSections([{ id: "old" }]);
      setSections([{ id: "new" }]);

      expect(store.getState().gps.sections).toEqual([{ id: "new" }]);
    });
  });

  describe("setCumulativeDistances", () => {
    it("should set cumulative distances", () => {
      const { setCumulativeDistances } = store.getState();
      const distances = [0, 100, 250, 400, 600];

      setCumulativeDistances(distances);

      expect(store.getState().gps.cumulativeDistances).toEqual(distances);
    });
  });

  describe("setCumulativeElevations", () => {
    it("should set cumulative elevations", () => {
      const { setCumulativeElevations } = store.getState();
      const elevations = [0, 50, 120, 180, 250];

      setCumulativeElevations(elevations);

      expect(store.getState().gps.cumulativeElevations).toEqual(elevations);
    });
  });

  describe("setCumulativeElevationLosses", () => {
    it("should set cumulative elevation losses", () => {
      const { setCumulativeElevationLosses } = store.getState();
      const losses = [0, 10, 30, 45, 60];

      setCumulativeElevationLosses(losses);

      expect(store.getState().gps.cumulativeElevationLosses).toEqual(losses);
    });
  });

  describe("selectors", () => {
    it("should get GPS data", () => {
      const { setGpsData, getGpsData } = store.getState();
      const testData = [[1, 2, 3]];

      setGpsData(testData);

      expect(getGpsData()).toEqual(testData);
    });

    it("should get slopes", () => {
      const { setSlopes, getSlopes } = store.getState();
      const testSlopes = [1.5, 2.0];

      setSlopes(testSlopes);

      expect(getSlopes()).toEqual(testSlopes);
    });

    it("should get sections", () => {
      const { setSections, getSections } = store.getState();
      const testSections = [{ id: "test" }];

      setSections(testSections);

      expect(getSections()).toEqual(testSections);
    });
  });

  describe("integration", () => {
    it("should update multiple GPS properties independently", () => {
      const {
        setGpsData,
        setSlopes,
        setSections,
        setCumulativeDistances,
        setCumulativeElevations,
        setCumulativeElevationLosses,
      } = store.getState();

      setGpsData([[0, 0, 0]]);
      setSlopes([1.0]);
      setSections([{ id: "s1" }]);
      setCumulativeDistances([0, 100]);
      setCumulativeElevations([0, 50]);
      setCumulativeElevationLosses([0, 10]);

      const state = store.getState().gps;
      expect(state.data).toEqual([[0, 0, 0]]);
      expect(state.slopes).toEqual([1.0]);
      expect(state.sections).toEqual([{ id: "s1" }]);
      expect(state.cumulativeDistances).toEqual([0, 100]);
      expect(state.cumulativeElevations).toEqual([0, 50]);
      expect(state.cumulativeElevationLosses).toEqual([0, 10]);
    });
  });
});
