// Strava/Tour de France style climb categorization: score = distance(m) × avg gradient(%).
// why: reuses the same score shape as zig/climbs.zig's Garmin qualification score
// (climbDistM × avgGradient) so category and "does this even count as a climb" share
// one mental model. Thresholds mirror Strava's published category cutoffs.
const CATEGORIES = [
  { key: "4", label: "Cat 4", minScore: 8_000 },
  { key: "3", label: "Cat 3", minScore: 16_000 },
  { key: "2", label: "Cat 2", minScore: 32_000 },
  { key: "1", label: "Cat 1", minScore: 64_000 },
  { key: "HC", label: "HC", minScore: 80_000 },
];

/**
 * Categorizes a qualified climb. Returns null when the climb is too mild to
 * rank (below Cat 4) — it still shows up in the list, just without a badge.
 */
export function getClimbCategory(climb) {
  const score = climb.climbDistM * climb.avgGradient;

  let matchIndex = -1;
  for (let i = 0; i < CATEGORIES.length; i++) {
    if (score >= CATEGORIES[i].minScore) matchIndex = i;
  }
  if (matchIndex === -1) return null;

  const { key, label } = CATEGORIES[matchIndex];
  return { key, label, score };
}
