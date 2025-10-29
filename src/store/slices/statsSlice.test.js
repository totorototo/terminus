import { describe, it, expect, beforeEach } from "vitest";
import { create } from "zustand";
import { createStatsSlice } from "./statsSlice";

describe("statsSlice", () => {
  let store;

  beforeEach(() => {
    store = create((set, get) => ({
      ...createStatsSlice(set, get),
    }));
  });

  describe("initial state", () => {
    it("should have correct initial state", () => {
      const state = store.getState();

      expect(state.stats.distance).toBe(0);
      expect(state.stats.elevationGain).toBe(0);
      expect(state.stats.elevationLoss).toBe(0);
      expect(state.stats.pointCount).toBe(0);
    });
  });

  describe("setStats", () => {
    it("should set all stats at once", () => {
      const { setStats } = store.getState();
      const newStats = {
        distance: 10000,
        elevationGain: 500,
        elevationLoss: 300,
        pointCount: 1000,
      };

      setStats(newStats);

      expect(store.getState().stats).toEqual(newStats);
    });

    it("should partially update stats", () => {
      const { setStats } = store.getState();

      setStats({ distance: 5000 });

      const state = store.getState().stats;
      expect(state.distance).toBe(5000);
      expect(state.elevationGain).toBe(0);
      expect(state.elevationLoss).toBe(0);
      expect(state.pointCount).toBe(0);
    });

    it("should merge with existing stats", () => {
      const { setStats } = store.getState();

      setStats({ distance: 1000, elevationGain: 100 });
      setStats({ distance: 2000, pointCount: 500 });

      const state = store.getState().stats;
      expect(state.distance).toBe(2000);
      expect(state.elevationGain).toBe(100);
      expect(state.elevationLoss).toBe(0);
      expect(state.pointCount).toBe(500);
    });
  });

  describe("updateStats", () => {
    it("should update only provided stats", () => {
      const { setStats, updateStats } = store.getState();

      setStats({
        distance: 1000,
        elevationGain: 100,
        elevationLoss: 50,
        pointCount: 200,
      });

      updateStats({ distance: 2000 });

      const state = store.getState().stats;
      expect(state.distance).toBe(2000);
      expect(state.elevationGain).toBe(100);
      expect(state.elevationLoss).toBe(50);
      expect(state.pointCount).toBe(200);
    });

    it("should ignore undefined values", () => {
      const { setStats, updateStats } = store.getState();

      setStats({ distance: 1000, elevationGain: 100 });
      updateStats({ distance: undefined, elevationGain: 200 });

      const state = store.getState().stats;
      expect(state.distance).toBe(1000); // Unchanged
      expect(state.elevationGain).toBe(200); // Updated
    });

    it("should ignore null values", () => {
      const { setStats, updateStats } = store.getState();

      setStats({ distance: 1000, pointCount: 500 });
      updateStats({ distance: null, pointCount: 1000 });

      const state = store.getState().stats;
      expect(state.distance).toBe(1000); // Unchanged
      expect(state.pointCount).toBe(1000); // Updated
    });

    it("should handle multiple updates", () => {
      const { updateStats } = store.getState();

      updateStats({ distance: 1000 });
      updateStats({ elevationGain: 100 });
      updateStats({ elevationLoss: 50 });
      updateStats({ pointCount: 200 });

      const state = store.getState().stats;
      expect(state.distance).toBe(1000);
      expect(state.elevationGain).toBe(100);
      expect(state.elevationLoss).toBe(50);
      expect(state.pointCount).toBe(200);
    });

    it("should handle zero values correctly", () => {
      const { setStats, updateStats } = store.getState();

      setStats({ distance: 1000, elevationGain: 100 });
      updateStats({ distance: 0, elevationGain: 0 });

      const state = store.getState().stats;
      expect(state.distance).toBe(0);
      expect(state.elevationGain).toBe(0);
    });
  });

  describe("getStats selector", () => {
    it("should return current stats", () => {
      const { setStats, getStats } = store.getState();

      setStats({
        distance: 5000,
        elevationGain: 250,
        elevationLoss: 150,
        pointCount: 1000,
      });

      expect(getStats()).toEqual({
        distance: 5000,
        elevationGain: 250,
        elevationLoss: 150,
        pointCount: 1000,
      });
    });

    it("should return updated stats after changes", () => {
      const { updateStats, getStats } = store.getState();

      updateStats({ distance: 1000 });
      expect(getStats().distance).toBe(1000);

      updateStats({ distance: 2000 });
      expect(getStats().distance).toBe(2000);
    });
  });

  describe("edge cases", () => {
    it("should handle large numbers", () => {
      const { setStats } = store.getState();

      setStats({
        distance: 999999999,
        elevationGain: 100000,
        elevationLoss: 50000,
        pointCount: 1000000,
      });

      const state = store.getState().stats;
      expect(state.distance).toBe(999999999);
      expect(state.pointCount).toBe(1000000);
    });

    it("should handle decimal values", () => {
      const { setStats } = store.getState();

      setStats({
        distance: 1234.567,
        elevationGain: 123.45,
        elevationLoss: 67.89,
      });

      const state = store.getState().stats;
      expect(state.distance).toBe(1234.567);
      expect(state.elevationGain).toBe(123.45);
      expect(state.elevationLoss).toBe(67.89);
    });

    it("should handle empty object in setStats", () => {
      const { setStats } = store.getState();

      setStats({ distance: 1000 });
      setStats({});

      // Previous values should be preserved
      expect(store.getState().stats.distance).toBe(1000);
    });

    it("should handle empty object in updateStats", () => {
      const { setStats, updateStats } = store.getState();

      setStats({ distance: 1000 });
      updateStats({});

      // Values should remain unchanged
      expect(store.getState().stats.distance).toBe(1000);
    });
  });
});
