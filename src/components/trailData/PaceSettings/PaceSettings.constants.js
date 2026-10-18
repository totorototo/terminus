/** Runner profiles — each bundles a pace and fatigue value. */
export const RUNNER_PROFILES = [
  {
    label: "Casual",
    basePaceSPerKm: 600,
    kFatigue: 0.004,
    sub: "~10 min/km on flat",
  },
  {
    label: "Trail",
    basePaceSPerKm: 365,
    kFatigue: 0.003,
    sub: "~6 min/km on flat",
  },
  {
    label: "Athlete",
    basePaceSPerKm: 330,
    kFatigue: 0.002,
    sub: "~5:30 min/km on flat",
  },
  {
    label: "Elite",
    basePaceSPerKm: 300,
    kFatigue: 0.001,
    sub: "~5 min/km on flat",
  },
];

export const LIFE_BASE_STOP_OPTIONS = [
  { label: "None", value: 0, sub: "No rest at checkpoints" },
  { label: "30 min", value: 1800, sub: "Quick stop at each LifeBase" },
  { label: "1 hour", value: 3600, sub: "Full rest at each LifeBase" },
  { label: "2 hours", value: 7200, sub: "Long rest at each LifeBase" },
];

/** Pick the option whose numeric value is closest to the stored value. */
export function closestOption(options, value) {
  return options.reduce((best, opt) =>
    Math.abs(opt.value - value) < Math.abs(best.value - value) ? opt : best,
  );
}

/** A pace model as one line: "7:30/km flat · fatigue 0.003 · 1h00 at each LifeBase". */
export function modelText({ basePaceSPerKm, kFatigue, lifeBaseStopS }) {
  const pace = Math.round(basePaceSPerKm);
  const paceText = `${Math.floor(pace / 60)}:${String(pace % 60).padStart(2, "0")}/km flat`;
  const stopMin = Math.round(lifeBaseStopS / 60);
  const stopText =
    stopMin === 0
      ? "no stop at LifeBases"
      : `${Math.floor(stopMin / 60)}h${String(stopMin % 60).padStart(2, "0")} at each LifeBase`;
  return `${paceText} · fatigue ${kFatigue} · ${stopText}`;
}

// What to do about a plan.json gpxz refused, by the Zig error's name. Zigar
// reports it as words ("Course mismatch"): match either form.
const PLAN_FILE_ERRORS = {
  CourseMismatch:
    "This plan.json was made for another GPX, or for this one before it was edited.",
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
