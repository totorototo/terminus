import { useRef } from "react";

import { a, config, useSpring } from "@react-spring/web";
import { useDrag } from "@use-gesture/react";

import style from "./TopSheetPanel.style.js";

const COLLAPSED_HEIGHT = 140;
const BOTTOM_MARGIN = 60;

function ExpandablePanel({
  children,
  className,
  containerHeight,
  onHeightChange,
  bottomPanelOpenRef,
}) {
  const [{ height }, api] = useSpring(() => ({ height: COLLAPSED_HEIGHT }));

  // Keep a ref so the drag handler always reads the latest containerHeight
  // without needing to be recreated on every resize.
  const containerHeightRef = useRef(containerHeight);
  containerHeightRef.current = containerHeight;

  const getExpandedHeight = () => containerHeightRef.current - BOTTOM_MARGIN;

  const handleExpand = ({ canceled }) => {
    api.start({
      height: getExpandedHeight(),
      immediate: false,
      config: canceled ? config.wobbly : config.stiff,
      onChange: ({ value }) => onHeightChange?.(value.height),
    });
  };

  const handleCollapse = (velocity = 0) => {
    api.start({
      height: COLLAPSED_HEIGHT,
      immediate: false,
      config: { ...config.stiff, velocity },
      onChange: ({ value }) => onHeightChange?.(value.height),
    });
  };

  const bind = useDrag(
    ({
      first,
      last,
      velocity: [, vy],
      direction: [, dy],
      offset: [, oy],
      cancel,
      canceled,
    }) => {
      // Block expansion entirely when bottom panel is open.
      // The user must close the bottom panel first.
      if (bottomPanelOpenRef?.current) {
        if (first) cancel();
        return;
      }

      const expandedHeight = getExpandedHeight();

      if (oy > expandedHeight - COLLAPSED_HEIGHT + 20) cancel();

      if (last) {
        oy < (expandedHeight - COLLAPSED_HEIGHT) * 0.5 || (vy < -0.5 && dy < 0)
          ? handleCollapse(Math.abs(vy))
          : handleExpand({ canceled });
      } else {
        const newHeight = COLLAPSED_HEIGHT + Math.max(0, oy);
        api.start({ height: newHeight, immediate: true });
        onHeightChange?.(newHeight);
      }
    },
    {
      from: () => [0, height.get() - COLLAPSED_HEIGHT],
      filterTaps: true,
      bounds: () => ({ bottom: getExpandedHeight() - COLLAPSED_HEIGHT }),
      rubberband: true,
    },
  );

  return (
    <a.div
      className={className}
      role="region"
      aria-label="Navigation panel. Drag to expand or collapse."
      {...bind()}
      style={{ height }}
    >
      {children}
    </a.div>
  );
}

export default style(ExpandablePanel);
