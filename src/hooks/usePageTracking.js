import { useEffect } from "react";

import { useLocation } from "wouter";

import { track, trackPageview } from "../lib/analytics.js";

export const usePageTracking = () => {
  const [location] = useLocation();

  useEffect(() => {
    const isPWA =
      window.matchMedia("(display-mode: standalone)").matches ||
      navigator.standalone === true;
    track("app-launch", { displayMode: isPWA ? "standalone" : "browser" });
  }, []);

  useEffect(() => {
    trackPageview(location);
  }, [location]);
};
