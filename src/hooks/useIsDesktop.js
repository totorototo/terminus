import { useMediaQuery } from "@uidotdev/usehooks";

// Screens at or above this width use the desktop panel layout.
// Below this threshold the mobile sheet panel layout is shown instead.
const DESKTOP_BREAKPOINT_PX = 993;

export function useIsDesktop() {
  return useMediaQuery(
    `only screen and (min-width: ${DESKTOP_BREAKPOINT_PX}px)`,
  );
}
