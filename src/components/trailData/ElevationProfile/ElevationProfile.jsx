import { memo, useMemo } from "react";

import {
  createXScale,
  createYScale,
  getArea,
  getLine,
} from "../../../helpers/d3.js";
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
  const sections = useStore((state) => state.sections || []);
  const projectedLocation = useProjectedLocation();
  const projectedIndex = projectedLocation?.index ?? null;

  const chart = useMemo(() => {
    if (!gpxData?.length) return null;

    const step = Math.max(1, Math.floor(gpxData.length / MAX_POINTS));
    const sampled = gpxData.filter((_, i) => i % step === 0);

    const elevations = sampled.map((p) => p[2]);
    const minElev = Math.min(...elevations);
    const maxElev = Math.max(...elevations);
    const elevRange = maxElev - minElev || 1;

    const totalDistanceKm =
      cumulativeDistances.length > 0
        ? Math.round(cumulativeDistances[cumulativeDistances.length - 1] / 1000)
        : null;

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
    const sectionMarkers = sections
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

    return {
      linePath,
      areaPath,
      markerX,
      markerY,
      markerPct,
      minElev: Math.round(minElev),
      maxElev: Math.round(maxElev),
      totalDistanceKm,
      runnerDistanceKm,
      sectionMarkers,
    };
  }, [gpxData, cumulativeDistances, sections, projectedIndex]);

  if (!chart) return null;

  const {
    linePath,
    areaPath,
    markerX,
    markerY,
    markerPct,
    minElev,
    maxElev,
    totalDistanceKm,
    runnerDistanceKm,
    sectionMarkers,
  } = chart;

  return (
    <div className={className}>
      <div className="ep-chart">
        <svg
          viewBox={`0 -${VPAD} ${WIDTH} ${HEIGHT + VPAD * 2}`}
          preserveAspectRatio="none"
          width="100%"
          height={HEIGHT + VPAD * 2}
        >
          {areaPath && (
            <path d={areaPath} fill="rgba(244,247,245,0.06)" stroke="none" />
          )}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="rgba(244,247,245,0.35)"
              strokeWidth="1.5"
            />
          )}
          {/* Section boundary lines */}
          {sectionMarkers.map((s, i) => (
            <line
              key={i}
              x1={s.x}
              y1={-VPAD}
              x2={s.x}
              y2={HEIGHT + VPAD}
              stroke="rgba(244,247,245,0.2)"
              strokeWidth="1"
              strokeDasharray="2 3"
            />
          ))}
          {markerX !== null && (
            <>
              <line
                x1={markerX}
                y1={-VPAD}
                x2={markerX}
                y2={HEIGHT + VPAD}
                stroke="#ECBC3E"
                strokeWidth="1.5"
                strokeDasharray="3 2"
              />
              <circle cx={markerX} cy={markerY} r={3} fill="#ECBC3E" />
            </>
          )}
        </svg>

        {/* Axis labels — HTML overlay to avoid SVG text distortion */}
        <div className="ep-overlay">
          <span className="ep-label ep-label--tl">{maxElev} m</span>
          <span className="ep-label ep-label--bl">{minElev} m</span>
          {totalDistanceKm != null && (
            <span className="ep-label ep-label--br">{totalDistanceKm} km</span>
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
    </div>
  );
});

export default style(ElevationProfile);
