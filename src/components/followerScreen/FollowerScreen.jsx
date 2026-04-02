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
import TopSheetPanel, {
  COLLAPSED_HEIGHT,
} from "../topSheetPanel/TopSheetPanel.jsx";
import TrailData from "../trailData/TrailData.jsx";
import LocationFreshness from "./LocationFreshness/LocationFreshness.jsx";

import style from "./FollowerScreen.style";

const Scene = lazy(() => import("../scene/Scene.jsx"));

const PUSH_NOTIFICATIONS_ENABLED = true;

function FollowerScreen({ className }) {
  const { roomId, raceId } = useParams();
  useGPXWorker(raceId);
  const isDesktop = useIsDesktop();

  const {
    connectToFollowerSession,
    disconnectFollowerSession,
    enableNotifications,
    notificationPermission,
    setRaceId,
  } = useStore(
    useShallow((state) => ({
      connectToFollowerSession: state.connectToFollowerSession,
      disconnectFollowerSession: state.disconnectFollowerSession,
      enableNotifications: state.enableNotifications,
      notificationPermission: state.gps.notificationPermission,
      setRaceId: state.setRaceId,
    })),
  );

  useEffect(() => {
    if (raceId) setRaceId(raceId);
  }, [raceId, setRaceId]);

  useEffect(() => {
    if (!roomId) return;
    connectToFollowerSession(roomId);
    return () => disconnectFollowerSession();
  }, [roomId, connectToFollowerSession, disconnectFollowerSession]);

  const projectedTimestamp = useStore(
    (state) => state.gps.projectedLocation.timestamp,
  );

  // containerHeight ref keeps handleTopHeightChange stable across resizes.
  const containerHeight = useRef(0);
  const bottomPanelRef = useRef();
  const bottomIsOpen = useRef(false);

  // The bottom panel's resting visible top edge sits PANEL_HEIGHT above the
  // container bottom. We leave an extra gap equal to COLLAPSED_HEIGHT so the
  // top sheet must expand past its collapsed state before pushing the bottom one.
  const PUSH_THRESHOLD_GAP = 40; // px of breathing room between the two panels
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
                    locked
                  >
                    <LocationFreshness waiting={projectedTimestamp === 0} />
                  </TopSheetPanel>
                  {PUSH_NOTIFICATIONS_ENABLED &&
                    notificationPermission == null &&
                    projectedTimestamp !== 0 && (
                      <button
                        type="button"
                        className="notify-btn"
                        onClick={enableNotifications}
                        aria-label="Enable push notifications for runner updates"
                      >
                        Enable notifications
                      </button>
                    )}
                  <BottomSheetPanel
                    ref={bottomPanelRef}
                    containerHeight={height}
                    onOpenChange={(open) => {
                      bottomIsOpen.current = open;
                    }}
                  >
                    <TrailData showElevationProfile />
                  </BottomSheetPanel>
                </>
              )}
              <Commands follower />
            </Suspense>
          );
        }}
      </AutoSizer>
    </div>
  );
}

export default style(FollowerScreen);
