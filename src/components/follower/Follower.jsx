import { lazy, Suspense, useEffect } from "react";

import AutoSizer from "react-virtualized-auto-sizer";
import { useParams } from "wouter";
import { useShallow } from "zustand/react/shallow";

import { useGPXWorker } from "../../hooks/useGPXWorker.js";
import useStore from "../../store/store.js";
import BottomSheetPanel from "../bottomSheetPanel/BottomSheetPanel.jsx";
import LoadingSpinner from "../loadingSpinner/LoadingSpinner.jsx";
import TopSheetPanel from "../topSheetPanel/TopSheetPanel.jsx";
import TrailData from "../trailData/TrailData.jsx";
import LocationFreshness from "./LocationFreshness/LocationFreshness.jsx";

import style from "./Follower.style";

const Scene = lazy(() => import("../scene/Scene.jsx"));

function Follower({ className }) {
  useGPXWorker();

  const { roomId } = useParams();

  const { connectToFollowerSession, disconnectFollowerSession } = useStore(
    useShallow((state) => ({
      connectToFollowerSession: state.connectToFollowerSession,
      disconnectFollowerSession: state.disconnectFollowerSession,
    })),
  );

  useEffect(() => {
    if (!roomId) return;

    connectToFollowerSession(roomId);

    return () => disconnectFollowerSession();
  }, [roomId, connectToFollowerSession, disconnectFollowerSession]);

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
