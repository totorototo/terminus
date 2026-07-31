import { createGlobalStyle, ThemeProvider } from "styled-components";

import App from "./App.jsx";
import useStore from "./store/store.js";
import THEME from "./theme/Theme";

const setDefaultColors = (variant = "dark") => {
  return Object.entries(THEME.colors[variant]).reduce((accu, [rule, value]) => {
    return `${rule}:${value}; ${accu}`;
  }, "");
};

const setFonts = () => {
  const strings = Object.entries(THEME.font).map(([_, category]) => {
    return Object.entries(category).reduce((accu, [rule, value]) => {
      return `${rule}:${value}; ${accu}`;
    }, "");
  });
  return strings.join(";");
};

// why: presbyopia (age-related loss of near-focus) makes sub-16px text hard
// to read on a phone at arm's length outdoors, worsened by trail glare. A
// flat 1.35x scale (not a fixed px bump) keeps the existing size hierarchy
// intact across xxsmall..xxlarge, and the bolder weight compensates for
// sunlight washing out thin strokes. Opt-in rather than viewport-detected
// (matchMedia has no reliable "user has presbyopia" signal) — see
// OutdoorModeToggle.
//
// Scaling happens on the theme object (not just the :root CSS custom
// properties below) because every *.style.js in this codebase reads sizes
// via props.theme.font.sizes["--font-size-x"] as a JS value, not var(...) —
// the CSS custom properties are only consumed by one legacy component.
const OUTDOOR_FONT_SCALE = 1.35;

const scaleFontSizes = (sizes, scale) =>
  Object.fromEntries(
    Object.entries(sizes).map(([rule, value]) => [
      rule,
      `${Math.round(parseFloat(value) * scale)}px`,
    ]),
  );

const setOutdoorFontOverrides = (enabled) => {
  if (!enabled) return "";
  const sizes = Object.entries(
    scaleFontSizes(THEME.font.sizes, OUTDOOR_FONT_SCALE),
  ).reduce((accu, [rule, value]) => `${rule}:${value}; ${accu}`, "");
  return `${sizes}; --font-weight-medium: ${THEME.font.weights["--font-weight-semibold"]};`;
};

const GlobalStyle = createGlobalStyle`
 :root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;

  color-scheme: ${(props) => props.theme.currentVariant};
  color: rgba(255, 255, 255, 0.87);

  ${(props) => setDefaultColors(props.theme.currentVariant)};
  ${setFonts()};
  ${(props) => setOutdoorFontOverrides(props.theme.outdoorMode)};

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;


}

html {
  height: 100%;
  /* Prevent iOS bounce scrolling */
  overflow: hidden;
  -webkit-overflow-scrolling: touch;
}


/* Apply safe-area insets when supported */
body {
  margin: 0;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 100vh;
  min-width: 320px;

  /* Ensure full coverage */
  background-color: var(--color-background);

  /* iOS PWA specific fixes */
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  -webkit-text-size-adjust: none;
}

/* Main app container */
#root {
  width: 100%;
  height: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* Specific iOS PWA safe area handling */
@supports(padding: max(0px)) {
  body {
    /* Use max() to ensure minimum padding even when safe-area is 0 */
    padding-top: max(var(--safe-area-inset-top), 0px);
    padding-right: max(var(--safe-area-inset-right), 0px);
    padding-bottom: max(var(--safe-area-inset-bottom), 0px);
    padding-left: max(var(--safe-area-inset-left), 0px);
  }
}

body *,
body *:before,
body *:after {
  box-sizing: border-box;
  padding: 0;
  margin: 0;
}

:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  border-radius: var(--border-radius-xs);
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
`;

function ThemedApp() {
  const themeVariant = useStore((state) => state.app.theme) ?? "dark";
  const outdoorMode = useStore((state) => state.app.outdoorMode);
  const themedTheme = {
    ...THEME,
    currentVariant: themeVariant,
    outdoorMode,
    font: outdoorMode
      ? {
          ...THEME.font,
          sizes: scaleFontSizes(THEME.font.sizes, OUTDOOR_FONT_SCALE),
          weights: {
            ...THEME.font.weights,
            "--font-weight-medium":
              THEME.font.weights["--font-weight-semibold"],
          },
        }
      : THEME.font,
  };

  return (
    <ThemeProvider theme={themedTheme}>
      <App />
      <GlobalStyle />
    </ThemeProvider>
  );
}

export default ThemedApp;
