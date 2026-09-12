// Below this, a segment counts as flat rather than uphill/downhill — keeps
// noise from GPS/elevation jitter out of the gradient stats.
const FLAT_GRADE_THRESHOLD_PCT = 2;

// Segments at/above this Minetti paceFactor count as "walk" rather than
// "run" — same cutoff as RunnabilityIndex's "Hike-only" band, so a stretch
// that reads Hike-only there is exactly what lands in walkTimeS here.
const HIKE_ONLY_PACE_FACTOR = 2.3;

// why: there's no separate walking-fitness profile in the app, so the walk
// pace is derived from the selected Runner profile's flat run pace rather
// than picked independently — a fixed extra cost per km, not a multiplier,
// since the gap between running and walking a flat km is roughly constant
// in absolute terms across ability levels (unlike run paces, which vary
// ~2x between Casual and Elite).
const WALK_PACE_OFFSET_S_PER_KM = 300;

const UPHILL_GRADE_BANDS = [
  { max: 5, label: "2–5%" },
  { max: 10, label: "5–10%" },
  { max: 15, label: "10–15%" },
  { max: 20, label: "15–20%" },
  { max: Infinity, label: "20%+" },
];

/**
 * Derives route-level terrain and effort stats purely from data the pace
 * engine already computes (slopes, paceFactors, cumulativeDistances) — no
 * Zig/worker round-trip needed.
 *
 * `paceFactors` (Minetti cost-of-transport multiplier, same values
 * RunnabilityIndex renders) both picks walk-vs-run per segment and scales
 * its time, so a segment that reads "Hike-only" there is exactly what lands
 * in walkTimeS here. walkTimeS and runTimeS are therefore two disjoint
 * pieces of the same route, not two alternate whole-route hypotheticals —
 * they sum to this runner's total estimated time on the route.
 *
 * `runBasePaceSPerKm` is the currently selected Runner profile's flat-ground
 * pace (app.paceSettings.basePaceSPerKm) — both the run and (derived) walk
 * estimates scale with whichever profile the user picked.
 */
export function computeRouteStats({
  slopes,
  paceFactors,
  cumulativeDistances,
  runBasePaceSPerKm,
}) {
  if (!slopes?.length || !paceFactors?.length || !cumulativeDistances?.length) {
    return null;
  }

  let uphillDist = 0;
  let downhillDist = 0;
  let flatDist = 0;
  let uphillGradeWeighted = 0;
  let downhillGradeWeighted = 0;
  let runTimeS = 0;
  let walkTimeS = 0;
  const uphillBandDist = UPHILL_GRADE_BANDS.map(() => 0);

  const runSpeedMPerS = 1000 / runBasePaceSPerKm;
  const walkSpeedMPerS = 1000 / (runBasePaceSPerKm + WALK_PACE_OFFSET_S_PER_KM);

  const n = Math.min(
    slopes.length,
    paceFactors.length,
    cumulativeDistances.length,
  );

  for (let i = 1; i < n; i++) {
    const segDist = cumulativeDistances[i] - cumulativeDistances[i - 1];
    if (!(segDist > 0)) continue;

    const grade = slopes[i] || 0;
    const paceFactor = paceFactors[i] || 1;

    if (grade > FLAT_GRADE_THRESHOLD_PCT) {
      uphillDist += segDist;
      uphillGradeWeighted += grade * segDist;
      const bandIndex = UPHILL_GRADE_BANDS.findIndex(
        (band) => grade < band.max,
      );
      uphillBandDist[bandIndex] += segDist;
    } else if (grade < -FLAT_GRADE_THRESHOLD_PCT) {
      downhillDist += segDist;
      downhillGradeWeighted += grade * segDist;
    } else {
      flatDist += segDist;
    }

    if (paceFactor >= HIKE_ONLY_PACE_FACTOR) {
      walkTimeS += (segDist * paceFactor) / walkSpeedMPerS;
    } else {
      runTimeS += (segDist * paceFactor) / runSpeedMPerS;
    }
  }

  const totalDist = uphillDist + downhillDist + flatDist;
  if (totalDist <= 0) return null;

  return {
    avgUphillGradePct: uphillDist > 0 ? uphillGradeWeighted / uphillDist : 0,
    avgDownhillGradePct:
      downhillDist > 0 ? downhillGradeWeighted / downhillDist : 0,
    terrainBreakdown: {
      uphillPct: (uphillDist / totalDist) * 100,
      flatPct: (flatDist / totalDist) * 100,
      downhillPct: (downhillDist / totalDist) * 100,
    },
    uphillGradientDistribution: UPHILL_GRADE_BANDS.map((band, i) => ({
      label: band.label,
      distanceM: uphillBandDist[i],
    })),
    walkTimeS,
    runTimeS,
  };
}
