import { useEffect } from "react";

import { track } from "../lib/analytics.js";

export const usePageTracking = () => {
  useEffect(() => {
    const isPWA =
      window.matchMedia("(display-mode: standalone)").matches ||
      navigator.standalone === true;
    track("app-launch", { displayMode: isPWA ? "standalone" : "browser" });
  }, []);
};
