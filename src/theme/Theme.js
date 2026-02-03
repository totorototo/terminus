const THEME = {
  colors: {
    light: {
      "--color-background": "#f4f7f5",
      "--color-text": "#262424",
      "--color-primary": "#ABFC3A",
      "--color-secondary": "#3e7cb1",
      "--color-accent": "#ad343e",
      "--color-progress": "#8b8e8c",
    },
    dark: {
      "--color-background": "#262424",
      "--color-text": "#f4f7f5",
      "--color-primary": "#f2af29",
      "--color-secondary": "#3e7cb1",
      "--color-accent": "#ad343e",
      "--color-progress": "#8b8e8c",
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
      "--font-weight-medium": "400",
      "--font-weight-light": "300",
    },
    sizes: {
      "--font-size-small": "14px",
      "--font-size": "16px",
      "--font-size-medium": "20px",
      "--font-size-large": "24px",
      "--font-size-xlarge": "32px",
      "--font-size-xxlarge": "48px",
    },
  },
  breakpoints: ["40em", "52em", "64em"],
};

export default THEME;
