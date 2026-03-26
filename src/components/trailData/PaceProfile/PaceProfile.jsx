import { memo, useMemo } from "react";

import { useShallow } from "zustand/react/shallow";
import { area, curveCatmullRom, line } from "d3-shape";

import { createXScale, createYScale } from "../../../helpers/d3.js";
import useStore, { useProjectedLocation } from "../../../store/store.js";

import style from "./PaceProfile.style.js";

const WIDTH = 300;
const HEIGHT = 70;
const VPAD = 8;
const MAX_NAME_LEN = 12;
const MIN_GAP_PCT = 15;

const truncate = (str) =>
  str && str.length > MAX_NAME_LEN ? str.slice(0, MAX_NAME_LEN) + "…" : str;

const PaceProfile = memo(function PaceProfile({ className }) {
  const { sections, cumulativeDistances } = useStore(
    useShallow((state) => ({
      sections: state.sections,
      cumulativeDistances: state.gpx.cumulativeDistances || [],
    })),
  );
  const projectedLocation = useProjectedLocation();
  const projectedIndex = projectedLocation?.index ?? null;

  const chart = useMemo(() => {
    if (!sections?.length || !cumulativeDistances?.length) return null;

    const hasMaxTime = sections.every((s) => s.maxCompletionTime != null);

    const getPaceKmh = (section) => {
      if (section.totalDistance <= 0) return null;
      if (section.maxCompletionTime != null && section.maxCompletionTime > 0) {
        return (section.totalDistance / section.maxCompletionTime) * 3.6;
      }
      if (section.estimatedDuration > 0) {
        return (section.totalDistance / section.estimatedDuration) * 3.6;
      }
      return null;
    };

    const bars = sections
      .map((section) => {
        const pace = getPaceKmh(section);
        if (pace == null) return null;
        const startDist = cumulativeDistances[section.startIndex] ?? 0;
        const endDist =
          cumulativeDistances[section.endIndex] ??
          startDist + section.totalDistance;
        return {
          startDist,
          endDist,
          midDist: (startDist + endDist) / 2,
          pace,
          startLocation: section.startLocation || "",
        };
      })
      .filter(Boolean);

    if (!bars.length) return null;

    const totalDistM = cumulativeDistances[cumulativeDistances.length - 1];
    const totalDistKm = totalDistM / 1000;

    const paces = bars.map((b) => b.pace);
    const minPace = Math.min(...paces);
    const maxPace = Math.max(...paces);
    const paceRange = maxPace - minPace || 1;

    const scaleX = createXScale(
      { min: 0, max: totalDistM },
      { min: 0, max: WIDTH },
    );
    const scaleY = createYScale(
      { min: minPace - paceRange * 0.15, max: maxPace + paceRange * 0.15 },
      { min: HEIGHT, max: 0 },
    );

    // One curve point per section at midpoint distance, anchored to route edges
    const curvePoints = [
      { x: scaleX(bars[0].startDist), y: scaleY(bars[0].pace) },
      ...bars.map((b) => ({ x: scaleX(b.midDist), y: scaleY(b.pace) })),
      {
        x: scaleX(bars[bars.length - 1].endDist),
        y: scaleY(bars[bars.length - 1].pace),
      },
    ];

    const lineShape = line()
      .x((d) => d.x)
      .y((d) => d.y)
      .curve(curveCatmullRom.alpha(0.5));

    const areaShape = area()
      .x((d) => d.x)
      .y1((d) => d.y)
      .y0(scaleY(minPace - paceRange * 0.15))
      .curve(curveCatmullRom.alpha(0.5));

    const linePath = lineShape(curvePoints);
    const areaPath = areaShape(curvePoints);

    // Tightest section (highest required pace = hardest cutoff)
    const tightestBar = bars.reduce(
      (max, b) => (b.pace > max.pace ? b : max),
      bars[0],
    );

    // Distance-weighted average required pace across all sections
    const totalDist = bars.reduce(
      (sum, b) => sum + (b.endDist - b.startDist),
      0,
    );
    const avgPace =
      bars.reduce((sum, b) => sum + b.pace * (b.endDist - b.startDist), 0) /
      totalDist;

    // Runner position
    let markerX = null;
    let markerY = null;
    let markerPct = null;
    let runnerDistKm = null;
    let currentBar = null;

    if (
      projectedIndex !== null &&
      cumulativeDistances[projectedIndex] != null
    ) {
      const distM = cumulativeDistances[projectedIndex];
      markerX = scaleX(distM);
      markerPct = (markerX / WIDTH) * 100;
      runnerDistKm = Math.round(distM / 1000);
      currentBar =
        bars.find((b) => distM >= b.startDist && distM < b.endDist) ??
        bars[bars.length - 1];

      // Interpolate Y on the curve between the two nearest midpoint samples
      const left = curvePoints.filter((p) => p.x <= markerX).at(-1);
      const right = curvePoints.find((p) => p.x >= markerX);
      if (left && right && right.x !== left.x) {
        const t = (markerX - left.x) / (right.x - left.x);
        markerY = left.y + t * (right.y - left.y);
      } else {
        markerY = (left ?? right)?.y ?? null;
      }
    }

    // Section boundary labels — skip first bar, deduplicate overlapping labels
    let lastLabelPct = -MIN_GAP_PCT;
    const sectionMarkers = bars
      .slice(1)
      .map((bar) => {
        const x = scaleX(bar.startDist);
        return { x, pct: (x / WIDTH) * 100, name: truncate(bar.startLocation) };
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
      minPace,
      maxPace,
      totalDistKm,
      markerX,
      markerY,
      markerPct,
      runnerDistKm,
      sectionMarkers,
      hasMaxTime,
      tightestBar,
      currentBar,
      avgPace,
    };
  }, [sections, cumulativeDistances, projectedIndex]);

  if (!chart) return null;

  const {
    linePath,
    areaPath,
    minPace,
    maxPace,
    totalDistKm,
    markerX,
    markerY,
    markerPct,
    runnerDistKm,
    sectionMarkers,
    hasMaxTime,
    tightestBar,
    currentBar,
    avgPace,
  } = chart;

  return (
    <div className={className}>
      <div className="pp-header">
        <span className="pp-header-label">
          {hasMaxTime ? "Slowest Allowed Pace" : "Estimated Pace"}
        </span>
      </div>

      <div className="pp-chart">
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

          {/* Runner position */}
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
              {markerY !== null && (
                <circle cx={markerX} cy={markerY} r={3} fill="#ECBC3E" />
              )}
            </>
          )}
        </svg>

        {/* Axis labels — HTML overlay to avoid SVG text distortion */}
        <div className="pp-overlay">
          <span className="pp-label pp-label--tl">
            {maxPace.toFixed(1)} km/h
          </span>
          <span className="pp-label pp-label--bl">
            {minPace.toFixed(1)} km/h
          </span>
          <span className="pp-label pp-label--br">
            {totalDistKm.toFixed(0)} km
          </span>
        </div>
      </div>

      {/* Section names + runner distance below chart */}
      <div className="pp-bottom-labels">
        {sectionMarkers.map((s, i) => (
          <span
            key={i}
            className="pp-section-name"
            style={{ left: `${s.pct}%`, transform: "translateX(-50%)" }}
          >
            {s.name}
          </span>
        ))}
        {markerPct !== null && runnerDistKm != null && (
          <span
            className="pp-runner-value"
            style={{
              left: `clamp(12px, ${markerPct}%, calc(100% - 12px))`,
              transform: "translateX(-50%)",
            }}
          >
            {runnerDistKm} km
          </span>
        )}
      </div>

      <div className="pp-divider" />

      <div className="pp-stats">
        <div className="pp-stat">
          <span className="pp-stat-value pp-stat-value--tight">
            {tightestBar.pace.toFixed(1)}
            <span className="pp-stat-unit"> km/h</span>
          </span>
          <span className="pp-stat-label">tightest</span>
          <span className="pp-stat-name">
            {truncate(tightestBar.startLocation) || "—"}
          </span>
        </div>

        <div className="pp-stat-sep" />

        <div className="pp-stat">
          <span
            className={`pp-stat-value${currentBar ? " pp-stat-value--current" : ""}`}
          >
            {(currentBar ?? { pace: avgPace }).pace.toFixed(1)}
            <span className="pp-stat-unit"> km/h</span>
          </span>
          <span className="pp-stat-label">
            {currentBar ? "current" : "avg required"}
          </span>
          {currentBar && (
            <span className="pp-stat-name">
              {truncate(currentBar.startLocation) || "—"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

export default style(PaceProfile);
