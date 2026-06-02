import {
  DEFAULT_BASE_PACE_S_PER_KM,
  DEFAULT_K_FATIGUE,
  MAX_BASE_PACE_S_PER_KM,
  MAX_K_FATIGUE,
  MIN_BASE_PACE_S_PER_KM,
  MIN_K_FATIGUE,
} from "../../constants.js";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// Runner-specific inputs for the Minetti pace/effort model. These drive the
// section/stage estimated-duration computation in zig/minetti.zig and are
// persisted to localStorage (see store.js partialize).
export const createSettingsSlice = (set) => ({
  settings: {
    basePace: DEFAULT_BASE_PACE_S_PER_KM,
    kFatigue: DEFAULT_K_FATIGUE,
  },

  setBasePace: (value) =>
    set(
      (state) => ({
        settings: {
          ...state.settings,
          basePace: clamp(
            Number(value),
            MIN_BASE_PACE_S_PER_KM,
            MAX_BASE_PACE_S_PER_KM,
          ),
        },
      }),
      undefined,
      "settings/setBasePace",
    ),

  setKFatigue: (value) =>
    set(
      (state) => ({
        settings: {
          ...state.settings,
          kFatigue: clamp(Number(value), MIN_K_FATIGUE, MAX_K_FATIGUE),
        },
      }),
      undefined,
      "settings/setKFatigue",
    ),

  resetPaceSettings: () =>
    set(
      (state) => ({
        settings: {
          ...state.settings,
          basePace: DEFAULT_BASE_PACE_S_PER_KM,
          kFatigue: DEFAULT_K_FATIGUE,
        },
      }),
      undefined,
      "settings/resetPaceSettings",
    ),
});
