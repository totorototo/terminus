import { lazy, Suspense, useCallback, useEffect, useRef } from "react";

import AutoSizer from "react-virtualized-auto-sizer";
import { useParams } from "wouter";
import { useShallow } from "zustand/react/shallow";

import { useGPXWorker } from "../../hooks/useGPXWorker.js";
import { useIsDesktop } from "../../hooks/useIsDesktop.js";
import useStore from "../../store/store.js";
import BottomSheetPanel, {
  PANEL_HEIGHT,
} from "../bottomSheetPanel/BottomSheetPanel.jsx";
import Commands from "../commands/Commands.jsx";
import DesktopLayout from "../desktopLayout/DesktopLayout.jsx";
import LoadingSpinner from "../loadingSpinner/LoadingSpinner.jsx";
import Navigation from "../navigation/Navigation.jsx";
import TopSheetPanel, {
  COLLAPSED_HEIGHT,
} from "../topSheetPanel/TopSheetPanel.jsx";
import TrailData from "../trailData/TrailData.jsx";

import style from "./TrailerScreen.style";

// Lazy load 3D Scene (imports Three.js, React Three Fiber, Drei)
const Scene = lazy(() => import("../scene/Scene.jsx"));

function TrailerScreen({ className }) {
  const { raceId } = useParams();
  const { isWorkerReady } = useGPXWorker(raceId);
  const isDesktop = useIsDesktop();
  const { disconnectTrailerSession, setMode, setRaceId } = useStore(
    useShallow((state) => ({
      disconnectTrailerSession: state.disconnectTrailerSession,
      setMode: state.setMode,
      setRaceId: state.setRaceId,
    })),
  );

  useEffect(() => {
    setMode("trailer");
    return () => {
      disconnectTrailerSession();
      setMode(null);
    };
  }, [setMode, disconnectTrailerSession]);

  useEffect(() => {
    if (raceId) setRaceId(raceId);
  }, [raceId, setRaceId]);

  // containerHeight ref keeps handleTopHeightChange stable across resizes.
  const containerHeight = useRef(0);
  const bottomPanelRef = useRef();
  const bottomIsOpen = useRef(false);

  const PUSH_THRESHOLD_GAP = 50; // px of breathing room between the two panels
  const handleTopHeightChange = useCallback((topH) => {
    const bottomVisibleTop =
      containerHeight.current -
      PANEL_HEIGHT -
      COLLAPSED_HEIGHT -
      PUSH_THRESHOLD_GAP;
    const push = topH - bottomVisibleTop;
    if (push > 0) {
      bottomPanelRef.current?.push(push);
    } else {
      bottomPanelRef.current?.release();
    }
  }, []);

  return (
    isWorkerReady && (
      <div className={className}>
        <AutoSizer>
          {({ width, height }) => {
            containerHeight.current = height;
            return (
              <Suspense fallback={<LoadingSpinner />}>
                <Scene width={width} height={height} />
                {isDesktop ? (
                  <DesktopLayout />
                ) : (
                  <>
                    <TopSheetPanel
                      containerHeight={height}
                      onHeightChange={handleTopHeightChange}
                      bottomPanelOpenRef={bottomIsOpen}
                    >
                      <Navigation />
                    </TopSheetPanel>
                    <BottomSheetPanel
                      ref={bottomPanelRef}
                      containerHeight={height}
                      onOpenChange={(open) => {
                        bottomIsOpen.current = open;
                      }}
                    >
                      <TrailData />
                    </BottomSheetPanel>
                  </>
                )}
                <Commands />
              </Suspense>
            );
          }}
        </AutoSizer>
      </div>
    )
  );
}

export default style(TrailerScreen);
