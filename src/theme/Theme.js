const THEME = {
  colors: {
    light: {
      "--color-background": "#f4f7f5",
      "--color-text": "#262424",
      "--color-primary": "#ABFC3A",
      "--color-secondary": "#3e7cb1",
      "--color-accent": "#ad343e",
      "--color-progress": "#8b8e8c",
      "--color-surface": "#e2e5e3",
    },
    dark: {
      "--color-background": "#262424",
      "--color-text": "#f4f7f5",
      "--color-primary": "#f2af29",
      "--color-secondary": "#3e7cb1",
      "--color-accent": "#ad343e",
      "--color-progress": "#8da192",
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
