// Shared between SectionETA (checkpoint legs) and StageETA (life-base stages):
// the two panels are twins rendering the same breadcrumb timeline at different
// granularities, so the rail math and formatting live here once. A "leg" is
// either a section or a stage — both carry startIndex/endIndex and the same
// distance/elevation/duration/difficulty fields.

export function formatDuration(sec) {
  if (!sec || !Number.isFinite(sec) || sec <= 0) return "--";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

// why: one vocabulary in every Trail Suite app (design system StatusBadge) —
// the badge names the margin to the cutoff, not the pace: 1h or more is OK,
// under 1h is Tight, past it is Over.
const TIGHT_MARGIN_MS = 60 * 60 * 1000;

export const CUTOFF_BADGE_LABELS = { ok: "OK", tight: "Tight", over: "Over" };

/** Badge tier from a cutoff margin in ms (cutoff minus arrival), or null. */
export function cutoffTier(marginMs) {
  if (marginMs == null || !Number.isFinite(marginMs)) return null;
  if (marginMs < 0) return "over";
  return marginMs < TIGHT_MARGIN_MS ? "tight" : "ok";
}

// why: a GPS fix far from the race date (a replay, a test, a stale plan)
// gives margins of thousands of hours — true, but unreadable in a 2-cell
// grid. Past this the badge already says it all.
const MAX_MARGIN_HOURS = 99;

/** Margin as the design system writes it: "1h04", "−0h24" (minus sign). */
export function formatMargin(marginMs) {
  if (marginMs == null || !Number.isFinite(marginMs)) return "--";
  const totalMinutes = Math.round(Math.abs(marginMs) / 60_000);
  const h = Math.floor(totalMinutes / 60);
  if (h > MAX_MARGIN_HOURS) {
    return `${marginMs < 0 ? "−" : ""}${MAX_MARGIN_HOURS}h+`;
  }
  const m = String(totalMinutes % 60).padStart(2, "0");
  return `${marginMs < 0 && totalMinutes > 0 ? "−" : ""}${h}h${m}`;
}
