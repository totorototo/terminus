import { useEffect } from "react";

import { useLocation } from "wouter";

import { trackPageview } from "../lib/analytics.js";

export const usePageTracking = () => {
  const [location] = useLocation();
  useEffect(() => {
    trackPageview(location);
  }, [location]);
};
