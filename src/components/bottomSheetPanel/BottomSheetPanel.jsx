import React from "react";
import { useSpring, a, config } from "@react-spring/web";
import { useDrag } from "@use-gesture/react";

const height = 350;

export default function BottomSheetPanel({ children }) {
  const [{ y }, api] = useSpring(() => ({ y: height }));

  const open = ({ canceled }) => {
    // when cancel is true, it means that the user passed the upwards threshold
    // so we change the spring config to create a nice wobbly effect
    api.start({
      y: 0,
      immediate: false,
      config: canceled ? config.wobbly : config.stiff,
    });
  };
  const close = (velocity = 0) => {
    api.start({
      y: height,
      immediate: false,
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
      // if the user drags up passed a threshold, then we cancel
      // the drag so that the sheet resets to its open position

      if (oy < -20) cancel();

      // when the user releases the sheet, we check whether it passed
      // the threshold for it to close, or if we reset it to its open positino
      if (last) {
        oy > height * 0.5 || (vy > 0.5 && dy > 0)
          ? close(vy)
          : open({ canceled });
      }
      // when the user keeps dragging, we just move the sheet according to
      // the cursor position
      else api.start({ y: oy, immediate: true });
    },
    {
      from: () => [0, y.get()],
      filterTaps: true,
      bounds: { top: 0 },
      rubberband: true,
    },
  );

  return (
    <a.div
      {...bind()}
      style={{
        zIndex: 1000,
        position: "fixed",
        bottom: `calc(-100vh + ${height}px)`,
        opacity: 0.9,
        left: "2vw",
        width: "96vw",
        overflow: "hidden",
        height: "calc(100vh + 100px)",
        background: "#474646ff",
        borderRadius: "24px",
        color: "#222",
        touchAction: "none",
        y,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
      }}
    >
      {children}
    </a.div>
  );
}
