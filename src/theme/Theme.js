const LIGHT = {
  "--color-background": "#c4c4c4",
  "--color-text": "#363537",
  "--color-secondary": "#DA7422",
  "--color-primary": "#6A7FDB",
  "--color-accent": "#D81E5B",
  "--color-progress": "#ededed",
  "--color-surface": "#ebe7e2",
  "--color-primary-text": "#2A3AA5",
  "--color-secondary-text": "#7A3509",
  "--color-accent-text": "#971143",
  "--color-success": "#16a34a",
  // Design system tokens (Trail Suite, 2026-10-17). Text steps, status
  // marks and the terrain mauve; each is checked at 4.5:1 (text) or
  // 3:1 (marks) on background and surface.
  "--color-text-muted": "rgba(54, 53, 55, 0.88)",
  "--color-text-faint": "rgba(54, 53, 55, 0.82)",
  "--color-hairline": "rgba(54, 53, 55, 0.10)",
  "--color-success-text": "#2c563d",
  "--color-behind": "#d01d58",
  "--color-ahead": "#117c38",
  "--color-control-border": "#6e6b6d",
  "--color-on-button-primary": "#ffffff",
  "--color-direction-up": "rgba(54, 53, 55, 0.85)",
  "--color-direction-flat": "rgba(54, 53, 55, 0.30)",
  "--color-direction-down": "rgba(54, 53, 55, 0.55)",
  "--color-effort-1": "#8f559d",
  "--color-effort-2": "#72447e",
  "--color-effort-3": "#573460",
  "--color-effort-4": "#3d2444",
  "--color-effort-5": "#231526",
  "--color-profile-day": "rgba(143, 85, 157, 0.35)",
  "--color-profile-night": "rgba(61, 36, 68, 0.60)",
};

const DARK = {
  "--color-background": "#3A3335",
  "--color-text": "#D8DBE2",
  "--color-primary": "#f2af29",
  "--color-secondary": "#6E9075",
  "--color-primary-text": "#f2af29",
  "--color-secondary-text": "#9DC4A4",
  "--color-accent": "#d81e5b",
  "--color-progress": "#ced5e0",
  "--color-surface": "#3d3b3b",
  "--color-success": "#22c55e",
  "--color-accent-text": "#f382a4",
  "--color-text-muted": "rgba(216, 219, 226, 0.75)",
  "--color-text-faint": "rgba(216, 219, 226, 0.70)",
  "--color-hairline": "rgba(216, 219, 226, 0.10)",
  "--color-behind": "#e64b7e",
  "--color-control-border": "#8d8a90",
  "--color-direction-up": "rgba(216, 219, 226, 0.85)",
  "--color-direction-flat": "rgba(216, 219, 226, 0.30)",
  "--color-direction-down": "rgba(216, 219, 226, 0.55)",
  "--color-effort-1": "#a774b4",
  "--color-effort-2": "#b489bf",
  "--color-effort-3": "#c5a3cd",
  "--color-effort-4": "#d6bedc",
  "--color-effort-5": "#e7daeb",
  "--color-profile-day": "rgba(214, 190, 220, 0.70)",
  "--color-profile-night": "rgba(167, 116, 180, 0.55)",
};

// why: these name a meaning, not a new value — deriving them from the base
// token keeps them from drifting when the base changes (behind-text must stay
// the accent text, the focus ring the primary that reads on the ground).
const lightAliases = {
  "--color-behind-text": LIGHT["--color-accent-text"],
  "--color-ahead-text": LIGHT["--color-success-text"],
  "--color-focus": LIGHT["--color-primary-text"],
  "--color-button-primary": LIGHT["--color-primary-text"],
};

const darkAliases = {
  "--color-success-text": DARK["--color-success"],
  "--color-behind-text": DARK["--color-accent-text"],
  "--color-ahead": DARK["--color-secondary"],
  "--color-ahead-text": DARK["--color-secondary-text"],
  "--color-focus": DARK["--color-primary"],
  "--color-button-primary": DARK["--color-primary"],
  "--color-on-button-primary": DARK["--color-background"],
};

const THEME = {
  colors: {
    light: { ...LIGHT, ...lightAliases },
    dark: { ...DARK, ...darkAliases },
  },

  font: {
    family: {
      "--font-family-sansSerif":
        "'Inter', 'Roboto', 'Helvetica', 'Arial', sans-serif",
      "--font-family-mono": "'SF Mono', 'Menlo', 'Consolas', monospace",
    },
    weights: {
      "--font-weight-bold": "600",
      "--font-weight-semibold": "500",
      "--font-weight-medium": "400",
      "--font-weight-thin": "300",
      "--font-weight-light": "200",
    },
    sizes: {
      "--font-size-xxsmall": "9px",
      "--font-size-xsmall": "10px",
      "--font-size-tiny": "12px",
      "--font-size-small": "14px",
      "--font-size": "16px",
      "--font-size-medium": "20px",
      "--font-size-large": "24px",
      "--font-size-xlarge": "32px",
      "--font-size-xxlarge": "48px",
    },
  },

  borderRadius: {
    "--border-radius-xs": "2px",
    "--border-radius-sm": "4px",
    "--border-radius-md": "12px",
    "--border-radius-base": "16px",
    "--border-radius-lg": "24px",
    "--border-radius-xl": "28px",
    "--border-radius-full": "50%",
  },

  zIndex: {
    "--z-index-overlay": "10",
    "--z-index-modal": "1000",
  },

  transitions: {
    "--transition-instant": "0.1s ease",
    "--transition-fast": "0.15s ease",
    "--transition-base": "0.2s ease",
    "--transition-slow": "0.3s ease",
    "--transition-standard": "0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    "--transition-xslow": "0.4s ease",
  },

  spacing: [0, 2, 4, 8, 16, 32, 64, 128, 256],
  breakpoints: ["40em", "52em", "64em"],
};

export default THEME;
