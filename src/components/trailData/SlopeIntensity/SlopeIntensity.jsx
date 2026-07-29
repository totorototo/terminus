import { memo, useMemo } from "react";

import { hsl, parseToHsl } from "polished";
import { useTheme } from "styled-components";

import useStore from "../../../store/store.js";

import style from "./SlopeIntensity.style.js";

const WIDTH = 300;
const HEIGHT = 8;
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
  const theme = useTheme();

  // why: 5 severity colors interpolated between the theme's "success" and
  // "accent" tokens — the app's existing mild/urgent semantics (accent is
  // already used for over-cutoff warnings elsewhere) — instead of a
  // hardcoded palette, so the ramp follows whichever theme variant is active.
  // Interpolating in HSL along the shortest hue arc (rather than a
  // channel-wise RGB mix, which muddies green-to-red through brown) lands on
  // the familiar green -> yellow -> orange -> red heat-map progression.
  const bandColors = useMemo(() => {
    const colors = theme.colors[theme.currentVariant];
    const from = parseToHsl(colors["--color-success"]);
    const to = parseToHsl(colors["--color-accent"]);
    const hueDelta = ((to.hue - from.hue + 540) % 360) - 180;

    return GRADE_BANDS.map((_, i) => {
      const t = i / (GRADE_BANDS.length - 1);
      return hsl({
        hue: (from.hue + hueDelta * t + 360) % 360,
        saturation: from.saturation + (to.saturation - from.saturation) * t,
        lightness: from.lightness + (to.lightness - from.lightness) * t,
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

    return { bands };
  }, [gpxData, slopes, bandColors]);

  if (!chart) return null;

  const { bands } = chart;

  return (
    <div className={className}>
      <svg
        className="si-strip"
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
      </svg>

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
