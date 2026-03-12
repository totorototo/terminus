import { lazy, Suspense, useCallback, useEffect, useRef } from "react";

import AutoSizer from "react-virtualized-auto-sizer";
import { useParams } from "wouter";
import { useShallow } from "zustand/react/shallow";

import { useGPXWorker } from "../../hooks/useGPXWorker.js";
import useStore from "../../store/store.js";
import BottomSheetPanel, {
  PANEL_HEIGHT,
} from "../bottomSheetPanel/BottomSheetPanel.jsx";
import LoadingSpinner from "../loadingSpinner/LoadingSpinner.jsx";
import TopSheetPanel from "../topSheetPanel/TopSheetPanel.jsx";
import TrailData from "../trailData/TrailData.jsx";
import LocationFreshness from "./LocationFreshness/LocationFreshness.jsx";

import style from "./Follower.style";

const Scene = lazy(() => import("../scene/Scene.jsx"));

const PUSH_NOTIFICATIONS_ENABLED = false;

function Follower({ className }) {
  const { roomId, raceId } = useParams();
  useGPXWorker(raceId);

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

  // containerHeight ref keeps handleTopHeightChange stable across resizes.
  const containerHeight = useRef(0);
  const bottomPanelRef = useRef();
  const bottomIsOpen = useRef(false);

  // Bottom panel visible top edge = containerHeight - PANEL_HEIGHT - 100.
  // When top panel grows past that, push bottom panel down by the overlap.
  const handleTopHeightChange = useCallback((topH) => {
    const bottomVisibleTop = containerHeight.current - PANEL_HEIGHT - 180;
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
              <TopSheetPanel
                containerHeight={height}
                onHeightChange={handleTopHeightChange}
                bottomPanelOpenRef={bottomIsOpen}
                locked
              >
                <LocationFreshness />
              </TopSheetPanel>
              {PUSH_NOTIFICATIONS_ENABLED && notificationPermission == null && (
                <button className="notify-btn" onClick={enableNotifications}>
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
            </Suspense>
          );
        }}
      </AutoSizer>
    </div>
  );
}

export default style(Follower);
