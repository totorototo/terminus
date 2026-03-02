import { lazy, Suspense, useEffect } from "react";

import AutoSizer from "react-virtualized-auto-sizer";
import { useParams } from "wouter";
import { useShallow } from "zustand/react/shallow";

import { useGPXWorker } from "../../hooks/useGPXWorker.js";
import useStore from "../../store/store.js";
import BottomSheetPanel from "../bottomSheetPanel/BottomSheetPanel.jsx";
import Commands from "../commands/Commands.jsx";
import LoadingSpinner from "../loadingSpinner/LoadingSpinner.jsx";
import Navigation from "../navigation/Navigation.jsx";
import TopSheetPanel from "../topSheetPanel/TopSheetPanel.jsx";
import TrailData from "../trailData/TrailData.jsx";

import style from "./Trailer.style";

// Lazy load 3D Scene (imports Three.js, React Three Fiber, Drei)
const Scene = lazy(() => import("../scene/Scene.jsx"));

function Trailer({ className }) {
  const { isWorkerReady } = useGPXWorker();
  const { raceId } = useParams();
  const { disconnectTrailerSession, setMode, setRaceId } = useStore(
    useShallow((state) => ({
      disconnectTrailerSession: state.disconnectTrailerSession,
      setMode: state.setMode,
      setRaceId: state.setRaceId,
    })),
  );

  // Set trailer mode on mount so GPS slice knows to broadcast, clean up on unmount
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

  return (
    isWorkerReady && (
      <div className={className}>
        <Suspense fallback={<LoadingSpinner />}>
          <AutoSizer>
            {({ width, height }) => <Scene width={width} height={height} />}
          </AutoSizer>
        </Suspense>
        <TopSheetPanel>
          <Navigation />
        </TopSheetPanel>
        <BottomSheetPanel>
          <TrailData />
        </BottomSheetPanel>
        <Commands />
      </div>
    )
  );
}

export default style(Trailer);
