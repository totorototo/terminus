import { StrictMode } from "react";

import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";

import ErrorBoundary from "./ErrorBoundary.jsx";
import ThemedApp from "./ThemedApp.jsx";

// Best-effort portrait lock for installed PWA / fullscreen contexts
screen.orientation?.lock?.("portrait").catch(() => {});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
        <ThemedApp />
      </HelmetProvider>
    </ErrorBoundary>
  </StrictMode>,
);
