import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createGlobalStyle, ThemeProvider } from "styled-components";
import App from "./App.jsx";
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

const GlobalStyle = createGlobalStyle`
 :root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;

  color-scheme: light dark;
  color: rgba(255, 255, 255, 0.87);

  ${setDefaultColors()};    
  ${setFonts()}; 

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  
  /* Define safe area custom properties */
  --safe-area-inset-top: env(safe-area-inset-top, 0px);
  --safe-area-inset-right: env(safe-area-inset-right, 0px);
  --safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
  --safe-area-inset-left: env(safe-area-inset-left, 0px);
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

  /* Use CSS custom properties for better compatibility */
  padding-top: var(--safe-area-inset-top);
  padding-right: var(--safe-area-inset-right);
  padding-bottom: var(--safe-area-inset-bottom);
  padding-left: var(--safe-area-inset-left);

  /* Ensure full coverage */
  background-color: #262424ff;

  /* iOS PWA specific fixes */
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  -webkit-text-size-adjust: none;
}

/* Main app container should respect safe areas */
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
`;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider theme={THEME}>
      <App />
      <GlobalStyle />
    </ThemeProvider>
  </StrictMode>,
);
