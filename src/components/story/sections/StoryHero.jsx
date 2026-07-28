import { memo, useEffect, useMemo, useState } from "react";

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

const StoryHero = memo(function StoryHero({ className }) {
  const stats = useStats();
  const metadata = useStore((state) => state.gpx.metadata);
  const sections = useStore((state) => state.sections);

  const raceStartMs = useMemo(() => {
    if (!sections?.length || sections[0].startTime == null) return null;
    return sections[0].startTime * 1000;
  }, [sections]);

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
      </div>

      {clock && (
        <div className="clock">
          <span className="clock-label">{clock.label}</span>
          <span className="clock-value">{clock.value}</span>
        </div>
      )}
    </header>
  );
});

const StyledStoryHero = style(StoryHero);

export default StyledStoryHero;
