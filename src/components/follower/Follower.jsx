import { useEffect, lazy, Suspense } from "react";
import PartySocket from "partysocket";
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

const PARTYKIT_HOST = import.meta.env.VITE_PARTYKIT_HOST ?? "localhost:1999";

const Scene = lazy(() => import("../scene/Scene.jsx"));

function Follower({ className }) {
  useGPXWorker();

  const { setProjectedLocation, followerRoomId } = useStore(
    useShallow((state) => ({
      setProjectedLocation: state.setProjectedLocation,
      followerRoomId: state.app.followerRoomId,
    })),
  );

  useEffect(() => {
    if (!followerRoomId) return;

    const socket = new PartySocket({
      host: PARTYKIT_HOST,
      room: followerRoomId,
    });

    socket.addEventListener("message", (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "location") {
        setProjectedLocation({
          timestamp: msg.timestamp,
          coords: msg.coords,
          index: msg.index,
        });
      }
    });

    return () => socket.close();
  }, [followerRoomId, setProjectedLocation]);

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
