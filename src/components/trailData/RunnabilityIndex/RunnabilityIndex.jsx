import { memo, useMemo } from "react";

import { useTheme } from "styled-components";

import { gradeBandColors } from "../../../helpers/gradeBandColors.js";
import useStore, { useProjectedLocation } from "../../../store/store.js";
import StripReadout from "../StripReadout/StripReadout.jsx";

import style from "./RunnabilityIndex.style.js";

const WIDTH = 300;
// why: matches SlopeIntensity's bump — 8px was a color-only sliver, hard to
// separate from itself on a phone in daylight.
const HEIGHT = 14;
const MAX_POINTS = 300;

// Bands on Minetti pace factor (cost of transport relative to flat) — chosen to
// land roughly where recreational/ultra runners shift gait to a hike, in the same
// mid-teens % grade range SlopeIntensity's own 10–15%/15–20% bands sit in. Tunable;
// no per-runner calibration (out of scope per the JTBD doc).
const RUNNABILITY_BANDS = [
  { max: 1.5, label: "Runnable" },
  { max: 2.3, label: "Marginal" },
  { max: Infinity, label: "Hike-only" },
];

const bandIndex = (paceFactor) =>
  RUNNABILITY_BANDS.findIndex((band) => paceFactor < band.max);

const RunnabilityIndex = memo(function RunnabilityIndex({ className }) {
  const gpxData = useStore((state) => state.gpx.data);
  const paceFactors = useStore((state) => state.gpx.paceFactors || []);
  const projectedLocation = useProjectedLocation();
  const projectedIndex = projectedLocation?.index ?? null;
  const theme = useTheme();

  // why: same single-hue ramp treatment as SlopeIntensity (mono, not a
  // 3-color traffic light) for visual consistency between the two strips —
  // keyed off --color-primary instead of --color-accent so the two derived
  // charts read as a matched pair rather than duplicating the same hue.
  const bandColors = useMemo(
    () => gradeBandColors(theme, RUNNABILITY_BANDS.length, "--color-primary"),
    [theme],
  );

  const chart = useMemo(() => {
    if (!gpxData?.length || !paceFactors.length) return null;

    const step = Math.max(1, Math.floor(gpxData.length / MAX_POINTS));
    const factors = [];
    for (let i = 0; i < gpxData.length; i += step)
      factors.push(paceFactors[i] || 1);
    if (factors.length < 2) return null;

    const segWidth = WIDTH / (factors.length - 1);
    const bands = factors.map((pf, i) => ({
      x: i * segWidth,
      width: segWidth + 0.5, // slight overlap avoids hairline seams
      color: bandColors[bandIndex(pf)],
    }));

    let doneWidth = null;
    let currentPct = null;
    let currentLabel = null;
    if (projectedIndex !== null) {
      const sampledIdx = Math.min(
        Math.floor(projectedIndex / step),
        factors.length - 1,
      );
      doneWidth = sampledIdx * segWidth;
      currentPct = (doneWidth / WIDTH) * 100;
      // why: label rather than raw pace factor — "Marginal" reads faster
      // at a glance than "1.8x" and matches what the legend already teaches.
      // Index clamped like sampledIdx above — projectedIndex can momentarily
      // outlive a shorter paceFactors array on a route swap.
      const clampedIndex = Math.min(projectedIndex, paceFactors.length - 1);
      const currentFactor = paceFactors[clampedIndex] || 1;
      currentLabel = RUNNABILITY_BANDS[bandIndex(currentFactor)].label;
    }

    const worstBandLabel =
      RUNNABILITY_BANDS[Math.max(...factors.map((pf) => bandIndex(pf)))].label;
    const ariaLabel = currentLabel
      ? `Runnability index strip: terrain runnability across the route, worst rating ${worstBandLabel}. Currently ${currentLabel}.`
      : `Runnability index strip: terrain runnability across the route, worst rating ${worstBandLabel}.`;

    return { bands, doneWidth, currentPct, currentLabel, ariaLabel };
  }, [gpxData, paceFactors, bandColors, projectedIndex]);

  if (!chart) return null;

  const { bands, doneWidth, currentPct, currentLabel, ariaLabel } = chart;

  return (
    <div className={className}>
      <svg
        className="ri-strip"
        role="img"
        aria-label={ariaLabel}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        width="100%"
        height={HEIGHT}
      >
        {bands.map((band, i) => (
          <rect
            key={i}
            x={band.x}
            y={0}
            width={band.width}
            height={HEIGHT}
            fill={band.color}
          />
        ))}
        {doneWidth !== null && (
          <rect
            className="ri-done-mask"
            x={0}
            y={0}
            width={doneWidth}
            height={HEIGHT}
          />
        )}
      </svg>

      <StripReadout
        pct={currentPct}
        value={currentLabel}
        color={theme.colors[theme.currentVariant]["--color-primary"]}
      />

      <div className="ri-legend">
        {RUNNABILITY_BANDS.map((band, i) => (
          <span key={band.label} className="ri-legend-item">
            <span
              className="ri-legend-dot"
              style={{ background: bandColors[i] }}
            />
            {band.label}
          </span>
        ))}
      </div>
    </div>
  );
});

const StyledRunnabilityIndex = style(RunnabilityIndex);

export default StyledRunnabilityIndex;
