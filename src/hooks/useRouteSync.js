import { useEffect } from "react";
import { useLocation } from "wouter";
import useStore from "../store/store";

const EPHEMERAL_ROUTES = ["/"];

export const useRouteSync = () => {
  const [location, navigate] = useLocation();
  const setCurrentRoute = useStore((s) => s.setCurrentRoute);
  const currentRoute = useStore((s) => s.app.currentRoute);

  // Restore persisted route on mount
  useEffect(() => {
    if (
      EPHEMERAL_ROUTES.includes(location) &&
      currentRoute &&
      !EPHEMERAL_ROUTES.includes(currentRoute)
    ) {
      navigate(currentRoute, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist route on every navigation
  useEffect(() => {
    setCurrentRoute(location);
  }, [location, setCurrentRoute]);
};
