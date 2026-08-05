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
