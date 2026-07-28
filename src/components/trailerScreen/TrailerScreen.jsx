import { useEffect, useRef } from "react";

import { useParams } from "wouter";
import { useShallow } from "zustand/react/shallow";

import { useGPXWorker } from "../../hooks/useGPXWorker.js";
import useStore from "../../store/store.js";
import LoadingSpinner from "../loadingSpinner/LoadingSpinner.jsx";
import Story from "../story/Story.jsx";

import style from "./TrailerScreen.style";

function TrailerScreen({ className }) {
  const { raceId } = useParams();
  const { isWorkerReady } = useGPXWorker(raceId);
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
      {!isWorkerReady ? <LoadingSpinner /> : <Story />}
    </div>
  );
}

const StyledTrailerScreen = style(TrailerScreen);

export default StyledTrailerScreen;
