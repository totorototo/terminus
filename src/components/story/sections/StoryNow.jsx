import { memo, useMemo } from "react";

import { animated, useSpring } from "@react-spring/web";
import { Radio } from "@styled-icons/feather/Radio";
import { format } from "date-fns";
import { useShallow } from "zustand/react/shallow";

import { useCheckpointETAs } from "../../../hooks/useCheckpointETAs.js";
import useStore, { useProjectedLocation } from "../../../store/store.js";
import StorySection from "../StorySection.jsx";

import style from "./StoryNow.style.js";

const StoryNow = memo(function StoryNow({ className }) {
  const projectedLocation = useProjectedLocation();
  const cumulativeDistances = useStore(
    (state) => state.gpx.cumulativeDistances || [],
  );
  const { checkpointETAs, raceStart } = useCheckpointETAs();
  const { autoShareEnabled, toggleAutoShare, isFollower } = useStore(
    useShallow((state) => ({
      autoShareEnabled: state.gps.autoShareEnabled,
      toggleAutoShare: state.toggleAutoShare,
      isFollower: state.gps.followerConnectionStatus === "connected",
    })),
  );

  // why: sourced from checkpointETAs (section granularity), the same finish
  // estimate StoryHero and StoryCheckpoints' last row read — not a
  // standalone Minetti+paceRatio recompute (the old calculateTimeMetrics
  // helper skipped both live Zig recalibration and cutoff clamping) and not
  // stage granularity either, which is blind to any TimeBarrier missed
  // mid-stage and would show an optimistic finish that ignores it.
  const metrics = useMemo(() => {
    const finishEtaMs = checkpointETAs?.length
      ? checkpointETAs[checkpointETAs.length - 1].etaMs
      : null;
    if (
      raceStart == null ||
      finishEtaMs == null ||
      projectedLocation.timestamp < raceStart
    ) {
      return { etaDateStr: "--:--", remainingStr: "--" };
    }
    const remainingMs = Math.max(0, finishEtaMs - projectedLocation.timestamp);
    const totalMinutes = Math.floor(remainingMs / 60_000);
    return {
      etaDateStr: format(new Date(finishEtaMs), "EEE HH:mm"),
      remainingStr:
        remainingMs > 0
          ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
          : "--",
    };
  }, [checkpointETAs, raceStart, projectedLocation.timestamp]);

  const remainingKm = useMemo(() => {
    if (!cumulativeDistances?.length || !projectedLocation.timestamp) {
      return 0;
    }
    const distanceDone = cumulativeDistances[projectedLocation.index || 0] || 0;
    const totalDistance =
      cumulativeDistances[cumulativeDistances.length - 1] || 0;
    return Math.max(0, totalDistance - distanceDone) / 1000;
  }, [
    cumulativeDistances,
    projectedLocation.index,
    projectedLocation.timestamp,
  ]);

  const { remainingKm: animatedRemainingKm } = useSpring({
    remainingKm,
    config: { tension: 170, friction: 26 },
  });

  return (
    <div className={className}>
      <StorySection
        eyebrow="Right now"
        title={isFollower ? "Where they are" : "Where you are"}
      >
        <div className="live-badge">
          <span className="live-dot" />
          live
        </div>
        <div className="now-row" aria-live="polite">
          <div className="now-stat">
            <animated.span className="now-value">
              {animatedRemainingKm.to((n) => n.toFixed(1))}
            </animated.span>
            <span className="now-label">km left</span>
          </div>
          <div className="now-stat">
            <span className="now-value">
              {metrics.etaDateStr.toUpperCase()}
            </span>
            <span className="now-label">eta</span>
          </div>
          <div className="now-stat">
            <span className="now-value">{metrics.remainingStr}</span>
            <span className="now-label">remaining</span>
          </div>
        </div>
        <p className="now-note">
          Based on {isFollower ? "their" : "your"} pace so far against terrain.
        </p>

        {/* why: this is the only control that starts the GPS fix this whole
            page's live numbers depend on for a runner — everything else here
            is read-only. Followers already get live numbers from the
            runner's own broadcast, so starting their own GPS fix here would
            be meaningless (and misleading, since it isn't what drives the
            numbers above). */}
        {!isFollower && (
          <button
            type="button"
            className={autoShareEnabled ? "track-btn on" : "track-btn"}
            onClick={toggleAutoShare}
            aria-pressed={autoShareEnabled}
          >
            <Radio size={16} />
            {autoShareEnabled ? "GPS on · spotting every 30 min" : "Spot me"}
          </button>
        )}
      </StorySection>
    </div>
  );
});

const StyledStoryNow = style(StoryNow);

export default StyledStoryNow;
