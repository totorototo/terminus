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
