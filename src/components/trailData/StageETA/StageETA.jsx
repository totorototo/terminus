import { memo, useEffect, useMemo } from "react";

import { Cloud } from "@styled-icons/feather/Cloud";
import { CloudDrizzle } from "@styled-icons/feather/CloudDrizzle";
import { CloudLightning } from "@styled-icons/feather/CloudLightning";
import { CloudRain } from "@styled-icons/feather/CloudRain";
import { CloudSnow } from "@styled-icons/feather/CloudSnow";
import { Sun } from "@styled-icons/feather/Sun";
import { Wind } from "@styled-icons/feather/Wind";
import { format } from "date-fns";
import { useTheme } from "styled-components";
import { useShallow } from "zustand/react/shallow";

import { useCheckpointETAs } from "../../../hooks/useCheckpointETAs.js";
import useStore from "../../../store/store.js";

import style from "./StageETA.style.js";

const WEATHER_ICONS = {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudDrizzle,
  CloudLightning,
  Wind,
};

const StageETA = memo(function StageETA({ className }) {
  const theme = useTheme();
  const { raceStart, checkpointETAs, isPreRace } = useCheckpointETAs();
  const { forecasts, fetchWeatherForCheckpoints } = useStore(
    useShallow((state) => ({
      forecasts: state.weather.forecasts,
      fetchWeatherForCheckpoints: state.fetchWeatherForCheckpoints,
    })),
  );

  const mutedColor = theme.colors[theme.currentVariant]["--color-text"] + "59";

  // Compute both the fetch key (30-min buckets) and the payload together so the
  // effect always uses ETAs that are in sync with the key that triggered it.
  const { etaFetchKey, fetchCheckpoints } = useMemo(() => {
    if (!raceStart || isPreRace)
      return { etaFetchKey: null, fetchCheckpoints: [] };

    const eligible = checkpointETAs.filter(
      (cp) => cp.lat != null && cp.lon != null && cp.etaMs != null,
    );
    const key = eligible
      .map((cp) => Math.round(cp.etaMs / (30 * 60 * 1000)))
      .join(",");
    const checkpoints = eligible.map((cp) => ({
      name: cp.endLocation,
      lat: cp.lat,
      lon: cp.lon,
      etaMs: cp.etaMs,
    }));

    return { etaFetchKey: key, fetchCheckpoints: checkpoints };
  }, [checkpointETAs, raceStart, isPreRace]);

  useEffect(() => {
    if (!etaFetchKey || !fetchCheckpoints.length) return;
    fetchWeatherForCheckpoints(fetchCheckpoints);
    // fetchCheckpoints intentionally omitted: it's always in sync with etaFetchKey
    // (same useMemo), so including it would re-fetch on every GPS tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etaFetchKey, fetchWeatherForCheckpoints]);

  const sectionRows = useMemo(
    () =>
      checkpointETAs.map((cp) => ({
        id: cp.sectionId,
        endLocation: cp.endLocation,
        endKm: cp.endKm,
        isPast: cp.isPast,
        isCurrent: cp.isCurrent,
        etaStr:
          raceStart && cp.etaMs && !isPreRace
            ? format(new Date(cp.etaMs), "EEE HH:mm")
            : "--:--",
        difficulty: cp.difficulty,
        weather: forecasts[cp.endLocation] ?? null,
      })),
    [checkpointETAs, raceStart, isPreRace, forecasts],
  );

  if (!sectionRows.length) {
    return (
      <div className={className}>
        <div className="empty-state">No sections</div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="list-header">
        <span className="header-label">Checkpoint</span>
        <span className="header-label">ETA</span>
      </div>
      <div className="section-list" role="list">
        {sectionRows.map((section) => {
          const WeatherIcon = section.weather
            ? (WEATHER_ICONS[section.weather.icon] ?? Cloud)
            : null;

          return (
            <div
              key={section.id}
              role="listitem"
              className={`section-row${section.isPast ? " past" : ""}${section.isCurrent ? " current" : ""}`}
            >
              <div className="section-left">
                <div
                  className={`section-dot${section.isPast ? " past" : section.isCurrent ? " current" : ""}`}
                />
                <div className="section-info">
                  <span className="section-name">{section.endLocation}</span>
                  <div className="section-meta">
                    <span className="section-km">
                      {Number.isFinite(section.endKm)
                        ? `${section.endKm.toFixed(1)} km`
                        : ""}
                    </span>
                  </div>
                  {WeatherIcon && (
                    <div className="section-weather">
                      <WeatherIcon size={13} color={mutedColor} />
                      <span className="section-weather-temp">
                        {section.weather.temp}°C
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <span className="section-eta">{section.etaStr}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default style(StageETA);
