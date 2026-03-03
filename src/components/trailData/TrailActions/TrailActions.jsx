import { memo } from "react";

import { Tv, Trash2, LogOut } from "@styled-icons/feather";
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
        <Tv size={20} />
        <span>Fly-by Mode</span>
      </button>
      <button className="action-button" onClick={flush}>
        <Trash2 size={20} />
        <span>Flush Saved Locations</span>
      </button>
      <button className="action-button" onClick={() => navigate("/")}>
        <LogOut size={20} />
        <span>Leave Trail</span>
      </button>
    </div>
  );
});

export default style(TrailActions);
