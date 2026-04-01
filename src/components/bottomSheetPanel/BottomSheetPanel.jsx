import { forwardRef, useImperativeHandle, useRef } from "react";

import { a, config, useReducedMotion, useSpring } from "@react-spring/web";
import { useDrag } from "@use-gesture/react";

import style from "./BottomSheetPanel.style.js";

// Height of the closed-state Y translation.
// Visible height when open = PANEL_HEIGHT + 100.
// Peek height when closed = 100px (always).
export const PANEL_HEIGHT = 540;

function BottomSheetPanel(
  { children, className, containerHeight, onOpenChange },
  ref,
) {
  const reducedMotion = useReducedMotion();

  // Tracks what position the user has set via dragging (0 = open, PANEL_HEIGHT = peek).
  const intendedY = useRef(PANEL_HEIGHT);

  const [{ y }, api] = useSpring(() => ({ y: PANEL_HEIGHT }));

  // Exposed to parent so top panel expansion can push this panel down.
  useImperativeHandle(ref, () => ({
    push(externalY) {
      // No cap: top panel can push bottom fully off screen.
      api.start({
        y: Math.max(intendedY.current, externalY),
        immediate: true,
      });
    },
    release() {
      api.start({
        y: intendedY.current,
        immediate: reducedMotion,
        config: config.stiff,
      });
    },
  }));

  const handleOpen = ({ canceled }) => {
    intendedY.current = 0;
    onOpenChange?.(true);
    api.start({
      y: 0,
      immediate: reducedMotion,
      config: canceled ? config.wobbly : config.stiff,
    });
  };

  const handleClose = (velocity = 0) => {
    intendedY.current = PANEL_HEIGHT;
    onOpenChange?.(false);
    api.start({
      y: PANEL_HEIGHT,
      immediate: reducedMotion,
      config: { ...config.stiff, velocity },
    });
  };

  const bind = useDrag(
    ({
      last,
      velocity: [, vy],
      direction: [, dy],
      offset: [, oy],
      cancel,
      canceled,
    }) => {
      if (oy < -20) cancel();

      if (last) {
        oy > PANEL_HEIGHT * 0.5 || (vy > 0.5 && dy > 0)
          ? handleClose(vy)
          : handleOpen({ canceled });
      } else api.start({ y: oy, immediate: true });
    },
    {
      axis: "y",
      from: () => [0, y.get()],
      filterTaps: true,
      bounds: { top: 0 },
      rubberband: true,
    },
  );

  return (
    <a.div
      className={className}
      role="region"
      aria-label="Trail data panel. Drag to open or close."
      {...bind()}
      style={{
        bottom: PANEL_HEIGHT - containerHeight,
        width: "96vw",
        height: containerHeight + 100,
        y,
        maxWidth: "600px",
        left: "50%",
        transform: "translateX(-50%)",
      }}
    >
      {children}
    </a.div>
  );
}

export default style(forwardRef(BottomSheetPanel));
