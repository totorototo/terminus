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

  const buildNumber = import.meta.env.VITE_NUMBER || "dev";

  return (
    <div className={className}>
      <div className="actions-header">
        <span className="header-label">Actions</span>
      </div>

      <div className="actions-list">
        <button
          className={`action-row ${trackingMode ? "active" : ""}`}
          onClick={toggleTrackingMode}
        >
          <Tv size={14} />
          <span className="row-label">Fly-by Mode</span>
          {trackingMode && <span className="row-badge">on</span>}
        </button>

        <button className="action-row" onClick={flush}>
          <Trash2 size={14} />
          <span className="row-label">Flush Saved Locations</span>
        </button>

        <button className="action-row danger" onClick={() => navigate("/")}>
          <LogOut size={14} />
          <span className="row-label">Leave Trail</span>
        </button>
      </div>

      <div className="build-number">build {buildNumber}</div>
    </div>
  );
});

export default style(TrailActions);
