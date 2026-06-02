// Elevation grade and colors constants omitted for brevity, reuse from your code.
// Elevation grade constants
export const ELEVATION_GRADE = {
  SMALL: 0,
  EASY: 1,
  MEDIUM: 2,
  DIFFICULT: 3,
  HARD: 4,
  UNKNOWN: 5,
};

export const ELEVATION_COLORS = {
  SMALL: "#F4F6F5",
  EASY: "#ECBC3E",
  MEDIUM: "#EA8827",
  DIFFICULT: "#E1351D",
  HARD: "#96451F",
  UNKNOWN: "#00451F",
};

// Difficulty levels 1–5 mapped to the elevation color palette.
// Level 1 uses a distinct green since ELEVATION_COLORS.SMALL is near-white (designed for 3D mesh).
export const DIFFICULTY_LABELS = [
  "Easy",
  "Moderate",
  "Hard",
  "Very Hard",
  "Extreme",
];
export const DIFFICULTY_COLORS = [
  "#4CAF50", // 1 Easy     (green — visible text alternative to SMALL)
  ELEVATION_COLORS.EASY, // 2 Moderate
  ELEVATION_COLORS.MEDIUM, // 3 Hard
  ELEVATION_COLORS.DIFFICULT, // 4 Very Hard
  ELEVATION_COLORS.HARD, // 5 Extreme
];

// ── Minetti pace/effort model — user-tunable inputs ───────────────────────────
// These mirror the defaults in zig/minetti.zig and drive the section/stage
// estimated-duration computation. They are user-adjustable (sliders) and
// persisted to localStorage.

// Flat-terrain reference pace (seconds per km). 530 s/km = 8:50/km.
export const DEFAULT_BASE_PACE_S_PER_KM = 530;
export const MIN_BASE_PACE_S_PER_KM = 240; // 4:00/km — fast trail runner
export const MAX_BASE_PACE_S_PER_KM = 900; // 15:00/km — hiking pace
export const BASE_PACE_STEP_S_PER_KM = 5;

// Fatigue coefficient added per 1 000 m of effort-weighted distance.
export const DEFAULT_K_FATIGUE = 0.0035;
export const MIN_K_FATIGUE = 0; // no cumulative fatigue
export const MAX_K_FATIGUE = 0.02; // strong fatigue (short, hard efforts)
export const K_FATIGUE_STEP = 0.0005;
