import { memo, useMemo } from "react";

import { area as d3Area, curveCatmullRom } from "d3-shape";

import { createXScale, createYScale } from "../../../helpers/d3.js";
import { clockTimeAtIndex } from "../../../helpers/nightOverlay.js";
import { sunAltitudeDeg } from "../../../helpers/sunTimes.js";
import useStore, { useProjectedLocation } from "../../../store/store.js";

import style from "./DayNightProfile.style.js";

const WIDTH = 300;
const HEIGHT = 88;
const VPAD = 4;
const MAX_POINTS = 300;

const DayNightProfile = memo(function DayNightProfile({ className }) {
  const gpxData = useStore((state) => state.gpx.data);
  const cumulativeDistances = useStore(
    (state) => state.gpx.cumulativeDistances || [],
  );
  const sections = useStore((state) => state.sections || []);
  const projectedLocation = useProjectedLocation();
  const projectedIndex = projectedLocation?.index ?? null;

  // A smooth sun-altitude curve (Garmin-style) rather than a banded
  // day/night strip — above the zero line is day, below is night, and the
  // curve naturally arcs through dawn/dusk instead of a hard color edge.
  // Static pre-race estimate from sections' Minetti-derived durations +
  // local sun position (see nightOverlay.js/sunTimes.js). Degrades to `null`
  // (component renders nothing) when there's no GPX start `<time>` to anchor
  // the estimate to.
  const chart = useMemo(() => {
    if (!gpxData?.length || !cumulativeDistances?.length) return null;

    const raceStartMs =
      sections?.[0]?.startTime != null ? sections[0].startTime * 1000 : null;
    if (raceStartMs == null) return null;
    const startCoord = gpxData[0];

    const step = Math.max(1, Math.floor(gpxData.length / MAX_POINTS));
    const altitudes = [];
    for (let i = 0; i < gpxData.length; i += step) {
      const clockMs = clockTimeAtIndex(
        i,
        sections,
        cumulativeDistances,
        raceStartMs,
      );
      altitudes.push(
        clockMs != null
          ? sunAltitudeDeg(clockMs, startCoord[0], startCoord[1])
          : 0,
      );
    }
    if (altitudes.length < 2) return null;

    const maxAbsAltitude = Math.max(...altitudes.map(Math.abs), 1);

    const scaleX = createXScale(
      { min: 0, max: altitudes.length - 1 },
      { min: 0, max: WIDTH },
    );
    // why: zero-centered symmetric domain, same convention as SlopeProfile's
    // climb/descent chart — a high sun and a deep night get the same visual
    // weight either side of the horizon line, direction is a sign flip only.
    const scaleY = createYScale(
      { min: -maxAbsAltitude, max: maxAbsAltitude },
      { min: HEIGHT, max: 0 },
    );
    const zeroY = scaleY(0);

    const dayArea = d3Area()
      .x((_, i) => scaleX(i))
      .y0(zeroY)
      .y1((a) => scaleY(Math.max(a, 0)))
      .curve(curveCatmullRom.alpha(0.5))(altitudes);

    const nightArea = d3Area()
      .x((_, i) => scaleX(i))
      .y0(zeroY)
      .y1((a) => scaleY(Math.min(a, 0)))
      .curve(curveCatmullRom.alpha(0.5))(altitudes);

    let markerX = null;
    if (projectedIndex !== null) {
      const sampledIdx = Math.min(
        Math.floor(projectedIndex / step),
        altitudes.length - 1,
      );
      markerX = scaleX(sampledIdx);
    }

    return {
      dayArea,
      nightArea,
      zeroY,
      markerX,
      peakAltitude: Math.round(Math.max(...altitudes, 0)),
      lowAltitude: Math.round(Math.min(...altitudes, 0)),
    };
  }, [gpxData, cumulativeDistances, sections, projectedIndex]);

  if (!chart) return null;

  const { dayArea, nightArea, zeroY, markerX, peakAltitude, lowAltitude } =
    chart;

  return (
    <div className={className}>
      <svg
        aria-hidden="true"
        viewBox={`0 -${VPAD} ${WIDTH} ${HEIGHT + VPAD * 2}`}
        preserveAspectRatio="none"
        width="100%"
        style={{ aspectRatio: `${WIDTH} / ${HEIGHT + VPAD * 2}` }}
      >
        <line
          className="dn-horizon-line"
          x1={0}
          y1={zeroY}
          x2={WIDTH}
          y2={zeroY}
          strokeWidth="1"
        />
        {dayArea && <path className="dn-day-area" d={dayArea} stroke="none" />}
        {nightArea && (
          <path className="dn-night-area" d={nightArea} stroke="none" />
        )}
        {markerX !== null && (
          <rect
            className="dn-done-mask"
            x={0}
            y={-VPAD}
            width={markerX}
            height={HEIGHT + VPAD * 2}
          />
        )}
      </svg>

      <div className="dn-overlay">
        <span className="dn-label dn-label--day">{peakAltitude}°</span>
        <span className="dn-label dn-label--night">{lowAltitude}°</span>
      </div>
    </div>
  );
});

const StyledDayNightProfile = style(DayNightProfile);

export default StyledDayNightProfile;
