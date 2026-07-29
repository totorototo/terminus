import { memo, useState } from "react";

import { Copy } from "@styled-icons/feather/Copy";
import { Download } from "@styled-icons/feather/Download";
import { HelpCircle } from "@styled-icons/feather/HelpCircle";
import { LogOut } from "@styled-icons/feather/LogOut";
import { Moon } from "@styled-icons/feather/Moon";
import { Sun } from "@styled-icons/feather/Sun";
import { Trash2 } from "@styled-icons/feather/Trash2";
import { UserPlus } from "@styled-icons/feather/UserPlus";
import { useLocation } from "wouter";
import { useShallow } from "zustand/react/shallow";

import useStore from "../../../store/store.js";
import { generateTrailCard } from "../../../utils/trailCard.jsx";
import StorySection from "../StorySection.jsx";

import style from "./StoryEnd.style.js";

const StoryEnd = memo(function StoryEnd({ className }) {
  const [, navigate] = useLocation();
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const [confirmingFlush, setConfirmingFlush] = useState(false);
  const [sharingCard, setSharingCard] = useState(false);
  const [cardError, setCardError] = useState(false);
  const [roomIdCopied, setRoomIdCopied] = useState(false);

  const stages = useStore((state) => state.stages);
  const stats = useStore((state) => state.stats);
  const metadata = useStore((state) => state.gpx.metadata);
  const { theme, toggleTheme, shareLocation, flush, roomId, isFollower } =
    useStore(
      useShallow((state) => ({
        theme: state.app.theme,
        toggleTheme: state.toggleTheme,
        shareLocation: state.shareLocation,
        flush: state.flush,
        roomId: state.app.followerRoomId ?? state.app.liveSessionId,
        isFollower: state.gps.followerConnectionStatus === "connected",
      })),
    );

  const handleShareCard = async () => {
    if (!stages?.length) return;
    setSharingCard(true);
    try {
      const totalSec = stages.reduce(
        (s, st) => s + (st.estimatedDuration || 0),
        0,
      );
      const blob = await generateTrailCard({
        name: metadata?.name || "Trail",
        totalSec,
        elevationGain: stats?.elevationGain || 0,
        distance: stats?.distance || 0,
        stages,
        url: window.location.href,
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

  return (
    <div className={className}>
      <StorySection eyebrow="Before you go" title="End of line">
        <div className="actions">
          <button
            className="action-btn"
            onClick={handleShareCard}
            disabled={sharingCard || !stages?.length}
            aria-busy={sharingCard}
          >
            <Download size={16} />
            {cardError
              ? "Failed — check console"
              : sharingCard
                ? "Generating…"
                : "Share this trail"}
          </button>

          {/* why: shareLocation() starts a broadcast session tied to this
              device's own GPS fix — meaningless for a follower, who has
              nothing of their own to broadcast. */}
          {!isFollower && (
            <button className="action-btn" onClick={shareLocation}>
              <UserPlus size={16} />
              Invite someone to follow
            </button>
          )}

          {roomId && (
            <button
              type="button"
              className="room-id"
              onClick={() => {
                navigator.clipboard.writeText(roomId);
                setRoomIdCopied(true);
                setTimeout(() => setRoomIdCopied(false), 2000);
              }}
              aria-label={`Copy room code ${roomId}`}
            >
              <span className="room-id-label">Room</span>
              <span className="room-id-value">{roomId}</span>
              <Copy size={13} />
              {roomIdCopied && <span className="room-id-copied">Copied</span>}
            </button>
          )}

          <button className="action-btn" onClick={toggleTheme}>
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>

          {/* why: flush() clears this device's own buffered GPS fixes — a
              follower never accumulates any, so the action is a no-op for
              them. */}
          {!isFollower &&
            (confirmingFlush ? (
              <div className="confirm-row">
                <span>Erase all saved locations?</span>
                <button
                  className="confirm-btn danger"
                  onClick={() => {
                    flush();
                    setConfirmingFlush(false);
                  }}
                >
                  Yes
                </button>
                <button
                  className="confirm-btn"
                  onClick={() => setConfirmingFlush(false)}
                >
                  No
                </button>
              </div>
            ) : (
              <button
                className="action-btn"
                onClick={() => setConfirmingFlush(true)}
              >
                <Trash2 size={16} />
                Flush saved locations
              </button>
            ))}

          <button className="action-btn" onClick={() => navigate("/help")}>
            <HelpCircle size={16} />
            User guide
          </button>

          {confirmingLeave ? (
            <div className="confirm-row">
              <span>Leave this trail?</span>
              <button
                className="confirm-btn danger"
                onClick={() => navigate("/")}
              >
                Yes
              </button>
              <button
                className="confirm-btn"
                onClick={() => setConfirmingLeave(false)}
              >
                No
              </button>
            </div>
          ) : (
            <button
              className="action-btn danger"
              onClick={() => setConfirmingLeave(true)}
            >
              <LogOut size={16} />
              Leave trail
            </button>
          )}
        </div>
      </StorySection>
    </div>
  );
});

const StyledStoryEnd = style(StoryEnd);

export default StyledStoryEnd;
