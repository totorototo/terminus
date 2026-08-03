// Maps a trace index to an estimated real-world clock time, from data already
// resident in the store (sections' Minetti-estimated durations, cumulative
// distances, race start time) — no new GPX pipeline, no store slice; consumed
// directly from a component's useMemo alongside sunTimes.js's sun position.

/**
 * Estimated clock time (UTC ms epoch) at a trace index, from a static pre-race
 * Minetti estimate — accumulates `section.estimatedDuration` up to `index`,
 * interpolating fractionally within whichever section contains it. Mirrors the
 * pre-race branch of useCheckpointETAs.js/PaceProfile.jsx's section-duration
 * accumulation. Returns null if there's no race start time to anchor to (no
 * `<time>` on the GPX start waypoint) or no section data.
 */
export function clockTimeAtIndex(
  index,
  sections,
  cumulativeDistances,
  raceStartMs,
) {
  if (raceStartMs == null || !sections?.length || !cumulativeDistances?.length)
    return null;

  let elapsedS = 0;
  for (const section of sections) {
    if (index >= section.endIndex) {
      elapsedS += section.estimatedDuration;
    } else if (index >= section.startIndex) {
      const distDone =
        (cumulativeDistances[index] || 0) -
        (cumulativeDistances[section.startIndex] || 0);
      const fractionDone =
        section.totalDistance > 0 ? distDone / section.totalDistance : 0;
      elapsedS += section.estimatedDuration * fractionDone;
      break;
    } else {
      break;
    }
  }

  return raceStartMs + elapsedS * 1000;
}
