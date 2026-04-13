import { memo, useState } from "react";

import {
  Download,
  HelpCircle,
  LogOut,
  Trash2,
  Tv,
} from "@styled-icons/feather";
import { useLocation } from "wouter";

import useStore from "../../../store/store.js";
import { generateTrailCard } from "../../../utils/trailCard.jsx";

import style from "./TrailActions.style.js";

const TrailActions = memo(function TrailActions({ className }) {
  const flush = useStore((state) => state.flush);
  const toggleTrackingMode = useStore((state) => state.toggleTrackingMode);
  const trackingMode = useStore((state) => state.app.trackingMode);
  const [, navigate] = useLocation();
  const [confirmingFlush, setConfirmingFlush] = useState(false);
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const [sharingCard, setSharingCard] = useState(false);
  const [cardError, setCardError] = useState(false);

  const sections = useStore((state) => state.sections);
  const stats = useStore((state) => state.stats);
  const metadata = useStore((state) => state.gpx.metadata);

  const buildNumber = import.meta.env.VITE_NUMBER || "dev";

  const handleShareCard = async () => {
    if (!sections?.length) return;
    setSharingCard(true);
    try {
      const totalSec = sections.reduce(
        (s, sec) => s + (sec.estimatedDuration || 0),
        0,
      );

      const blob = await generateTrailCard({
        name: metadata?.name || "Trail",
        totalSec,
        elevationGain: stats?.elevationGain || 0,
        distance: stats?.distance || 0,
        sections,
      });

      const file = new File(
        [blob],
        `${(metadata?.name || "trail").replace(/\s+/g, "-").toLowerCase()}-card.png`,
        { type: "image/png" },
      );

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: metadata?.name || "Trail",
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      if (err?.name !== "AbortError") {
        console.error("[TrailCard]", err);
        setCardError(true);
        setTimeout(() => setCardError(false), 3000);
      }
    } finally {
      setSharingCard(false);
    }
  };

  const handleFlushClick = () => setConfirmingFlush(true);
  const handleFlushConfirm = () => {
    flush();
    setConfirmingFlush(false);
  };

  return (
    <div className={className}>
      <div className="actions-header">
        <span className="header-label">Actions</span>
      </div>

      <div className="actions-list">
        <button
          className={`action-row ${trackingMode ? "active" : ""}`}
          onClick={toggleTrackingMode}
          aria-pressed={trackingMode}
        >
          <Tv size={14} />
          <span className="row-label">Fly-by Mode</span>
          {trackingMode && <span className="row-badge">on</span>}
        </button>

        <button
          className="action-row"
          onClick={handleShareCard}
          disabled={sharingCard || !sections?.length}
          aria-busy={sharingCard}
        >
          <Download size={14} />
          <span className="row-label">
            {cardError
              ? "Failed — check console"
              : sharingCard
                ? "Generating…"
                : "Share Trail Card"}
          </span>
        </button>

        {confirmingFlush ? (
          <div className="action-confirm">
            <span className="confirm-label">Erase all saved locations?</span>
            <button
              className="confirm-btn danger"
              onClick={handleFlushConfirm}
              aria-label="Confirm flush saved locations"
            >
              Yes
            </button>
            <button
              className="confirm-btn"
              onClick={() => setConfirmingFlush(false)}
              aria-label="Cancel flush"
            >
              No
            </button>
          </div>
        ) : (
          <button className="action-row" onClick={handleFlushClick}>
            <Trash2 size={14} />
            <span className="row-label">Flush Saved Locations</span>
          </button>
        )}

        <button className="action-row" onClick={() => navigate("/help")}>
          <HelpCircle size={14} />
          <span className="row-label">User Guide</span>
        </button>

        {confirmingLeave ? (
          <div className="action-confirm">
            <span className="confirm-label">Leave this trail?</span>
            <button
              className="confirm-btn danger"
              onClick={() => navigate("/")}
              aria-label="Confirm leave trail"
            >
              Yes
            </button>
            <button
              className="confirm-btn"
              onClick={() => setConfirmingLeave(false)}
              aria-label="Cancel leave trail"
            >
              No
            </button>
          </div>
        ) : (
          <button
            className="action-row danger"
            onClick={() => setConfirmingLeave(true)}
          >
            <LogOut size={14} />
            <span className="row-label">Leave Trail</span>
          </button>
        )}
      </div>

      <div className="build-number">build {buildNumber}</div>
    </div>
  );
});

export default style(TrailActions);
