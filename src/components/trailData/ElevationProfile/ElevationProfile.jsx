import { memo, useMemo } from "react";

import { rgba } from "polished";
import { useTheme } from "styled-components";

import {
  createXScale,
  createYScale,
  getArea,
  getLine,
} from "../../../helpers/d3.js";
import { clockTimeAtIndex } from "../../../helpers/nightOverlay.js";
import { sunAltitudeDeg } from "../../../helpers/sunTimes.js";
import useStore, { useProjectedLocation } from "../../../store/store.js";

import style from "./ElevationProfile.style.js";

const WIDTH = 300;
const HEIGHT = 70;
const VPAD = 8;
const MAX_POINTS = 300;
const MAX_NAME_LEN = 12;

const truncate = (str) =>
  str && str.length > MAX_NAME_LEN ? str.slice(0, MAX_NAME_LEN) + "…" : str;

const ElevationProfile = memo(function ElevationProfile({ className }) {
  const gpxData = useStore((state) => state.gpx.data);
  const cumulativeDistances = useStore(
    (state) => state.gpx.cumulativeDistances || [],
  );
  const legs = useStore((state) => state.legs || []);
  const sections = useStore((state) => state.sections || []);
  const projectedLocation = useProjectedLocation();
  const projectedIndex = projectedLocation?.index ?? null;
  const theme = useTheme();

  // why: reuse RunnabilityIndex's amber (day) and SlopeProfile's sage
  // (night) rather than a bespoke hue — the profile card sits between
  // those two strips, so borrowing their colors reads as one connected
  // day/night signal instead of introducing a third palette.
  const dayNightColors = useMemo(() => {
    const colors = theme.colors[theme.currentVariant];
    return {
      day: colors["--color-primary"],
      night: colors["--color-secondary"],
    };
  }, [theme]);

  const chart = useMemo(() => {
    if (!gpxData?.length) return null;

    const step = Math.max(1, Math.floor(gpxData.length / MAX_POINTS));
    const sampled = gpxData.filter((_, i) => i % step === 0);

    const elevations = sampled.map((p) => p[2]);
    const minElev = Math.min(...elevations);
    const maxElev = Math.max(...elevations);
    const elevRange = maxElev - minElev || 1;

    const scaleX = createXScale(
      { min: 0, max: sampled.length - 1 },
      { min: 0, max: WIDTH },
    );
    const scaleY = createYScale(
      { min: minElev - elevRange * 0.1, max: maxElev + elevRange * 0.1 },
      { min: HEIGHT, max: 0 },
    );

    const { path: linePath } = getLine(sampled, scaleX, scaleY);
    const { path: areaPath } = getArea(
      sampled,
      scaleX,
      scaleY,
      minElev - elevRange * 0.1,
    );

    // Day/night blocks, one solid-fill area segment per contiguous run of
    // sun-above/below-horizon sampled points — a hard cut, no twilight
    // blending, so each block reads as one flat color like the
    // RunnabilityIndex/SlopeIntensity strips. Degrades to `null` (plain
    // themed fill) when there's no GPX start `<time>` to anchor the
    // sun-position estimate to — same guard DayNightProfile used.
    let dayNight = null;
    const raceStartMs =
      sections?.[0]?.startTime != null ? sections[0].startTime * 1000 : null;
    if (raceStartMs != null && sampled.length > 1) {
      const startCoord = gpxData[0];
      const { day: dayColor, night: nightColor } = dayNightColors;

      const altitudes = sampled.map((_, i) => {
        const clockMs = clockTimeAtIndex(
          i * step,
          sections,
          cumulativeDistances,
          raceStartMs,
        );
        return clockMs != null
          ? sunAltitudeDeg(clockMs, startCoord[0], startCoord[1])
          : null;
      });

      if (altitudes.every((a) => a != null)) {
        const isDay = altitudes.map((altitude) => altitude >= 0);

        // Each segment's end index is the next segment's start index, so
        // the two area paths share a vertex at the transition and meet
        // with no seam or gap.
        const segments = [];
        let segStart = 0;
        for (let i = 1; i < isDay.length; i++) {
          if (isDay[i] !== isDay[segStart]) {
            segments.push({ start: segStart, end: i, day: isDay[segStart] });
            segStart = i;
          }
        }
        segments.push({
          start: segStart,
          end: isDay.length - 1,
          day: isDay[segStart],
        });

        const areaSegments = segments.map((seg) => ({
          path: getArea(
            sampled.slice(seg.start, seg.end + 1),
            scaleX,
            scaleY,
            minElev - elevRange * 0.1,
            seg.start,
          ).path,
          color: rgba(seg.day ? dayColor : nightColor, 0.3),
        }));

        dayNight = {
          areaSegments,
          dayColor,
          nightColor,
          peakAltitude: Math.round(Math.max(...altitudes)),
          lowAltitude: Math.round(Math.min(...altitudes)),
        };
      }
    }

    let markerX = null;
    let markerY = null;
    let markerPct = null;
    let runnerDistanceKm = null;

    if (projectedIndex !== null && gpxData[projectedIndex]) {
      const sampledIdx = Math.floor(projectedIndex / step);
      markerX = scaleX(sampledIdx);
      markerY = scaleY(gpxData[projectedIndex][2]);
      markerPct = (markerX / WIDTH) * 100;
      runnerDistanceKm =
        cumulativeDistances[projectedIndex] != null
          ? Math.round(cumulativeDistances[projectedIndex] / 1000)
          : null;
    }

    // Section boundary markers — skip index 0 and filter overlapping labels.
    // MIN_GAP_PCT: ~15% of chart width per label (~50px on a 330px container).
    // Also drop any label that would collide with the runner km label.
    const MIN_GAP_PCT = 15;
    let lastLabelPct = -MIN_GAP_PCT;
    const sectionMarkers = legs
      .filter((s) => s.startIndex > 0)
      .map((s) => {
        const x = scaleX(Math.floor(s.startIndex / step));
        return {
          x,
          pct: (x / WIDTH) * 100,
          name: truncate(s.startLocation),
        };
      })
      .filter((s) => {
        const tooCloseToRunner =
          markerPct !== null && Math.abs(s.pct - markerPct) < MIN_GAP_PCT;
        if (tooCloseToRunner) return false;
        if (s.pct - lastLabelPct < MIN_GAP_PCT) return false;
        lastLabelPct = s.pct;
        return true;
      });

    const roundedMinElev = Math.round(minElev);
    const roundedMaxElev = Math.round(maxElev);
    const ariaLabel =
      runnerDistanceKm != null
        ? `Elevation profile ranging from ${roundedMinElev} to ${roundedMaxElev} meters. Runner currently at ${runnerDistanceKm} km, ${Math.round(gpxData[projectedIndex][2])} meters elevation.`
        : `Elevation profile ranging from ${roundedMinElev} to ${roundedMaxElev} meters.`;

    return {
      linePath,
      areaPath,
      dayNight,
      markerX,
      markerY,
      markerPct,
      minElev: roundedMinElev,
      maxElev: roundedMaxElev,
      runnerDistanceKm,
      sectionMarkers,
      ariaLabel,
    };
  }, [
    gpxData,
    cumulativeDistances,
    legs,
    sections,
    dayNightColors,
    projectedIndex,
  ]);

  if (!chart) return null;

  const {
    linePath,
    areaPath,
    dayNight,
    markerX,
    markerY,
    markerPct,
    minElev,
    maxElev,
    runnerDistanceKm,
    sectionMarkers,
    ariaLabel,
  } = chart;

  return (
    <div className={className}>
      <div className="ep-chart">
        <svg
          role="img"
          aria-label={ariaLabel}
          viewBox={`0 -${VPAD} ${WIDTH} ${HEIGHT + VPAD * 2}`}
          preserveAspectRatio="none"
          width="100%"
          style={{ aspectRatio: `${WIDTH} / ${HEIGHT + VPAD * 2}` }}
        >
          {dayNight
            ? dayNight.areaSegments.map((seg, i) => (
                <path
                  key={i}
                  className="ep-area"
                  d={seg.path}
                  stroke="none"
                  style={{ fill: seg.color }}
                />
              ))
            : areaPath && (
                <path className="ep-area" d={areaPath} stroke="none" />
              )}
          {linePath && (
            <path
              className="ep-line"
              d={linePath}
              fill="none"
              strokeWidth="1.5"
            />
          )}
          {/* Section boundary lines */}
          {sectionMarkers.map((s, i) => (
            <line
              key={i}
              className="ep-section-line"
              x1={s.x}
              y1={-VPAD}
              x2={s.x}
              y2={HEIGHT + VPAD}
              strokeWidth="1"
              strokeDasharray="2 3"
            />
          ))}
          {markerX !== null && (
            <>
              <line
                className="ep-runner-line"
                x1={markerX}
                y1={-VPAD}
                x2={markerX}
                y2={HEIGHT + VPAD}
                strokeWidth="1.5"
                strokeDasharray="3 2"
              />
              <circle
                className="ep-runner-dot"
                cx={markerX}
                cy={markerY}
                r={3}
              />
            </>
          )}
        </svg>

        {/* Axis labels — HTML overlay to avoid SVG text distortion */}
        <div className="ep-overlay">
          <span className="ep-label ep-label--tl">
            {minElev} / {maxElev} m
          </span>
          {dayNight && (
            <span className="ep-label ep-label--tr">
              <span className="ep-daynight-peak">{dayNight.peakAltitude}°</span>
              {" / "}
              <span className="ep-daynight-low">{dayNight.lowAltitude}°</span>
            </span>
          )}
        </div>
      </div>

      {/* Section names + runner distance below chart */}
      <div className="ep-bottom-labels">
        {sectionMarkers.map((s, i) => (
          <span
            key={i}
            className="ep-section-name"
            style={{ left: `${s.pct}%`, transform: "translateX(-50%)" }}
          >
            {s.name}
          </span>
        ))}
        {markerPct !== null && runnerDistanceKm != null && (
          <span
            className="ep-runner-value"
            style={{
              left: `clamp(12px, ${markerPct}%, calc(100% - 12px))`,
              transform: "translateX(-50%)",
            }}
          >
            {runnerDistanceKm} km
          </span>
        )}
      </div>

      {dayNight && (
        <div className="ep-legend">
          <span className="ep-legend-item">
            <span
              className="ep-legend-dot"
              style={{ background: dayNight.dayColor }}
            />
            Day
          </span>
          <span className="ep-legend-item">
            <span
              className="ep-legend-dot"
              style={{ background: dayNight.nightColor }}
            />
            Night
          </span>
        </div>
      )}
    </div>
  );
});

const StyledElevationProfile = style(ElevationProfile);

export default StyledElevationProfile;
