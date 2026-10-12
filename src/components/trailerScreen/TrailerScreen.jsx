import { useEffect, useRef } from "react";

import { useLocation } from "wouter";
import { useShallow } from "zustand/react/shallow";

import { useGPXWorker } from "../../hooks/useGPXWorker.js";
import useStore from "../../store/store.js";
import LoadingSpinner from "../loadingSpinner/LoadingSpinner.jsx";
import Story from "../story/Story.jsx";
import ThemeToggle from "../story/ThemeToggle.jsx";

import style from "./TrailerScreen.style";

function TrailerScreen({ className }) {
  const { isWorkerReady, missing } = useGPXWorker();
  const [, navigate] = useLocation();
  const { disconnectTrailerSession, setMode, resumeAutoShare } = useStore(
    useShallow((state) => ({
      disconnectTrailerSession: state.disconnectTrailerSession,
      setMode: state.setMode,
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

  // No GPX stored on this device: the wizard is where one gets opened.
  useEffect(() => {
    if (missing) navigate("/", { replace: true });
  }, [missing, navigate]);

  // Resume periodic GPS fixes once the worker is ready, if the user had them
  // on before reload. resumeAutoShare is idempotent.
  useEffect(() => {
    if (wasAutoSharing.current && isWorkerReady) {
      resumeAutoShare();
    }
  }, [isWorkerReady, resumeAutoShare]);

  return (
    <>
      {/* why: rendered outside the masked, scrolling container below — see
          ThemeToggle's own why-comment for the fixed-positioning hazard
          that lives inside it. */}
      <ThemeToggle />
      <div className={className}>
        {!isWorkerReady ? <LoadingSpinner /> : <Story />}
      </div>
    </>
  );
}

const StyledTrailerScreen = style(TrailerScreen);

export default StyledTrailerScreen;
