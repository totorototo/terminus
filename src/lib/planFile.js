// The race's plan.json, made in Regimen: what the pace model runs with. gpxz
// reads it in the worker (READ_PLAN_FILE); this file only checks the pick and
// words the model and gpxz's refusals for the screens.

// A plan is a few KiB per hundred checkpoints; gpxz refuses past 4 MiB.
export const MAX_PLAN_BYTES = 4 * 1024 * 1024;

/**
 * Check a picked or dropped plan.json before reading it. Returns an error
 * message for the wizard to show, or null when the file can be opened.
 */
export const checkPlanFile = (file) => {
  if (!file) return "No file selected.";
  if (!/\.json$/i.test(file.name)) return "Choose the race's plan.json.";
  if (file.size === 0) return "This file is empty.";
  if (file.size > MAX_PLAN_BYTES) return "This file is too large for a plan.";
  return null;
};

/** A flat pace as "7:30/km". */
export function paceText(basePaceSPerKm) {
  const pace = Math.round(basePaceSPerKm);
  return `${Math.floor(pace / 60)}:${String(pace % 60).padStart(2, "0")}/km`;
}

/** A pace model as one line: "7:30/km flat · fatigue 0.003 · 1h00 at each LifeBase". */
export function modelText({ basePaceSPerKm, kFatigue, lifeBaseStopS }) {
  const stopMin = Math.round(lifeBaseStopS / 60);
  const stopText =
    stopMin === 0
      ? "no stop at LifeBases"
      : `${Math.floor(stopMin / 60)}h${String(stopMin % 60).padStart(2, "0")} at each LifeBase`;
  return `${paceText(basePaceSPerKm)} flat · fatigue ${kFatigue} · ${stopText}`;
}

/**
 * A plan's fueling targets as one line:
 * "70 g carbs · 500 ml fluid · 400 mg sodium per hour · 30 min reserve".
 */
export function fuelingText({
  carbsGPerH,
  fluidMlPerH,
  sodiumMgPerH,
  reserveS,
}) {
  const reserveMin = Math.round(reserveS / 60);
  const reserveText =
    reserveMin === 0 ? "no reserve" : `${reserveMin} min reserve`;
  return `${carbsGPerH} g carbs · ${fluidMlPerH} ml fluid · ${sodiumMgPerH} mg sodium per hour · ${reserveText}`;
}

// What to do about a plan.json gpxz refused, by the Zig error's name. Zigar
// reports it as words ("Course mismatch"): match either form.
const PLAN_FILE_ERRORS = {
  CourseMismatch:
    "This plan.json was made for another GPX, or for this one before it was edited. Open the plan you made for this race in Regimen.",
  PlanInvalid: "This plan.json's numbers don't add up. Was it edited by hand?",
  SchemaVersionUnsupported:
    "This plan.json is from a newer Regimen. Update Terminus.",
};

const squash = (text) => String(text).replace(/\s+/g, "").toLowerCase();

export function planFileError(error) {
  const known = Object.keys(PLAN_FILE_ERRORS).find(
    (name) => squash(name) === squash(error),
  );
  return known ? PLAN_FILE_ERRORS[known] : "This file is not a plan.json.";
}
