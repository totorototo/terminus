import { useCallback, useEffect } from "react";

import { useLocation, useParams } from "wouter";
import { useShallow } from "zustand/react/shallow";

import { showToast } from "../../helpers/toast.js";
import { useGPXWorker } from "../../hooks/useGPXWorker.js";
import { loadFollowedRoute } from "../../lib/sharedRoute.js";
import useStore from "../../store/store.js";
import LoadingSpinner from "../loadingSpinner/LoadingSpinner.jsx";
import Story from "../story/Story.jsx";
import ThemeToggle from "../story/ThemeToggle.jsx";

import style from "./FollowerScreen.style.js";

function FollowerScreen({ className }) {
  const { roomId } = useParams();
  const [, navigate] = useLocation();
  const loadGpx = useCallback(() => loadFollowedRoute(roomId), [roomId]);
  const { isWorkerReady, missing } = useGPXWorker(loadGpx);
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

  // The runner stopped sharing, the room expired, or it was never reachable.
  useEffect(() => {
    if (!missing) return;
    showToast("This race is no longer shared.", { type: "error" });
    navigate("/", { replace: true });
  }, [missing, navigate]);

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
