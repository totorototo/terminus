// Live-recalibration results, keyed by boundary kind ("section" / "stage").
//
// Each value is the sanitized payload posted back by the worker's RECALIBRATE
// handler (calibrationFactor, calibratedBasePaceSPerKm, predictedSoFarS,
// actualElapsedS, etas[]), or null before the runner has a GPS fix / when the
// route lacks two boundaries of that kind. Hooks (useCheckpointETAs,
// useStageETAs) read these and fall back to the a-priori model when absent.
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
