import { Fragment, memo, useEffect, useMemo } from "react";

import { ArrowDown } from "@styled-icons/feather/ArrowDown";
import { ArrowUp } from "@styled-icons/feather/ArrowUp";
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

// Distance-scaled connector rail: each leg's height grows with its real
// distance (px), floored so the in-rail caption stays legible and capped so
// a single long leg can't dominate the scroll.
const RAIL_MIN_PX = 64;
const RAIL_PER_KM = 7;
const RAIL_MAX_PX = 220;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Progress within a leg: full when passed, fractional when current (via the
// runner's projected index), empty ahead. Drives the rail fill and bead.
function legProgress(
  section,
  isPast,
  isCurrent,
  cumulativeDistances,
  projIndex,
) {
  if (isPast) return 100;
  if (!isCurrent || !section || !cumulativeDistances.length) return 0;
  const segStart = cumulativeDistances[section.startIndex] || 0;
  const segEnd = cumulativeDistances[section.endIndex] || 0;
  const here = cumulativeDistances[projIndex] || 0;
  const span = segEnd - segStart;
  return span > 0 ? clamp((here - segStart) / span, 0, 1) * 100 : 0;
}

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

// Horizontal gain/loss split — same read as the vertical rail's fill, but
// scannable at a glance instead of requiring the eye to compare two numbers.
function ProfileStrip({ gainM, lossM }) {
  const total = gainM + lossM;
  if (total <= 0) return null;
  const gainPct = Math.round((gainM / total) * 100);
  return (
    <div className="bc-profile">
      <div className="bc-profile-gain" style={{ width: `${gainPct}%` }} />
      <div className="bc-profile-loss" style={{ width: `${100 - gainPct}%` }} />
    </div>
  );
}

function ElevStat({ direction, value }) {
  const Icon = direction === "up" ? ArrowUp : ArrowDown;
  return (
    <span className={`bc-elev bc-elev-${direction}`}>
      <Icon size={11} />
      {value}m
    </span>
  );
}

// Distance/eta and elevation/difficulty for the leg AHEAD of a block (Start
// or a checkpoint) — shared so Start and checkpoint cards render identically.
function LegCaption({ distKm, gainM, lossM, estSec, difficulty }) {
  return (
    <div className="bc-caption">
      <ProfileStrip gainM={gainM} lossM={lossM} />
      <div className="bc-caption-row">
        <span className="bc-stat">{distKm.toFixed(1)} km</span>
        <span className="bc-stat">{formatDuration(estSec)}</span>
      </div>
      <div className="bc-caption-row">
        {gainM > 0 && <ElevStat direction="up" value={gainM} />}
        {lossM > 0 && <ElevStat direction="down" value={lossM} />}
        <DifficultyDots difficulty={difficulty} />
      </div>
    </div>
  );
}

// Weather promoted to its own full-width row (own icon, own margins) rather
// than a squeezed inline badge, so cold/wet/windy checkpoints stay legible.
function WeatherLine({ weather, iconColor, flaggedIconColor }) {
  const Icon = WEATHER_ICONS[weather.icon] ?? Cloud;
  const isCold = weather.temp <= 0;
  const isWet = weather.precipitation != null && weather.precipitation >= 50;
  const isWindy = weather.wind >= 30;
  const flagged = isCold || isWet || isWindy;

  return (
    <div className={`cp-weather-line${flagged ? " flagged" : ""}`}>
      <div className="cp-weather-main">
        <Icon size={16} color={flagged ? flaggedIconColor : iconColor} />
        <span className="cp-weather-temp">
          {weather.temp > 0 ? `+${weather.temp}` : weather.temp}°
        </span>
      </div>
      <div className="cp-weather-detail">
        {weather.precipitation != null && (
          <span>{weather.precipitation}% precip</span>
        )}
        <span className="cp-weather-wind">
          <Wind size={11} />
          {weather.wind} km/h
        </span>
      </div>
    </div>
  );
}

const SectionETA = memo(function SectionETA({ className }) {
  const theme = useTheme();
  const { raceStart, checkpointETAs, isPreRace, hasGPSLock } =
    useCheckpointETAs();
  const projectedLocation = useProjectedLocation();
  const {
    forecasts,
    fetchWeatherForCheckpoints,
    sections,
    coordinates,
    cumulativeDistances,
  } = useStore(
    useShallow((state) => ({
      forecasts: state.weather.forecasts,
      fetchWeatherForCheckpoints: state.fetchWeatherForCheckpoints,
      sections: state.sections,
      coordinates: state.gpx.data,
      cumulativeDistances: state.gpx.cumulativeDistances || [],
    })),
  );
  const projIndex = projectedLocation?.index || 0;

  const startLocation = sections?.[0]?.startLocation || "Start";
  const startCoord = coordinates?.[sections?.[0]?.startIndex ?? -1];

  const weatherIconColor =
    theme.colors[theme.currentVariant]["--color-text"] + "cc";
  const weatherFlaggedIconColor =
    theme.colors[theme.currentVariant]["--color-text"];

  const { etaFetchKey, fetchCheckpoints } = useMemo(() => {
    if (!raceStart || isPreRace)
      return { etaFetchKey: null, fetchCheckpoints: [] };

    const eligible = checkpointETAs.filter(
      (cp) => cp.lat != null && cp.lon != null && cp.etaMs != null,
    );
    const checkpoints = eligible.map((cp) => ({
      name: cp.endLocation,
      lat: cp.lat,
      lon: cp.lon,
      etaMs: cp.etaMs,
    }));

    if (startCoord) {
      checkpoints.unshift({
        name: startLocation,
        lat: startCoord[0],
        lon: startCoord[1],
        etaMs: raceStart,
      });
    }

    const key = checkpoints
      .map((cp) => Math.round(cp.etaMs / (30 * 60 * 1000)))
      .join(",");

    return { etaFetchKey: key, fetchCheckpoints: checkpoints };
  }, [checkpointETAs, raceStart, isPreRace, startCoord, startLocation]);

  useEffect(() => {
    if (!etaFetchKey || !fetchCheckpoints.length) return;
    fetchWeatherForCheckpoints(fetchCheckpoints);
    // fetchCheckpoints intentionally omitted: always in sync with etaFetchKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etaFetchKey, fetchWeatherForCheckpoints]);

  const { totalEstSec, rows, startCaption } = useMemo(() => {
    if (!checkpointETAs.length)
      return { totalEstSec: 0, rows: [], startCaption: null };

    // Each block's caption describes the leg AHEAD of it (to the next
    // location), not the leg just completed — Start's caption is section[0],
    // checkpoint i's caption is section[i + 1].
    const toCaption = (sec) => ({
      distKm: (sec?.totalDistance || 0) / 1000,
      gainM: Math.round(sec?.totalElevation || 0),
      lossM: Math.round(sec?.totalElevationLoss || 0),
      estSec: sec?.estimatedDuration || 0,
      difficulty: sec?.difficulty || 0,
    });

    const startCaption = sections?.length ? toCaption(sections[0]) : null;

    let totalEstSec = 0;
    const rows = checkpointETAs.map((cp, i) => {
      const section = sections?.[i];
      totalEstSec += section?.estimatedDuration || 0;
      const aheadSection = sections?.[i + 1];
      const { distKm, gainM, lossM, estSec, difficulty } =
        toCaption(aheadSection);

      // A row's own past/current state now tracks the leg AHEAD of it (see
      // toCaption above), not the leg that ends here — so it's borrowed from
      // the next checkpoint's arrival state: we're "at" Hautacam and
      // "current" for as long as we're en route to Pierrefitte, not once we
      // arrive there. The last checkpoint has no next leg, so it keeps its
      // own arrival state.
      const next = checkpointETAs[i + 1];
      const isPast = next ? next.isPast : cp.isPast;
      const isCurrent = next ? next.isCurrent : cp.isCurrent;

      const railPx = Math.round(
        clamp(RAIL_MIN_PX + distKm * RAIL_PER_KM, RAIL_MIN_PX, RAIL_MAX_PX),
      );
      const fillPct = legProgress(
        aheadSection,
        isPast,
        isCurrent,
        cumulativeDistances,
        projIndex,
      );
      const beadPct = isCurrent ? fillPct : null;

      return {
        id: cp.sectionId,
        endLocation: cp.endLocation,
        endKm: cp.endKm,
        isPast,
        isCurrent,
        isOverCutoff: cp.isOverCutoff,
        etaStr:
          raceStart && cp.etaMs && !isPreRace
            ? format(new Date(cp.etaMs), "EEE HH:mm")
            : "--:--",
        difficulty,
        hasNextLeg: aheadSection != null,
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

    return { totalEstSec, rows, startCaption };
  }, [
    checkpointETAs,
    sections,
    raceStart,
    isPreRace,
    forecasts,
    cumulativeDistances,
    projIndex,
  ]);

  // Start's past/current mirrors checkpointETAs[0] (the leg Start→first
  // checkpoint is Start's "leg ahead", same borrowing as the rows above).
  // Without a GPS fix the hook withholds isPast/isCurrent from every leg, so
  // Start stays "current" (not past) until hasGPSLock actually places the
  // runner on course — only one row is ever current.
  const startIsPast = !isPreRace && hasGPSLock && !!checkpointETAs[0]?.isPast;
  const startIsCurrent =
    !isPreRace && (!hasGPSLock || !!checkpointETAs[0]?.isCurrent);
  const startEtaStr =
    raceStart && !isPreRace
      ? format(new Date(raceStart), "EEE HH:mm")
      : "--:--";
  const startWeather = forecasts[startLocation] ?? null;

  const startRailPx = startCaption
    ? Math.round(
        clamp(
          RAIL_MIN_PX + startCaption.distKm * RAIL_PER_KM,
          RAIL_MIN_PX,
          RAIL_MAX_PX,
        ),
      )
    : RAIL_MIN_PX;
  const startFillPct = legProgress(
    sections?.[0],
    startIsPast,
    startIsCurrent,
    cumulativeDistances,
    projIndex,
  );
  const startBeadPct = startIsCurrent ? startFillPct : null;

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
              <span className="cp-name">{startLocation}</span>
              <span className="cp-eta">{startEtaStr}</span>
            </div>
            <div className="cp-line2">
              <span className="cp-km">0.0 km</span>
            </div>
            {startWeather && (
              <WeatherLine
                weather={startWeather}
                iconColor={weatherIconColor}
                flaggedIconColor={weatherFlaggedIconColor}
              />
            )}
          </div>
        </div>

        {startCaption && (
          <div
            className={`bc-row${startIsPast ? " past" : startIsCurrent ? " current" : ""}`}
            style={{ minHeight: startRailPx }}
            aria-hidden="true"
          >
            <div className="bc-rail">
              <div
                className="bc-rail-fill"
                style={{ height: `${startFillPct}%` }}
              />
              {startBeadPct != null && !isPreRace && (
                <div className="bc-bead" style={{ top: `${startBeadPct}%` }} />
              )}
            </div>
            <LegCaption {...startCaption} />
          </div>
        )}

        {rows.map((row) => {
          const stateClass = `${row.isPast ? " past" : ""}${row.isCurrent ? " current" : ""}`;

          return (
            <Fragment key={row.id}>
              {/* Checkpoint card — name, distance, weather, then the leg
                  AHEAD (distance/eta, elevation/difficulty to the next
                  location). */}
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
                  {Number.isFinite(row.endKm) && (
                    <div className="cp-line2">
                      <span className="cp-km">{row.endKm.toFixed(1)} km</span>
                    </div>
                  )}
                  {row.weather && (
                    <WeatherLine
                      weather={row.weather}
                      iconColor={weatherIconColor}
                      flaggedIconColor={weatherFlaggedIconColor}
                    />
                  )}
                </div>
              </div>

              {/* Distance-scaled rail for the leg ahead of this checkpoint,
                  with the leg's stats centered in the gap it spans */}
              {row.hasNextLeg && (
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
                  <LegCaption
                    distKm={row.distKm}
                    gainM={row.gainM}
                    lossM={row.lossM}
                    estSec={row.estSec}
                    difficulty={row.difficulty}
                  />
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
});

const StyledSectionETA = style(SectionETA);

export default StyledSectionETA;
