import { beforeEach, describe, expect, it } from "vitest";
import { create } from "zustand";

import {
  DEFAULT_BASE_PACE_S_PER_KM,
  DEFAULT_K_FATIGUE,
  MAX_BASE_PACE_S_PER_KM,
  MAX_K_FATIGUE,
  MIN_BASE_PACE_S_PER_KM,
  MIN_K_FATIGUE,
} from "../../constants.js";
import { createSettingsSlice } from "./settings";

describe("settingsSlice", () => {
  let store;
  beforeEach(() => {
    store = create((set, get) => ({
      ...createSettingsSlice(set, get),
    }));
  });

  describe("initial state", () => {
    it("should default to the Minetti model defaults", () => {
      expect(store.getState().settings).toEqual({
        basePace: DEFAULT_BASE_PACE_S_PER_KM,
        kFatigue: DEFAULT_K_FATIGUE,
      });
    });
  });

  describe("setBasePace", () => {
    it("should update the base pace", () => {
      store.getState().setBasePace(400);
      expect(store.getState().settings.basePace).toBe(400);
    });

    it("should clamp to the allowed range", () => {
      store.getState().setBasePace(MAX_BASE_PACE_S_PER_KM + 1000);
      expect(store.getState().settings.basePace).toBe(MAX_BASE_PACE_S_PER_KM);

      store.getState().setBasePace(MIN_BASE_PACE_S_PER_KM - 1000);
      expect(store.getState().settings.basePace).toBe(MIN_BASE_PACE_S_PER_KM);
    });

    it("should not affect kFatigue", () => {
      store.getState().setBasePace(400);
      expect(store.getState().settings.kFatigue).toBe(DEFAULT_K_FATIGUE);
    });
  });

  describe("setKFatigue", () => {
    it("should update the fatigue coefficient", () => {
      store.getState().setKFatigue(0.01);
      expect(store.getState().settings.kFatigue).toBe(0.01);
    });

    it("should clamp to the allowed range", () => {
      store.getState().setKFatigue(MAX_K_FATIGUE + 1);
      expect(store.getState().settings.kFatigue).toBe(MAX_K_FATIGUE);

      store.getState().setKFatigue(MIN_K_FATIGUE - 1);
      expect(store.getState().settings.kFatigue).toBe(MIN_K_FATIGUE);
    });
  });

  describe("resetPaceSettings", () => {
    it("should restore the defaults", () => {
      store.getState().setBasePace(400);
      store.getState().setKFatigue(0.01);
      store.getState().resetPaceSettings();
      expect(store.getState().settings).toEqual({
        basePace: DEFAULT_BASE_PACE_S_PER_KM,
        kFatigue: DEFAULT_K_FATIGUE,
      });
    });
  });
});
