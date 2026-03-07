import { beforeEach, describe, expect, it } from "vitest";
import { create } from "zustand";

import { createLegsSlice } from "./sections";

describe("legsSlice", () => {
  let store;
  beforeEach(() => {
    store = create((set, get) => ({
      ...createLegsSlice(set, get),
    }));
  });

  describe("initial state", () => {
    it("should have correct initial state", () => {
      const state = store.getState();
      expect(state.legs).toEqual([]);
    });
  });

  describe("setLegs", () => {
    it("should set legs correctly", () => {
      const { setLegs } = store.getState();
      const newLegs = [
        { id: 1, name: "Leg A" },
        { id: 2, name: "Leg B" },
      ];
      setLegs(newLegs);
      expect(store.getState().legs).toEqual(newLegs);
    });
  });
});
