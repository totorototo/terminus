import { lazy, Suspense, useEffect } from "react";

import AutoSizer from "react-virtualized-auto-sizer";
import { useParams } from "wouter";
import { useShallow } from "zustand/react/shallow";

import { useGPXWorker } from "../../hooks/useGPXWorker.js";
import { useIsDesktop } from "../../hooks/useIsDesktop.js";
import useStore from "../../store/store.js";
import Commands from "../commands/Commands.jsx";
import DesktopLayout from "../desktopLayout/DesktopLayout.jsx";
import LoadingSpinner from "../loadingSpinner/LoadingSpinner.jsx";
import MobileLayout from "../mobileLayout/MobileLayout.jsx";
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

  return (
    <div className={className}>
      <AutoSizer>
        {({ width, height }) => {
          return (
            <Suspense fallback={<LoadingSpinner />}>
              <Scene width={width} height={height} />
              {isDesktop ? (
                <DesktopLayout />
              ) : (
                <MobileLayout
                  containerHeight={height}
                  topLocked
                  pushThresholdGap={40}
                  top={<LocationFreshness waiting={projectedTimestamp === 0} />}
                  overlay={
                    PUSH_NOTIFICATIONS_ENABLED &&
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
                    )
                  }
                  bottom={<TrailData showElevationProfile />}
                />
              )}
              <Commands follower />
            </Suspense>
          );
        }}
      </AutoSizer>
    </div>
  );
}

const StyledFollowerScreen = style(FollowerScreen);

export default StyledFollowerScreen;
