// Below this, a segment counts as flat rather than uphill/downhill — keeps
// noise from GPS/elevation jitter out of the gradient stats.
const FLAT_GRADE_THRESHOLD_PCT = 2;

// why: there's no walking-fitness profile anywhere else in the app, so unlike
// the run estimate (which uses whichever Runner profile the user picked in
// the Pace section), walking pace stays a single generic hiking reference —
// 12:00/km on flat ground.
const WALK_FLAT_PACE_S_PER_KM = 720;

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
 * RunnabilityIndex renders) drives both time estimates so a segment that
 * reads "Hike-only" there is exactly what slows the walk/run totals here.
 *
 * `runBasePaceSPerKm` is the currently selected Runner profile's flat-ground
 * pace (app.paceSettings.basePaceSPerKm) — the run estimate scales with
 * whichever profile the user picked, same as the rest of the app.
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
  const walkSpeedMPerS = 1000 / WALK_FLAT_PACE_S_PER_KM;

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

    runTimeS += (segDist * paceFactor) / runSpeedMPerS;
    walkTimeS += (segDist * paceFactor) / walkSpeedMPerS;
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
