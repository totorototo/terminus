import React from "react";
import { useSpring, a, config } from "@react-spring/web";
import { useDrag } from "@use-gesture/react";
import style from "./BottomSheetPanel.style.js";

const height = 350;

function BottomSheetPanel({ children, className }) {
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
      className={className}
      {...bind()}
      style={{
        bottom: `calc(-100vh + ${height}px)`,
        width: "96vw",
        height: "calc(100vh + 100px)",
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

export default style(BottomSheetPanel);
