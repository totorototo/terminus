import { beforeEach, describe, expect, it } from "vitest";
import { create } from "zustand";

import { createWayPointsSlice } from "./wayPoints";

describe("wayPointsSlice", () => {
  let store;

  beforeEach(() => {
    store = create((set, get) => ({
      ...createWayPointsSlice(set, get),
    }));
  });

  describe("initial state", () => {
    it("should have correct initial state", () => {
      const state = store.getState();

      expect(state.waypoints).toEqual([]);
    });
  });

  describe("setWayPoints", () => {
    it("should set waypoints correctly", () => {
      const { setWayPoints } = store.getState();
      const newWayPoints = [
        { id: 1, name: "Point A" },
        { id: 2, name: "Point B" },
      ];

      setWayPoints(newWayPoints);

      expect(store.getState().waypoints).toEqual(newWayPoints);
    });
  });
});
