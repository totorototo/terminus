// The race's fueling, as Regimen planned it in plan.json: hourly targets, a
// supply and a carry per plan entry. Terminus only reads it: the carry is the
// plan's, at the plan's times, never re-sized to live ETAs (gpxz's
// carry_compute would be the place for that, not this file).

export const SUPPLY_LABELS = { water: "Water", full: "Full refill" };

/**
 * The plan's supply and carry at plan entry `entry` (0 is the start, entry
 * i + 1 is section i's end), or null without fueling, or when the plan's
 * entries don't line up with the route's `sectionCount` sections.
 */
export function entryFueling(fueling, sectionCount, entry) {
  if (!fueling || fueling.supplies.length !== sectionCount + 1) return null;
  if (entry < 0 || entry > sectionCount) return null;
  return { supply: fueling.supplies[entry], carry: fueling.carry[entry] };
}

/**
 * The first checkpoint not yet reached where the runner refills, as
 * { index, checkpoint, supply, carry } (index into checkpointETAs), or null.
 */
export function nextRefill(fueling, checkpointETAs) {
  const count = checkpointETAs?.length ?? 0;
  for (let index = 0; index < count; index++) {
    const checkpoint = checkpointETAs[index];
    if (checkpoint.isPast) continue;
    const at = entryFueling(fueling, count, index + 1);
    if (at && at.supply !== "none" && at.carry) {
      return { index, checkpoint, ...at };
    }
  }
  return null;
}

// What the hourly targets come to over `durationS`, rounded up as gpxz rounds
// the carry, so the view never reads less than the plan sized for.
function intakeOver(fueling, durationS) {
  const hours = durationS / 3600;
  return {
    carbsG: Math.ceil(fueling.carbsGPerH * hours),
    fluidMl: Math.ceil(fueling.fluidMlPerH * hours),
    sodiumMg: Math.ceil(fueling.sodiumMgPerH * hours),
  };
}

/**
 * The plan's fueling, entry by entry, for the fueling view: one row per plan
 * entry (the start, then each section's end) and the race's totals. Each row
 * holds its supply and carry, and, from the plan's times, its arrival, its
 * stop and what the targets come to on the leg into it (departure from the
 * entry before to arrival here; stops are left out, as the carry leaves out
 * the stop where it refills). Null without fueling, or when the plan's entries
 * don't line up with the route's sections. Without the plan's times (a fueling
 * kept before Terminus read them), the times, intakes and totals are null.
 */
export function fuelingRows(fueling, sections) {
  const sectionCount = sections?.length ?? 0;
  if (!fueling || sectionCount === 0) return null;
  if (fueling.supplies.length !== sectionCount + 1) return null;
  const times =
    fueling.times?.length === sectionCount + 1 ? fueling.times : null;

  const rows = fueling.supplies.map((supply, entry) => {
    const time = times?.[entry] ?? null;
    const previous = entry > 0 ? (times?.[entry - 1] ?? null) : null;
    return {
      entry,
      name:
        entry === 0
          ? sections[0].startLocation
          : sections[entry - 1].endLocation,
      supply,
      carry: fueling.carry[entry],
      arrivalS: time?.arrivalS ?? null,
      stopS: time ? time.departureS - time.arrivalS : null,
      intake:
        time && previous
          ? intakeOver(fueling, time.arrivalS - previous.departureS)
          : null,
    };
  });

  const finishS = times ? times[times.length - 1].arrivalS : null;
  const totals =
    finishS == null
      ? null
      : {
          durationS: finishS,
          // Stops count here: the runner keeps eating at a time barrier.
          ...intakeOver(fueling, finishS),
        };
  return { rows, totals };
}

function fluidText(ml) {
  if (ml < 1000) return `${ml} ml`;
  return `${(ml / 1000).toFixed(2).replace(/\.?0+$/, "")} L`;
}

function sodiumText(mg) {
  if (mg < 1000) return `${mg} mg sodium`;
  return `${(mg / 1000).toFixed(1).replace(/\.0$/, "")} g sodium`;
}

/**
 * A carry as one line: "455 g carbs · 1.65 L · 2.6 g sodium", or "900 ml" at
 * a water point, where carbs and sodium aren't refilled.
 */
export function carryText(carry) {
  const parts = [];
  if (carry.carbsG != null) parts.push(`${carry.carbsG} g carbs`);
  parts.push(fluidText(carry.fluidMl));
  if (carry.sodiumMg != null) parts.push(sodiumText(carry.sodiumMg));
  return parts.join(" · ");
}
