import React from "react";
import { useSpring, a, config } from "@react-spring/web";
import { useDrag } from "@use-gesture/react";

const COLLAPSED_HEIGHT = 100;
const EXPANDED_HEIGHT = 300;

function ExpandablePanel({ children, className }) {
  const [{ height }, api] = useSpring(() => ({ height: COLLAPSED_HEIGHT }));

  const expand = ({ canceled }) => {
    // when cancel is true, it means that the user passed the downwards threshold
    // so we change the spring config to create a nice wobbly effect
    api.start({
      height: EXPANDED_HEIGHT,
      immediate: false,
      config: canceled ? config.wobbly : config.stiff,
    });
  };

  const collapse = (velocity = 0) => {
    api.start({
      height: COLLAPSED_HEIGHT,
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
      // if the user drags down passed a threshold, then we cancel
      // the drag so that the sheet resets to its expanded position
      if (oy > EXPANDED_HEIGHT - COLLAPSED_HEIGHT + 20) cancel();

      // when the user releases the sheet, we check whether it passed
      // the threshold for it to collapse, or if we reset it to its expanded position
      if (last) {
        oy < (EXPANDED_HEIGHT - COLLAPSED_HEIGHT) * 0.5 || (vy < -0.5 && dy < 0)
          ? collapse(Math.abs(vy))
          : expand({ canceled });
      }
      // when the user keeps dragging, we just move the sheet according to
      // the cursor position
      else
        api.start({
          height: COLLAPSED_HEIGHT + Math.max(0, oy),
          immediate: true,
        });
    },
    {
      from: () => [0, height.get() - COLLAPSED_HEIGHT],
      filterTaps: true,
      bounds: { bottom: EXPANDED_HEIGHT - COLLAPSED_HEIGHT },
      rubberband: true,
    },
  );

  return (
    <a.div
      className={className}
      {...bind()}
      style={{
        height,
        opacity: 0.9,
        background: "#474646ff",
        overflow: "hidden",
        borderRadius: "24px",
        border: "1px solid #2d2c2cff",
        cursor: "ns-resize",
        userSelect: "none",
        touchAction: "none",
        position: "absolute",
        top: 20,
        left: "2vw",
        width: "96vw",
        boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
        zIndex: 1000,
        containerType: "size",
        maxWidth: "600px",
        left: "50%",
        transform: "translateX(-50%)",
      }}
    >
      {children}
    </a.div>
  );
}

export default ExpandablePanel;
