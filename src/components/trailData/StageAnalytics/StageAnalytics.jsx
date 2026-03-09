import { memo, useMemo } from "react";

import { format, formatDuration, intervalToDuration } from "date-fns";

import { DIFFICULTY_COLORS, DIFFICULTY_LABELS } from "../../../constants.js";
import useStore, { useProjectedLocation } from "../../../store/store.js";

import style from "./StageAnalytics.style.js";

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

const StageAnalytics = memo(function StageAnalytics({ className }) {
  const projectedLocation = useProjectedLocation();
  const stages = useStore((state) => state.stages);

  const currentStage = useMemo(() => {
    if (!stages?.length) return null;
    const idx = projectedLocation?.index || 0;
    const found = stages.find((s) => idx >= s.startIndex && idx < s.endIndex);
    if (found) return found;
    // Before start or after all stages — show next upcoming, else last
    return stages.find((s) => idx < s.endIndex) ?? stages[stages.length - 1];
  }, [stages, projectedLocation?.index]);

  const analytics = useMemo(() => {
    if (!currentStage) return null;

    const distanceKm = (currentStage.totalDistance || 0) / 1000;

    const cutoffMs =
      currentStage.startTime != null && currentStage.maxCompletionTime != null
        ? (currentStage.startTime + currentStage.maxCompletionTime) * 1000
        : null;

    const estimatedDurationSec =
      currentStage.maxCompletionTime != null
        ? Math.min(
            currentStage.estimatedDuration || 0,
            currentStage.maxCompletionTime,
          )
        : currentStage.estimatedDuration || 0;

    const maxTimeSec = currentStage.maxCompletionTime ?? null;

    const slowestPaceSecPerKm =
      maxTimeSec != null && currentStage.totalDistance > 0
        ? (maxTimeSec / currentStage.totalDistance) * 1000
        : null;

    return {
      startLocation: currentStage.startLocation || "--",
      endLocation: currentStage.endLocation || "--",
      distanceKm,
      cutoffMs,
      estimatedDurationSec,
      maxTimeSec,
      elevationGain: currentStage.totalElevation || 0,
      elevationLoss: currentStage.totalElevationLoss || 0,
      difficulty: currentStage.difficulty || 0,
      slowestPaceSecPerKm,
    };
  }, [currentStage]);

  if (!analytics) {
    return (
      <div className={className}>
        <div className="empty-state">No stage</div>
      </div>
    );
  }

  const difficultyLabel =
    analytics.difficulty > 0
      ? DIFFICULTY_LABELS[analytics.difficulty - 1]
      : null;
  const difficultyColor =
    analytics.difficulty > 0
      ? DIFFICULTY_COLORS[analytics.difficulty - 1]
      : null;

  return (
    <div className={className}>
      <div className="analytics-header">
        <span className="header-label">Stage</span>
        <span className="header-route">
          {analytics.startLocation}
          <span className="route-arrow"> → </span>
          {analytics.endLocation}
        </span>
      </div>

      <div className="analytics-grid">
        <div className="grid-tile">
          <span className="tile-label">Distance</span>
          <span className="tile-value">
            {analytics.distanceKm.toFixed(1)} km
          </span>
        </div>

        <div className="grid-tile">
          <span className="tile-label">Gain</span>
          <span className="tile-value gain">
            +{analytics.elevationGain.toFixed(0)} m
          </span>
        </div>

        <div className="grid-tile">
          <span className="tile-label">Loss</span>
          <span className="tile-value loss">
            -{analytics.elevationLoss.toFixed(0)} m
          </span>
        </div>

        <div className="grid-tile">
          <span className="tile-label">Est Time</span>
          <span className="tile-value">
            {formatSectionDuration(analytics.estimatedDurationSec)}
          </span>
        </div>

        <div className="grid-tile">
          <span className="tile-label">Max Time</span>
          <span className="tile-value">
            {formatSectionDuration(analytics.maxTimeSec)}
          </span>
        </div>

        <div className="grid-tile">
          <span className="tile-label">Cutoff</span>
          <span className="tile-value">{formatCutoff(analytics.cutoffMs)}</span>
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
            {formatSpeed(analytics.slowestPaceSecPerKm)}
          </span>
        </div>
      </div>
    </div>
  );
});

export default style(StageAnalytics);
