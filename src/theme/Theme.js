const THEME = {
  colors: {
    light: {
      "--color-background": "#c4c4c4",
      "--color-text": "#363537",
      "--color-secondary": "#DA7422",
      "--color-primary": "#6A7FDB",
      "--color-accent": "#D81E5B",
      "--color-progress": "#ededed",
      "--color-surface": "#ebe7e2",
      "--color-primary-text": "#2A3AA5",
      "--color-secondary-text": "#7A3509",
    },
    dark: {
      "--color-background": "#3A3335",
      "--color-text": "#D8DBE2",
      "--color-primary": "#f2af29",
      "--color-secondary": "#6E9075",
      "--color-primary-text": "#f2af29",
      "--color-secondary-text": "#9DC4A4",
      "--color-accent": "#D81E5B",
      "--color-progress": "#ced5e0",
      "--color-surface": "#3d3b3b",
    },
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
