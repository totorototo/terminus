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
