import { memo, useEffect, useMemo } from "react";

import { format } from "date-fns";
import { rgba } from "polished";
import { useTheme } from "styled-components";
import { useShallow } from "zustand/react/shallow";

import { DIFFICULTY_COLORS, DIFFICULTY_LABELS } from "../../../constants.js";
import { useCheckpointETAs } from "../../../hooks/useCheckpointETAs.js";
import { useCollapsibleList } from "../../../hooks/useCollapsibleList.js";
import useStore from "../../../store/store.js";
import { formatDuration } from "../../trailData/etaLegHelpers.js";
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
                    {cp.isPast ? (
                      <span className="checkpoint-reached">Reached</span>
                    ) : (
                      <>
                        <span>
                          {cp.etaMs
                            ? format(new Date(cp.etaMs), "EEE HH:mm")
                            : "--:--"}
                        </span>
                        {remaining && <span className="sep">·</span>}
                        {remaining && <span>in {remaining}</span>}
                      </>
                    )}
                    {cp.cutoffMs != null && (
                      <span
                        className={`checkpoint-cutoff${cp.isOverCutoff ? " over" : ""}`}
                      >
                        cutoff {format(new Date(cp.cutoffMs), "EEE HH:mm")}
                        {cp.isOverCutoff ? " · over" : ""}
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
                  <div className="checkpoint-stats-grid">
                    <div className="stat-cell">
                      <span className="stat-label">Distance</span>
                      <span className="stat-value">
                        {((section.totalDistance || 0) / 1000).toFixed(1)} km
                      </span>
                    </div>
                    <div className="stat-cell">
                      <span className="stat-label">Gain / Loss</span>
                      <span className="stat-value elevation-value">
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
                      <span className="stat-value">
                        {formatDuration(section.estimatedDuration)}
                      </span>
                    </div>
                    <div className="stat-cell">
                      <span className="stat-label">Max time</span>
                      <span className="stat-value">
                        {formatDuration(section.maxCompletionTime)}
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
