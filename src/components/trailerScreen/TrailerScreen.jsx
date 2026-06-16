import { lazy, Suspense, useEffect, useRef } from "react";

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
  const { disconnectTrailerSession, setMode, setRaceId, resumeAutoShare } =
    useStore(
      useShallow((state) => ({
        disconnectTrailerSession: state.disconnectTrailerSession,
        setMode: state.setMode,
        setRaceId: state.setRaceId,
        resumeAutoShare: state.resumeAutoShare,
      })),
    );

  // Capture the persisted auto-share intent once, before any effect (notably
  // disconnectTrailerSession on StrictMode unmount) can flip the live flag.
  const wasAutoSharing = useRef(useStore.getState().gps.autoShareEnabled);

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

  // Resume broadcasting once the worker (and thus GPX/raceId) is ready, if the
  // user had auto-share enabled before reload. resumeAutoShare is idempotent.
  useEffect(() => {
    if (wasAutoSharing.current && isWorkerReady) {
      resumeAutoShare();
    }
  }, [isWorkerReady, resumeAutoShare]);

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

const StyledTrailerScreen = style(TrailerScreen);

export default StyledTrailerScreen;
