import { Fragment, memo, useEffect, useMemo } from "react";

import { AlertTriangle } from "@styled-icons/feather/AlertTriangle";
import { Clock } from "@styled-icons/feather/Clock";
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
import { useScrollCurrentIntoView } from "../../../hooks/useScrollCurrentIntoView.js";
import useStore, { useProjectedLocation } from "../../../store/store.js";
import { formatDuration, legProgress, railHeightPx } from "../etaLegHelpers.js";
import { LegCaption } from "../LegCaption.jsx";

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
  const projTimestamp = projectedLocation?.timestamp || 0;

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

      const railPx = railHeightPx(distKm);
      const fillPct = legProgress(
        aheadSection,
        isPast,
        isCurrent,
        cumulativeDistances,
        projIndex,
      );
      const beadPct = isCurrent ? fillPct : null;

      // Countdown to THIS checkpoint's arrival — keyed on the hook's own
      // (pre-borrow) isCurrent, i.e. the runner is inside the section that
      // ends here, so cp.etaMs is the next arrival. Relative to the fix's
      // timestamp, matching the base the hook computed etaMs from.
      const remainSec =
        cp.isCurrent && cp.etaMs && projTimestamp > 0
          ? (cp.etaMs - projTimestamp) / 1000
          : 0;
      const countdownStr =
        remainSec > 60 ? `in ${formatDuration(remainSec)}` : null;

      const cutoffStr =
        cp.cutoffMs != null ? format(new Date(cp.cutoffMs), "EEE HH:mm") : null;

      return {
        id: cp.sectionId,
        endLocation: cp.endLocation,
        endKm: cp.endKm,
        isPast,
        isCurrent,
        isOverCutoff: cp.isOverCutoff,
        // Pre-race the hook already computes the planned schedule (raceStart +
        // estimated durations) — show it instead of a wall of "--:--"; the
        // `planned` class dims it to distinguish plan from live ETA.
        etaStr:
          raceStart && cp.etaMs
            ? format(new Date(cp.etaMs), "EEE HH:mm")
            : "--:--",
        difficulty,
        hasNextLeg: aheadSection != null,
        weather: forecasts[cp.endLocation] ?? null,
        countdownStr,
        cutoffStr,
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
    forecasts,
    cumulativeDistances,
    projIndex,
    projTimestamp,
  ]);

  // Start's past/current mirrors checkpointETAs[0] (the leg Start→first
  // checkpoint is Start's "leg ahead", same borrowing as the rows above).
  // With a GPS fix, trust the projected position outright — the rows do, and
  // gating on isPreRace here left the start rail empty while later rails
  // filled (shifted-clock debug data can be pre-race yet mid-course).
  // Without a fix the hook withholds isPast/isCurrent from every leg, so
  // Start stays "current" until hasGPSLock places the runner — only one row
  // is current.
  const startIsPast = !!checkpointETAs[0]?.isPast;
  const startIsCurrent = hasGPSLock
    ? !!checkpointETAs[0]?.isCurrent
    : !isPreRace;
  const startEtaStr = raceStart
    ? format(new Date(raceStart), "EEE HH:mm")
    : "--:--";
  const startWeather = forecasts[startLocation] ?? null;

  const currentRowKey = startIsCurrent
    ? "start"
    : (rows.find((r) => r.isCurrent)?.id ?? null);
  const listRef = useScrollCurrentIntoView(currentRowKey);

  const startRailPx = railHeightPx(startCaption?.distKm ?? 0);
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
      <div className="section-list" role="list" tabIndex={0} ref={listRef}>
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
              <span className={`cp-eta${isPreRace ? " planned" : ""}`}>
                {startEtaStr}
              </span>
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
                    <span className={`cp-eta${isPreRace ? " planned" : ""}`}>
                      {row.etaStr}
                    </span>
                  </div>
                  {Number.isFinite(row.endKm) && (
                    <div className="cp-line2">
                      <span className="cp-km">{row.endKm.toFixed(1)} km</span>
                      {(row.cutoffStr || row.countdownStr) && (
                        <span className="cp-line2-right">
                          {row.cutoffStr && (
                            <span
                              className={`cp-cutoff${row.isOverCutoff ? " breached" : ""}`}
                              aria-label={`Cutoff ${row.cutoffStr}`}
                            >
                              {row.isOverCutoff ? (
                                <AlertTriangle size={11} />
                              ) : (
                                <Clock size={11} />
                              )}
                              {row.cutoffStr}
                            </span>
                          )}
                          {row.countdownStr && (
                            <span className="cp-countdown">
                              {row.countdownStr}
                            </span>
                          )}
                        </span>
                      )}
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
