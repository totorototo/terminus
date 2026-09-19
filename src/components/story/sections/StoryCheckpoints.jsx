import { memo, useEffect, useMemo, useState } from "react";

import { format } from "date-fns";
import { rgba } from "polished";
import { useTheme } from "styled-components";
import { useShallow } from "zustand/react/shallow";

import { DIFFICULTY_COLORS, DIFFICULTY_LABELS } from "../../../constants.js";
import { useCheckpointETAs } from "../../../hooks/useCheckpointETAs.js";
import { useCollapsibleList } from "../../../hooks/useCollapsibleList.js";
import useStore from "../../../store/store.js";
import {
  computeCutoffMargin,
  formatDuration,
} from "../../trailData/etaLegHelpers.js";
import WeatherLine from "../../trailData/WeatherLine/WeatherLine.jsx";
import CollapseToggle from "../CollapseToggle.jsx";
import StorySection from "../StorySection.jsx";

import style from "./StoryCheckpoints.style.js";

function formatRemaining(etaMs) {
  if (etaMs == null) return null;
  const remainingMs = etaMs - Date.now();
  if (remainingMs <= 0) return null;
  const totalMinutes = Math.floor(remainingMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

const StoryCheckpoints = memo(function StoryCheckpoints({ className }) {
  const theme = useTheme();
  const { checkpointETAs } = useCheckpointETAs();
  const { sections, forecasts, fetchWeatherForCheckpoints } = useStore(
    useShallow((state) => ({
      sections: state.sections,
      forecasts: state.weather.forecasts,
      fetchWeatherForCheckpoints: state.fetchWeatherForCheckpoints,
    })),
  );

  // why: matches .checkpoint-km's rgba(text, 0.6) — WeatherLine's own
  // defaults (full-opacity temp, 0.8 detail text) were tuned for its native
  // bordered-card look and read brighter than the rest of this plain-text row.
  const weatherIconColor = rgba(
    theme.colors[theme.currentVariant]["--color-text"],
    0.6,
  );
  const weatherFlaggedIconColor =
    theme.colors[theme.currentVariant]["--color-text"];

  // why: covers both regular checkpoints and LifeBase stops uniformly —
  // checkpointETAs doesn't distinguish them, and neither does the weather
  // fetch. Mirrors SectionETA's own fetch, dropped when this list was
  // ported to the editorial story UI.
  const { etaFetchKey, fetchCheckpoints } = useMemo(() => {
    const eligible = checkpointETAs.filter(
      (cp) => cp.lat != null && cp.lon != null && cp.etaMs != null,
    );
    const checkpoints = eligible.map((cp) => ({
      name: cp.endLocation,
      lat: cp.lat,
      lon: cp.lon,
      etaMs: cp.etaMs,
    }));
    const key = checkpoints
      .map((cp) => Math.round(cp.etaMs / (30 * 60 * 1000)))
      .join(",");
    return { etaFetchKey: key, fetchCheckpoints: checkpoints };
  }, [checkpointETAs]);

  useEffect(() => {
    if (!etaFetchKey || !fetchCheckpoints.length) return;
    fetchWeatherForCheckpoints(fetchCheckpoints);
    // fetchCheckpoints intentionally omitted: always in sync with etaFetchKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etaFetchKey, fetchWeatherForCheckpoints]);

  // Collapse to a short preview by default — but never behind the checkpoint
  // that's current or next, so a long route's checkpoint list doesn't bury
  // the one a runner mid-race actually cares about.
  const activeCheckpointIndex = checkpointETAs.findIndex((cp) => !cp.isPast);
  const { visibleCount, hiddenCount, expand } = useCollapsibleList(
    checkpointETAs.length,
    { threshold: 6, activeIndex: activeCheckpointIndex },
  );

  // why: on trail, only the checkpoint you're mid-leg on needs its full
  // breakdown open by default — everything else stays a one-line glance
  // until tapped. Stored as a toggle-from-default set (XOR'd against
  // isCurrent below) so the open row tracks the current checkpoint live
  // without an effect re-syncing state on every tick.
  const [toggledIds, setToggledIds] = useState(() => new Set());

  const toggleExpanded = (sectionId) => {
    setToggledIds((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  if (!checkpointETAs?.length) {
    return (
      <div className={className}>
        <StorySection eyebrow="The checkpoints" title="Checkpoints">
          <p className="empty">No checkpoints on this route.</p>
        </StorySection>
      </div>
    );
  }

  return (
    <div className={className}>
      <StorySection eyebrow="The checkpoints" title="Checkpoints">
        <ol className="checkpoint-list">
          {checkpointETAs.slice(0, visibleCount).map((cp, i) => {
            const remaining = formatRemaining(cp.etaMs);
            const section = sections?.[i];
            const difficultyLabel =
              cp.difficulty > 0 ? DIFFICULTY_LABELS[cp.difficulty - 1] : null;
            const difficultyColor =
              cp.difficulty > 0 ? DIFFICULTY_COLORS[cp.difficulty - 1] : null;
            const weather = forecasts[cp.endLocation] ?? null;
            const cutoffMargin = section ? computeCutoffMargin(section) : null;

            // why: a bold word carries in direct sun and while moving, where
            // a percentage or a thin bar doesn't — see StoryStages' badge.
            const cutoffTier =
              cp.cutoffMs == null
                ? null
                : cp.isOverCutoff
                  ? "over"
                  : cutoffMargin && cutoffMargin.pctUsed >= 85
                    ? "tight"
                    : "ok";
            const cutoffBadge =
              cutoffTier === "over"
                ? "Over"
                : cutoffTier === "tight"
                  ? "Tight"
                  : cutoffTier === "ok"
                    ? "On pace"
                    : null;

            const isExpanded = cp.isCurrent !== toggledIds.has(cp.sectionId);
            const detailsId = `checkpoint-details-${cp.sectionId}`;

            return (
              <li
                key={cp.sectionId}
                className={`checkpoint-row${cp.isPast ? " past" : ""}${
                  cp.isCurrent ? " current" : ""
                }`}
              >
                <div className="checkpoint-top">
                  <div className="checkpoint-main">
                    <span className="checkpoint-name">
                      {cp.endLocation || "Checkpoint"}
                    </span>
                    <span className="checkpoint-km">
                      {cp.endKm.toFixed(1)} km
                    </span>
                  </div>
                  <div className="checkpoint-eta">
                    <span className="checkpoint-eta-time">
                      {cp.isPast
                        ? "Reached"
                        : cp.etaMs
                          ? format(new Date(cp.etaMs), "EEE HH:mm")
                          : "--:--"}
                    </span>
                    {!cp.isPast && remaining && (
                      <span className="checkpoint-remaining">
                        in {remaining}
                      </span>
                    )}
                    {cutoffBadge && (
                      <span className={`checkpoint-badge tier-${cutoffTier}`}>
                        {cutoffBadge}
                      </span>
                    )}
                  </div>
                </div>
                {weather && (
                  <WeatherLine
                    className="checkpoint-weather"
                    weather={weather}
                    iconColor={weatherIconColor}
                    flaggedIconColor={weatherFlaggedIconColor}
                  />
                )}
                {section && (
                  <>
                    <button
                      type="button"
                      className="checkpoint-details-toggle"
                      aria-expanded={isExpanded}
                      aria-controls={detailsId}
                      onClick={() => toggleExpanded(cp.sectionId)}
                    >
                      {isExpanded ? "Hide details" : "Details"}
                    </button>
                    {isExpanded && (
                      <div className="checkpoint-stats-grid" id={detailsId}>
                        {cp.cutoffMs != null && (
                          <div className="stat-cell wide">
                            <span className="stat-label">Cutoff</span>
                            <span
                              className={`stat-value cutoff-value${cp.isOverCutoff ? " over" : ""}`}
                            >
                              {cutoffMargin && (
                                <span>
                                  {cutoffMargin.isOver
                                    ? `${formatDuration(-cutoffMargin.marginS)} over`
                                    : `+${formatDuration(cutoffMargin.marginS)} buffer`}
                                </span>
                              )}
                              <span className="cutoff-time">
                                {format(new Date(cp.cutoffMs), "EEE HH:mm")}
                                {cp.isOverCutoff ? " · over" : ""}
                              </span>
                            </span>
                          </div>
                        )}
                        <div className="stat-cell">
                          <span className="stat-label">Gain / Loss</span>
                          <span className="stat-value stacked-value">
                            <span>
                              +{Math.round(section.totalElevation || 0)} m
                            </span>
                            <span>
                              −{Math.round(section.totalElevationLoss || 0)} m
                            </span>
                          </span>
                        </div>
                        <div className="stat-cell">
                          <span className="stat-label">Time</span>
                          <span className="stat-value stacked-value">
                            <span>
                              {formatDuration(section.estimatedDuration)}
                            </span>
                            <span className="stat-sub">
                              max {formatDuration(section.maxCompletionTime)}
                            </span>
                          </span>
                        </div>
                        <div className="stat-cell wide">
                          <span className="stat-label">Difficulty</span>
                          <span className="stat-value difficulty-value">
                            {difficultyColor && (
                              <span
                                className="difficulty-dot"
                                style={{ background: difficultyColor }}
                              />
                            )}
                            {difficultyLabel || "--"}
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ol>
        <CollapseToggle hiddenCount={hiddenCount} onExpand={expand} />
      </StorySection>
    </div>
  );
});

const StyledStoryCheckpoints = style(StoryCheckpoints);

export default StyledStoryCheckpoints;
