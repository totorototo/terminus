import { useEffect, lazy, Suspense } from "react";
import AutoSizer from "react-virtualized-auto-sizer";
import style from "./Follower.style";
import useStore from "../../store/store.js";
import { useGPXWorker } from "../../hooks/useGPXWorker.js";
import LoadingSpinner from "../loadingSpinner/LoadingSpinner.jsx";
import BottomSheetPanel from "../bottomSheetPanel/BottomSheetPanel.jsx";
import TopSheetPanel from "../topSheetPanel/TopSheetPanel.jsx";
import TrailData from "../trailData/TrailData.jsx";
import LocationFreshness from "./LocationFreshness/LocationFreshness.jsx";
import { useShallow } from "zustand/react/shallow";

const Scene = lazy(() => import("../scene/Scene.jsx"));

function Follower({ className }) {
  useGPXWorker();

  const {
    connectToFollowerSession,
    disconnectFollowerSession,
    followerRoomId,
  } = useStore(
    useShallow((state) => ({
      connectToFollowerSession: state.connectToFollowerSession,
      disconnectFollowerSession: state.disconnectFollowerSession,
      followerRoomId: state.app.followerRoomId,
    })),
  );

  useEffect(() => {
    if (!followerRoomId) return;

    connectToFollowerSession(followerRoomId);

    return () => disconnectFollowerSession();
  }, [followerRoomId, connectToFollowerSession, disconnectFollowerSession]);

  return (
    <div className={className}>
      <Suspense fallback={<LoadingSpinner />}>
        <AutoSizer>
          {({ width, height }) => <Scene width={width} height={height} />}
        </AutoSizer>
        <TopSheetPanel>
          <LocationFreshness />
        </TopSheetPanel>
        <BottomSheetPanel>
          <TrailData showElevationProfile />
        </BottomSheetPanel>
      </Suspense>
    </div>
  );
}

export default style(Follower);
