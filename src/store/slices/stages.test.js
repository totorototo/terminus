import { beforeEach, describe, expect, it } from "vitest";
import { create } from "zustand";

import { createStagesSlice } from "./stages";

describe("stagesSlice", () => {
  let store;
  beforeEach(() => {
    store = create((set, get) => ({
      ...createStagesSlice(set, get),
    }));
  });

  describe("initial state", () => {
    it("should have correct initial state", () => {
      expect(store.getState().stages).toEqual([]);
    });
  });

  describe("setStages", () => {
    it("should set stages correctly", () => {
      const { setStages } = store.getState();
      const newStages = [
        { stageId: 0, startLocation: "Depart", endLocation: "BH1" },
        { stageId: 1, startLocation: "BH1", endLocation: "Arrivee" },
      ];
      setStages(newStages);
      expect(store.getState().stages).toEqual(newStages);
    });

    it("should replace existing stages", () => {
      const { setStages } = store.getState();
      setStages([{ stageId: 0 }]);
      setStages([{ stageId: 1 }, { stageId: 2 }]);
      expect(store.getState().stages).toEqual([{ stageId: 1 }, { stageId: 2 }]);
    });
  });
});
