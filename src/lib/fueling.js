// The race's fueling, as Regimen planned it in plan.json: hourly targets, a
// supply and a carry per plan entry. Terminus only reads it: the carry is the
// plan's, at the plan's times, never re-sized to live ETAs (gpxz's
// carry_compute would be the place for that, not this file).

const SUPPLIES = new Set(["none", "water", "full"]);

// A plan has one entry per section boundary; this bounds what a follower
// accepts over the relay long before memory would matter.
const ENTRIES_MAX = 10_000;

export const SUPPLY_LABELS = { water: "Water", full: "Full refill" };

const isAmount = (value) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;
const isOptionalAmount = (value) => value === null || isAmount(value);

const isValidCarry = (carry) =>
  carry === null ||
  (typeof carry === "object" &&
    isAmount(carry.fluidMl) &&
    isOptionalAmount(carry.carbsG) &&
    isOptionalAmount(carry.sodiumMg));

/**
 * Whether `fueling` has the shape the worker's sanitizeFueling gives. gpxz
 * validated the plan; this guards what a follower receives over the relay.
 */
export function isValidFueling(fueling) {
  if (fueling == null || typeof fueling !== "object") return false;
  const { carbsGPerH, fluidMlPerH, sodiumMgPerH, reserveS } = fueling;
  if (![carbsGPerH, fluidMlPerH, sodiumMgPerH, reserveS].every(isAmount)) {
    return false;
  }
  const { supplies, carry } = fueling;
  if (!Array.isArray(supplies) || !Array.isArray(carry)) return false;
  if (supplies.length > ENTRIES_MAX || carry.length !== supplies.length) {
    return false;
  }
  return (
    supplies.every((supply) => SUPPLIES.has(supply)) &&
    carry.every(isValidCarry)
  );
}

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
