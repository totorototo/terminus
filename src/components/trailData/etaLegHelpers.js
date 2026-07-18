// Shared between SectionETA (checkpoint legs) and StageETA (life-base stages):
// the two panels are twins rendering the same breadcrumb timeline at different
// granularities, so the rail math and formatting live here once. A "leg" is
// either a section or a stage — both carry startIndex/endIndex and the same
// distance/elevation/duration/difficulty fields.

// Distance-scaled connector rail: each leg's height grows with its real
// distance (px), floored so the in-rail caption stays legible and capped so
// a single long leg can't dominate the scroll.
const RAIL_MIN_PX = 64;
const RAIL_PER_KM = 7;
const RAIL_MAX_PX = 220;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function railHeightPx(distKm) {
  return Math.round(
    clamp(RAIL_MIN_PX + distKm * RAIL_PER_KM, RAIL_MIN_PX, RAIL_MAX_PX),
  );
}

// Progress within a leg: full when passed, fractional when current (via the
// runner's projected index), empty ahead. Drives the rail fill and bead.
export function legProgress(
  leg,
  isPast,
  isCurrent,
  cumulativeDistances,
  projIndex,
) {
  if (isPast) return 100;
  if (!isCurrent || !leg || !cumulativeDistances.length) return 0;
  const segStart = cumulativeDistances[leg.startIndex] || 0;
  const segEnd = cumulativeDistances[leg.endIndex] || 0;
  const here = cumulativeDistances[projIndex] || 0;
  const span = segEnd - segStart;
  return span > 0 ? clamp((here - segStart) / span, 0, 1) * 100 : 0;
}

export function formatDuration(sec) {
  if (!sec || !Number.isFinite(sec) || sec <= 0) return "--";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}
