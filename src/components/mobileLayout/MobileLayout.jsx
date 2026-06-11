import { memo, useCallback, useEffect, useRef } from "react";

import BottomSheetPanel, {
  PANEL_HEIGHT,
} from "../bottomSheetPanel/BottomSheetPanel.jsx";
import TopSheetPanel, {
  COLLAPSED_HEIGHT,
} from "../topSheetPanel/TopSheetPanel.jsx";

const MobileLayout = memo(function MobileLayout({
  containerHeight,
  top,
  bottom,
  overlay,
  topLocked = false,
  pushThresholdGap = 50, // px of breathing room between the two panels
}) {
  // Ref mirrors the prop so handleTopHeightChange stays stable across resizes.
  const containerHeightRef = useRef(0);
  useEffect(() => {
    containerHeightRef.current = containerHeight;
  }, [containerHeight]);
  const bottomPanelRef = useRef();
  const bottomIsOpen = useRef(false);

  const handleTopHeightChange = useCallback(
    (topH) => {
      const bottomVisibleTop =
        containerHeightRef.current -
        PANEL_HEIGHT -
        COLLAPSED_HEIGHT -
        pushThresholdGap;
      const push = topH - bottomVisibleTop;
      if (push > 0) {
        bottomPanelRef.current?.push(push);
      } else {
        bottomPanelRef.current?.release();
      }
    },
    [pushThresholdGap],
  );

  return (
    <>
      <TopSheetPanel
        containerHeight={containerHeight}
        onHeightChange={handleTopHeightChange}
        bottomPanelOpenRef={bottomIsOpen}
        locked={topLocked}
      >
        {top}
      </TopSheetPanel>
      {overlay}
      <BottomSheetPanel
        ref={bottomPanelRef}
        containerHeight={containerHeight}
        onOpenChange={(open) => {
          bottomIsOpen.current = open;
        }}
      >
        {bottom}
      </BottomSheetPanel>
    </>
  );
});

export default MobileLayout;
