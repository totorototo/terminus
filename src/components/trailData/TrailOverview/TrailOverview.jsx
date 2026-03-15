import { memo, useEffect, useMemo, useState } from "react";

import useStore, { useStats } from "../../../store/store.js";

import style from "./TrailOverview.style.js";

function formatDuration(ms) {
  const totalSeconds = Math.floor(Math.abs(ms) / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

const TrailOverview = memo(function TrailOverview({ className }) {
  const stats = useStats();
  const metadata = useStore((state) => state.gpx.metadata);
  const sections = useStore((state) => state.sections);
  const followerRoomId = useStore((state) => state.app.followerRoomId);
  const liveSessionId = useStore((state) => state.app.liveSessionId);
  const roomId = followerRoomId ?? liveSessionId;

  const totalDistanceKm = (stats.distance || 0) / 1000;

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

  const { maxTimeStr, slowestPaceStr } = useMemo(() => {
    const totalMaxTimeSec = sections?.reduce((sum, s) => {
      return s.maxCompletionTime != null ? sum + s.maxCompletionTime : sum;
    }, 0);

    if (!totalMaxTimeSec || totalMaxTimeSec <= 0) {
      return { maxTimeStr: "--", slowestPaceStr: "--" };
    }

    const hours = Math.floor(totalMaxTimeSec / 3600);
    const minutes = Math.floor((totalMaxTimeSec % 3600) / 60);
    const maxTimeStr = minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;

    const distanceKm = (stats.distance || 0) / 1000;
    const slowestPaceStr =
      distanceKm > 0
        ? `${(distanceKm / (totalMaxTimeSec / 3600)).toFixed(1)} km/h`
        : "--";

    return { maxTimeStr, slowestPaceStr };
  }, [sections, stats.distance]);

  const { timeLabel, timeValue } = useMemo(() => {
    if (!raceStartMs) return { timeLabel: null, timeValue: null };
    const delta = now - raceStartMs;
    if (delta < 0) {
      return {
        timeLabel: "Starts In",
        timeValue: formatDuration(-delta),
      };
    }
    return {
      timeLabel: "Elapsed",
      timeValue: formatDuration(delta, false),
    };
  }, [raceStartMs, now]);

  return (
    <div className={className}>
      <div className="overview-header">
        <span className="header-label">Trail</span>
        {metadata.name && <span className="header-name">{metadata.name}</span>}
      </div>

      <div className="stats-grid">
        <div className="grid-tile">
          <span className="tile-label">Distance</span>
          <span className="tile-value">{totalDistanceKm.toFixed(1)} km</span>
        </div>

        <div className="grid-tile">
          <span className="tile-label">Gain</span>
          <span className="tile-value gain">
            +{(stats.elevationGain || 0).toFixed(0)} m
          </span>
        </div>

        <div className="grid-tile">
          <span className="tile-label">Loss</span>
          <span className="tile-value loss">
            -{(stats.elevationLoss || 0).toFixed(0)} m
          </span>
        </div>

        <div className="grid-tile">
          <span className="tile-label">Max Time</span>
          <span className="tile-value">{maxTimeStr}</span>
        </div>

        <div className="grid-tile pace-tile">
          <span className="tile-label">Slowest Pace</span>
          <span className="tile-value">{slowestPaceStr}</span>
        </div>

        {timeLabel && (
          <div className="grid-tile time-tile">
            <span className="tile-label">{timeLabel}</span>
            <span className="tile-value">{timeValue}</span>
          </div>
        )}

        {roomId && (
          <div className="grid-tile room-tile">
            <span className="tile-label">Room</span>
            <span className="tile-value">{roomId}</span>
          </div>
        )}
      </div>
    </div>
  );
});

export default style(TrailOverview);
