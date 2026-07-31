import { memo, useEffect, useMemo, useState } from "react";

import { useCheckpointETAs } from "../../../hooks/useCheckpointETAs.js";
import useStore, { useStats } from "../../../store/store.js";

import style from "./StoryHero.style.js";

function formatDuration(ms) {
  const totalSeconds = Math.floor(Math.abs(ms) / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// why: unlike the elapsed/starts-in clock, the total estimate reads more
// naturally as cumulative hours (e.g. "41h 59m") than split across days —
// a multi-day ultra's total time isn't usually spoken as "1d 17h".
function formatDurationHours(ms) {
  const totalMinutes = Math.floor(Math.abs(ms) / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

const StoryHero = memo(function StoryHero({ className }) {
  const stats = useStats();
  const metadata = useStore((state) => state.gpx.metadata);
  const { checkpointETAs, raceStart: raceStartMs } = useCheckpointETAs();

  // why: sourced from checkpointETAs (section granularity) rather than
  // stages — sections are the only boundary kind that include TimeBarriers,
  // so this is the only computation aware of every intermediate cutoff.
  // Stage-level ETAs are blind to a TimeBarrier missed mid-stage and would
  // show an optimistic finish time that ignores it. Arrival is the same
  // physical boundary in both partitions, so the last checkpoint IS the
  // finish — this keeps the Hero stat, Milestones' last row, and
  // Checkpoints' last row all describing the same real-world estimate.
  const totalEstimatedMs = useMemo(() => {
    if (!checkpointETAs?.length || raceStartMs == null) return null;
    const finishEtaMs = checkpointETAs[checkpointETAs.length - 1].etaMs;
    return finishEtaMs != null ? Math.max(0, finishEtaMs - raceStartMs) : null;
  }, [checkpointETAs, raceStartMs]);

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!raceStartMs) return;
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [raceStartMs]);

  const clock = useMemo(() => {
    if (!raceStartMs) return null;
    const delta = now - raceStartMs;
    return delta < 0
      ? { label: "Starts in", value: formatDuration(-delta) }
      : { label: "Elapsed", value: formatDuration(delta) };
  }, [raceStartMs, now]);

  return (
    <header className={className}>
      <span className="eyebrow">The route</span>
      <h1 className="name">{metadata?.name || "This trail"}</h1>

      <div className="stat-row">
        <div className="stat">
          <span className="stat-value">
            {((stats.distance || 0) / 1000).toFixed(1)}
          </span>
          <span className="stat-label">km</span>
        </div>
        <div className="stat">
          <span className="stat-value">
            +{(stats.elevationGain || 0).toFixed(0)}
          </span>
          <span className="stat-label">m gain</span>
        </div>
        <div className="stat">
          <span className="stat-value">
            -{(stats.elevationLoss || 0).toFixed(0)}
          </span>
          <span className="stat-label">m loss</span>
        </div>
        {totalEstimatedMs != null && (
          <div className="stat">
            <span className="stat-value">
              {formatDurationHours(totalEstimatedMs)}
            </span>
            <span className="stat-label">est. time</span>
          </div>
        )}
      </div>

      {clock && (
        <div className="clock">
          <span className="clock-label">{clock.label}</span>
          <span className="clock-value">{clock.value}</span>
        </div>
      )}

      <span className="build-number">
        Build {import.meta.env.VITE_NUMBER || "dev"}
      </span>
    </header>
  );
});

const StyledStoryHero = style(StoryHero);

export default StyledStoryHero;
