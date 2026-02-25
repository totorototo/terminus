import { a, config, useSpring } from "@react-spring/web";
import { useDrag } from "@use-gesture/react";

import style from "./TopSheetPanel.style.js";

const COLLAPSED_HEIGHT = 140;
const EXPANDED_HEIGHT = 420;

function ExpandablePanel({ children, className }) {
  const [{ height }, api] = useSpring(() => ({ height: COLLAPSED_HEIGHT }));

  const handleExpand = ({ canceled }) => {
    // when cancel is true, it means that the user passed the downwards threshold
    // so we change the spring config to create a nice wobbly effect
    api.start({
      height: EXPANDED_HEIGHT,
      immediate: false,
      config: canceled ? config.wobbly : config.stiff,
    });
  };

  const handleCollapse = (velocity = 0) => {
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
          ? handleCollapse(Math.abs(vy))
          : handleExpand({ canceled });
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
      role="region"
      aria-label="Navigation panel. Drag to expand or collapse."
      {...bind()}
      style={{
        height,
      }}
    >
      {children}
    </a.div>
  );
}

export default style(ExpandablePanel);
