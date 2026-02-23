import { useEffect, lazy, Suspense } from "react";
import AutoSizer from "react-virtualized-auto-sizer";
import { useSearch } from "wouter";
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

  const { setProjectedLocation, gpsData } = useStore(
    useShallow((state) => ({
      setProjectedLocation: state.setProjectedLocation,
      gpsData: state.gpx.data,
    })),
  );

  // Get query parameters - index and timestamp (latitude and longitude are not used yet)
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const index = searchParams.get("index");
  const timestamp = searchParams.get("timestamp");

  // Update store with projected location if query params are defined
  useEffect(() => {
    if (index !== null && timestamp !== null && gpsData?.length) {
      const pointIndex = parseInt(index);
      const point = gpsData[pointIndex];

      if (point) {
        setProjectedLocation({
          timestamp: parseInt(timestamp),
          coords: point,
          index: pointIndex,
        });
      }
    }
  }, [index, timestamp, gpsData, setProjectedLocation]);

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
