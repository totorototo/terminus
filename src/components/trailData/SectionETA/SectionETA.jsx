import { Fragment, memo, useEffect, useMemo } from "react";

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

import { DIFFICULTY_COLORS, DIFFICULTY_LABELS } from "../../../constants.js";
import { useCheckpointETAs } from "../../../hooks/useCheckpointETAs.js";
import useStore, { useProjectedLocation } from "../../../store/store.js";

import style from "./SectionETA.style.js";

const WEATHER_ICONS = {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudDrizzle,
  CloudLightning,
  Wind,
};

// Distance-scaled connector rail: each segment's height grows with its real
// distance (px), floored so the caption stays legible and capped so a single
// long segment can't dominate the scroll.
const RAIL_MIN_PX = 46;
const RAIL_PER_KM = 7;
const RAIL_MAX_PX = 220;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function formatDuration(sec) {
  if (!sec || !Number.isFinite(sec) || sec <= 0) return "--";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function DifficultyDots({ difficulty }) {
  const color = difficulty > 0 ? DIFFICULTY_COLORS[difficulty - 1] : null;
  return (
    <div
      className="bc-dots"
      role="img"
      aria-label={DIFFICULTY_LABELS[difficulty - 1] ?? ""}
    >
      {[1, 2, 3, 4, 5].map((d) => (
        <span
          key={d}
          className={`bc-dot${d <= difficulty ? " filled" : ""}`}
          style={d <= difficulty ? { background: color } : undefined}
        />
      ))}
    </div>
  );
}

const SectionETA = memo(function SectionETA({ className }) {
  const theme = useTheme();
  const { raceStart, checkpointETAs, isPreRace } = useCheckpointETAs();
  const projectedLocation = useProjectedLocation();
  const {
    forecasts,
    fetchWeatherForCheckpoints,
    sections,
    cumulativeDistances,
  } = useStore(
    useShallow((state) => ({
      forecasts: state.weather.forecasts,
      fetchWeatherForCheckpoints: state.fetchWeatherForCheckpoints,
      sections: state.sections,
      cumulativeDistances: state.gpx.cumulativeDistances || [],
    })),
  );

  const weatherIconColor =
    theme.colors[theme.currentVariant]["--color-text"] + "cc";

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
    // fetchCheckpoints intentionally omitted: always in sync with etaFetchKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etaFetchKey, fetchWeatherForCheckpoints]);

  const { totalEstSec, rows } = useMemo(() => {
    if (!checkpointETAs.length) return { totalEstSec: 0, rows: [] };

    const projIndex = projectedLocation?.index || 0;

    let totalEstSec = 0;
    const rows = checkpointETAs.map((cp, i) => {
      const section = sections?.[i];
      const distKm = (section?.totalDistance || 0) / 1000;
      const gainM = Math.round(section?.totalElevation || 0);
      const lossM = Math.round(section?.totalElevationLoss || 0);
      const estSec = section?.estimatedDuration || 0;
      totalEstSec += estSec;

      // Connector height scales with real segment distance (non-linear list).
      const railPx = Math.round(
        clamp(RAIL_MIN_PX + distKm * RAIL_PER_KM, RAIL_MIN_PX, RAIL_MAX_PX),
      );

      // Progress within this segment: full when passed, fractional when current,
      // empty ahead. Drives both the rail fill and the runner bead position.
      let fillPct = 0;
      let beadPct = null;
      if (cp.isPast) {
        fillPct = 100;
      } else if (cp.isCurrent && section && cumulativeDistances.length) {
        const segStart = cumulativeDistances[section.startIndex] || 0;
        const segEnd = cumulativeDistances[section.endIndex] || 0;
        const here = cumulativeDistances[projIndex] || 0;
        const span = segEnd - segStart;
        const f = span > 0 ? clamp((here - segStart) / span, 0, 1) : 0;
        fillPct = f * 100;
        beadPct = f * 100;
      }

      return {
        id: cp.sectionId,
        endLocation: cp.endLocation,
        endKm: cp.endKm,
        isPast: cp.isPast,
        isCurrent: cp.isCurrent,
        isOverCutoff: cp.isOverCutoff,
        etaStr:
          raceStart && cp.etaMs && !isPreRace
            ? format(new Date(cp.etaMs), "EEE HH:mm")
            : "--:--",
        difficulty: cp.difficulty,
        weather: forecasts[cp.endLocation] ?? null,
        distKm,
        gainM,
        lossM,
        estSec,
        railPx,
        fillPct,
        beadPct,
      };
    });

    return { totalEstSec, rows };
  }, [
    checkpointETAs,
    sections,
    cumulativeDistances,
    projectedLocation?.index,
    raceStart,
    isPreRace,
    forecasts,
  ]);

  const startIsPast = !isPreRace && (projectedLocation?.index || 0) > 0;
  const startIsCurrent = !isPreRace && (projectedLocation?.index || 0) === 0;
  const startEtaStr =
    raceStart && !isPreRace
      ? format(new Date(raceStart), "EEE HH:mm")
      : "--:--";

  if (!rows.length) {
    return (
      <div className={className}>
        <div className="empty-state">No sections</div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="list-header">
        <span className="header-label">Checkpoints</span>
        <span className="header-total">
          {formatDuration(totalEstSec)} total
        </span>
      </div>
      <div className="section-list" role="list" tabIndex={0}>
        {/* Race start */}
        <div
          role="listitem"
          className={`cp-row${startIsPast ? " past" : startIsCurrent ? " current" : ""}`}
        >
          <div
            className={`cp-dot${startIsPast ? " past" : startIsCurrent ? " current" : ""}`}
          />
          <div className="cp-body">
            <div className="cp-line1">
              <span className="cp-name">
                {sections?.[0]?.startLocation || "Start"}
              </span>
              <span className="cp-eta">{startEtaStr}</span>
            </div>
            <div className="cp-line2">
              <span className="cp-km">0.0 km</span>
            </div>
          </div>
        </div>

        {rows.map((row) => {
          const stateClass = `${row.isPast ? " past" : ""}${row.isCurrent ? " current" : ""}`;
          const WeatherIcon = row.weather
            ? (WEATHER_ICONS[row.weather.icon] ?? Cloud)
            : null;

          return (
            <Fragment key={row.id}>
              {/* Distance-scaled segment rail */}
              <div
                className={`bc-row${stateClass}`}
                style={{ minHeight: row.railPx }}
                aria-hidden="true"
              >
                <div className="bc-rail">
                  <div
                    className="bc-rail-fill"
                    style={{ height: `${row.fillPct}%` }}
                  />
                  {row.beadPct != null && !isPreRace && (
                    <div
                      className="bc-bead"
                      style={{ top: `${row.beadPct}%` }}
                    />
                  )}
                </div>
                <div className="bc-caption">
                  <span className="bc-stat">{row.distKm.toFixed(1)} km</span>
                  {row.gainM > 0 && (
                    <span className="bc-stat">+{row.gainM}m</span>
                  )}
                  {row.lossM > 0 && (
                    <span className="bc-stat">−{row.lossM}m</span>
                  )}
                  <span className="bc-stat">{formatDuration(row.estSec)}</span>
                  <DifficultyDots difficulty={row.difficulty} />
                </div>
              </div>

              {/* Checkpoint line */}
              <div
                role="listitem"
                className={`cp-row${stateClass}${row.isOverCutoff ? " over-cutoff" : ""}`}
              >
                <div
                  className={`cp-dot${row.isPast ? " past" : row.isCurrent ? " current" : ""}`}
                />
                <div className="cp-body">
                  <div className="cp-line1">
                    <span className="cp-name">{row.endLocation}</span>
                    <span className="cp-eta">{row.etaStr}</span>
                  </div>
                  {(Number.isFinite(row.endKm) || WeatherIcon) && (
                    <div className="cp-line2">
                      {Number.isFinite(row.endKm) && (
                        <span className="cp-km">{row.endKm.toFixed(1)} km</span>
                      )}
                      {WeatherIcon && (
                        <div className="cp-weather">
                          <WeatherIcon size={15} color={weatherIconColor} />
                          <span className="cp-weather-temp">
                            {row.weather.temp}°C
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
});

const StyledSectionETA = style(SectionETA);

export default StyledSectionETA;
