import { memo, useMemo } from "react";

import { format, formatDuration, intervalToDuration } from "date-fns";

import { DIFFICULTY_COLORS, DIFFICULTY_LABELS } from "../../../constants.js";

import style from "./AnalyticsPanel.style.js";

const customLocale = {
  formatDistance: (token, count) => {
    const units = {
      xSeconds: `${count}sec`,
      xMinutes: `${count}m`,
      xHours: `${count}h`,
      xDays: `${count}d`,
    };
    return units[token] || "";
  },
};

function formatSectionDuration(seconds) {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return "--";
  return formatDuration(
    intervalToDuration({ start: 0, end: seconds.toFixed(0) * 1000 }),
    { format: ["hours", "minutes"], locale: customLocale },
  ).replace(/\s+/g, "");
}

function formatSpeed(secPerKm) {
  if (secPerKm == null || !Number.isFinite(secPerKm) || secPerKm <= 0)
    return "--";
  return `${(3600 / secPerKm).toFixed(1)} km/h`;
}

function formatCutoff(ms) {
  if (ms == null || !Number.isFinite(ms)) return "--";
  return format(new Date(ms), "EEE HH:mm");
}

const AnalyticsPanel = memo(function AnalyticsPanel({
  className,
  item,
  label,
  isCurrent = false,
}) {
  const analytics = useMemo(() => {
    if (!item) return null;

    const distanceKm = (item.totalDistance || 0) / 1000;

    const cutoffMs =
      item.startTime != null && item.maxCompletionTime != null
        ? (item.startTime + item.maxCompletionTime) * 1000
        : null;

    const estimatedDurationSec =
      item.maxCompletionTime != null
        ? Math.min(item.estimatedDuration || 0, item.maxCompletionTime)
        : item.estimatedDuration || 0;

    const maxTimeSec = item.maxCompletionTime ?? null;

    const slowestPaceSecPerKm =
      maxTimeSec != null && item.totalDistance > 0
        ? (maxTimeSec / item.totalDistance) * 1000
        : null;

    return {
      startLocation: item.startLocation || "--",
      endLocation: item.endLocation || "--",
      distanceKm,
      cutoffMs,
      estimatedDurationSec,
      maxTimeSec,
      elevationGain: item.totalElevation || 0,
      elevationLoss: item.totalElevationLoss || 0,
      difficulty: item.difficulty || 0,
      slowestPaceSecPerKm,
    };
  }, [item]);

  const difficultyLabel =
    analytics?.difficulty > 0
      ? DIFFICULTY_LABELS[analytics.difficulty - 1]
      : null;
  const difficultyColor =
    analytics?.difficulty > 0
      ? DIFFICULTY_COLORS[analytics.difficulty - 1]
      : null;

  return (
    <div className={`${className}${isCurrent ? " current" : ""}`}>
      <div className="analytics-header">
        <span className="header-label">{label}</span>
        <span className="header-route">
          {analytics?.startLocation ?? "--"}
          <span className="route-arrow"> → </span>
          {analytics?.endLocation ?? "--"}
        </span>
      </div>

      <div className="analytics-grid">
        <div className="grid-tile">
          <span className="tile-label">Distance</span>
          <span className="tile-value">
            {analytics ? `${analytics.distanceKm.toFixed(1)} km` : "--"}
          </span>
        </div>

        <div className="grid-tile">
          <span className="tile-label">Gain</span>
          <span className="tile-value gain">
            {analytics ? `+${analytics.elevationGain.toFixed(0)} m` : "--"}
          </span>
        </div>

        <div className="grid-tile">
          <span className="tile-label">Loss</span>
          <span className="tile-value loss">
            {analytics ? `-${analytics.elevationLoss.toFixed(0)} m` : "--"}
          </span>
        </div>

        <div className="grid-tile">
          <span className="tile-label">Est Time</span>
          <span className="tile-value">
            {formatSectionDuration(analytics?.estimatedDurationSec)}
          </span>
        </div>

        <div className="grid-tile">
          <span className="tile-label">Max Time</span>
          <span className="tile-value">
            {formatSectionDuration(analytics?.maxTimeSec)}
          </span>
        </div>

        <div className="grid-tile">
          <span className="tile-label">Cutoff</span>
          <span className="tile-value">
            {formatCutoff(analytics?.cutoffMs)}
          </span>
        </div>

        <div className="grid-tile">
          <span className="tile-label">Difficulty</span>
          {difficultyLabel ? (
            <span
              className="tile-value difficulty"
              style={{ color: difficultyColor }}
            >
              {difficultyLabel}
            </span>
          ) : (
            <span className="tile-value">--</span>
          )}
        </div>

        <div className="grid-tile">
          <span className="tile-label">Slowest Pace</span>
          <span className="tile-value">
            {formatSpeed(analytics?.slowestPaceSecPerKm)}
          </span>
        </div>
      </div>
    </div>
  );
});

export default style(AnalyticsPanel);
