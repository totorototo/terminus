/**
 * Build the lookup the ETA hooks use to prefer the Zig live recalibration over
 * the a-priori model. Returns a Map of `endIndex → cumulativeRemainingS` for the
 * forward (current + future) intervals, or null when recalibration must not apply
 * yet: no GPS lock, race not started, or no recalibration available.
 *
 * Keyed on endIndex because the sanitized id is a string while the Zig eta carries
 * the interval's end trace index — the same value sections/stages expose, so the
 * hooks can match a row to its recalibrated remaining time.
 *
 * @param {{ etas?: Array<{ endIndex: number, cumulativeRemainingS: number }> } | null} recal
 * @param {{ hasGPSLock: boolean, raceNotStarted: boolean }} gate
 * @returns {Map<number, number> | null}
 */
export function recalLookup(recal, { hasGPSLock, raceNotStarted }) {
  if (!(hasGPSLock && !raceNotStarted && recal?.etas?.length > 0)) return null;
  return new Map(recal.etas.map((e) => [e.endIndex, e.cumulativeRemainingS]));
}
