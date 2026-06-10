// Live-recalibration results keyed by boundary kind. Each value is the worker's
// sanitized RECALIBRATE payload, or null before a fix / when the route lacks two
// boundaries of that kind — in which case the hooks fall back to the a-priori model.
export const createRecalibrationSlice = (set) => ({
  recalibration: {
    section: null,
    stage: null,
  },

  setRecalibration: (kind, result) =>
    set(
      (state) => ({
        recalibration: {
          ...state.recalibration,
          [kind]: result,
        },
      }),
      undefined,
      `recalibration/set/${kind}`,
    ),

  clearRecalibration: () =>
    set(
      { recalibration: { section: null, stage: null } },
      undefined,
      "recalibration/clear",
    ),
});
