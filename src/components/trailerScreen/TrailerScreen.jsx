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
import Navigation from "../navigation/Navigation.jsx";
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

  return (
    <div className={className}>
      {!isWorkerReady ? (
        <LoadingSpinner />
      ) : (
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
                    top={<Navigation />}
                    bottom={<TrailData />}
                  />
                )}
                <Commands />
              </Suspense>
            );
          }}
        </AutoSizer>
      )}
    </div>
  );
}

export default style(TrailerScreen);
