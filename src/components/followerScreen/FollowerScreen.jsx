import { useEffect } from "react";

import { useParams } from "wouter";
import { useShallow } from "zustand/react/shallow";

import { useGPXWorker } from "../../hooks/useGPXWorker.js";
import useStore from "../../store/store.js";
import LoadingSpinner from "../loadingSpinner/LoadingSpinner.jsx";
import Story from "../story/Story.jsx";
import ThemeToggle from "../story/ThemeToggle.jsx";

import style from "./FollowerScreen.style.js";

function FollowerScreen({ className }) {
  const { roomId, raceId } = useParams();
  const { isWorkerReady } = useGPXWorker(raceId);
  const { connectToFollowerSession, disconnectFollowerSession, setRaceId } =
    useStore(
      useShallow((state) => ({
        connectToFollowerSession: state.connectToFollowerSession,
        disconnectFollowerSession: state.disconnectFollowerSession,
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

const StyledFollowerScreen = style(FollowerScreen);

export default StyledFollowerScreen;
