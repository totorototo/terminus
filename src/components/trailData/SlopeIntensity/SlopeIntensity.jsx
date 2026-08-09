import { memo, useMemo } from "react";

import { hsl, parseToHsl } from "polished";
import { useTheme } from "styled-components";

import useStore, { useProjectedLocation } from "../../../store/store.js";

import style from "./SlopeIntensity.style.js";

const WIDTH = 300;
// why: 8px read as a color-only sliver in daylight; taller bands plus the
// live readout below give a glance-while-moving reader two independent cues.
const HEIGHT = 14;
const MAX_POINTS = 300;

const GRADE_BANDS = [
  { max: 5, label: "0–5%" },
  { max: 10, label: "5–10%" },
  { max: 15, label: "10–15%" },
  { max: 20, label: "15–20%" },
  { max: Infinity, label: "20%+" },
];

const bandIndex = (absGrade) =>
  GRADE_BANDS.findIndex((band) => absGrade < band.max);

const SlopeIntensity = memo(function SlopeIntensity({ className }) {
  const gpxData = useStore((state) => state.gpx.data);
  const slopes = useStore((state) => state.gpx.slopes || []);
  const projectedLocation = useProjectedLocation();
  const projectedIndex = projectedLocation?.index ?? null;
  const theme = useTheme();

  // why: a single-hue sequential ramp (same hue/saturation as the theme's
  // "accent" token, lightness stepping from a pale tint down to the accent
  // color itself) reads severity ordering more directly than a hue-rotating
  // rainbow, and stays consistent with the app's mostly monochrome palette.
  // The most severe band lands exactly on --color-accent, so it still means
  // the same thing here as everywhere else it's used.
  const bandColors = useMemo(() => {
    const colors = theme.colors[theme.currentVariant];
    const accent = parseToHsl(colors["--color-accent"]);
    // why: widened from +0.35 so adjacent bands sit further apart in
    // lightness — the original spread was too subtle to tell bands apart
    // on a phone screen outdoors.
    const tintLightness = Math.min(0.92, accent.lightness + 0.48);

    return GRADE_BANDS.map((_, i) => {
      const t = i / (GRADE_BANDS.length - 1);
      return hsl({
        hue: accent.hue,
        saturation: accent.saturation,
        lightness: tintLightness + (accent.lightness - tintLightness) * t,
      });
    });
  }, [theme]);

  const chart = useMemo(() => {
    if (!gpxData?.length || !slopes.length) return null;

    const step = Math.max(1, Math.floor(gpxData.length / MAX_POINTS));
    const grades = [];
    for (let i = 0; i < gpxData.length; i += step) grades.push(slopes[i] || 0);
    if (grades.length < 2) return null;

    const segWidth = WIDTH / (grades.length - 1);
    const bands = grades.map((g, i) => ({
      x: i * segWidth,
      width: segWidth + 0.5, // slight overlap avoids hairline seams
      color: bandColors[bandIndex(Math.abs(g))],
    }));

    // why: unlike ElevationProfile/PaceProfile's line-and-dot runner marker,
    // a discrete marker reads oddly on this flat 8px strip — there's no
    // vertical axis for a dot to sit on. An opacity mask over the
    // already-run portion doubles as an implicit progress indicator instead.
    let doneWidth = null;
    let currentPct = null;
    let currentGrade = null;
    if (projectedIndex !== null) {
      const sampledIdx = Math.min(
        Math.floor(projectedIndex / step),
        grades.length - 1,
      );
      doneWidth = sampledIdx * segWidth;
      currentPct = (doneWidth / WIDTH) * 100;
      // why: read the full-resolution slope at the runner's exact index
      // rather than the downsampled band value, so the number matches
      // reality even where MAX_POINTS smooths the strip.
      currentGrade = Math.round(Math.abs(slopes[projectedIndex] || 0));
    }

    const steepestBandLabel =
      GRADE_BANDS[Math.max(...grades.map((g) => bandIndex(Math.abs(g))))].label;
    const ariaLabel =
      currentGrade !== null
        ? `Slope intensity strip: grade distribution across the route, steepest band ${steepestBandLabel}. Currently at ${currentGrade}% grade.`
        : `Slope intensity strip: grade distribution across the route, steepest band ${steepestBandLabel}.`;

    return { bands, doneWidth, currentPct, currentGrade, ariaLabel };
  }, [gpxData, slopes, bandColors, projectedIndex]);

  if (!chart) return null;

  const { bands, doneWidth, currentPct, currentGrade, ariaLabel } = chart;

  return (
    <div className={className}>
      <svg
        className="si-strip"
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
            className="si-done-mask"
            x={0}
            y={0}
            width={doneWidth}
            height={HEIGHT}
          />
        )}
      </svg>

      {currentPct !== null && (
        <div className="si-readout">
          <span
            className="si-readout-value"
            style={{
              left: `clamp(28px, ${currentPct}%, calc(100% - 28px))`,
              transform: "translateX(-50%)",
            }}
          >
            {currentGrade}% grade
          </span>
        </div>
      )}

      <div className="si-legend">
        {GRADE_BANDS.map((band, i) => (
          <span key={band.label} className="si-legend-item">
            <span
              className="si-legend-dot"
              style={{ background: bandColors[i] }}
            />
            {band.label}
          </span>
        ))}
      </div>
    </div>
  );
});

const StyledSlopeIntensity = style(SlopeIntensity);

export default StyledSlopeIntensity;
