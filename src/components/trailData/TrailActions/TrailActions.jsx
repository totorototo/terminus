import { memo } from "react";

import { useLocation } from "wouter";

import useStore from "../../../store/store.js";

import style from "./TrailActions.style.js";

const TrailActions = memo(function TrailActions({ className }) {
  const flush = useStore((state) => state.flush);
  const toggleTrackingMode = useStore((state) => state.toggleTrackingMode);
  const trackingMode = useStore((state) => state.app.trackingMode);
  const [, navigate] = useLocation();

  return (
    <div className={className}>
      <button
        className={`action-button ${trackingMode ? "active" : ""}`}
        onClick={toggleTrackingMode}
      >
        Fly-by
      </button>
      <button className="action-button" onClick={flush}>
        Flush Data
      </button>
      <button className="action-button" onClick={() => navigate("/")}>
        Switch Role
      </button>
    </div>
  );
});

export default style(TrailActions);
