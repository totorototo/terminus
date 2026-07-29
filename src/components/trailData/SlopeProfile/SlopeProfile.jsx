import { memo, useMemo } from "react";

import { DIFFICULTY_COLORS, DIFFICULTY_LABELS } from "../../../constants.js";
import useStore from "../../../store/store.js";

import style from "./SlopeProfile.style.js";

const WIDTH = 300;
const HEIGHT = 8;
const MAX_POINTS = 300;

// Same 5-tier absolute-grade thresholds and palette as the 3D scene's
// SlopeMaterial fragment shader (getSlopeColor in components/profile/Profile.jsx)
// — keeps the 2D story and the 3D ribbon reading the terrain the same way.
const gradeColor = (grade) => {
  const abs = Math.abs(grade);
  if (abs < 5) return DIFFICULTY_COLORS[0];
  if (abs < 10) return DIFFICULTY_COLORS[1];
  if (abs < 15) return DIFFICULTY_COLORS[2];
  if (abs < 20) return DIFFICULTY_COLORS[3];
  return DIFFICULTY_COLORS[4];
};

const GRADE_BAND_LABELS = ["<5%", "5–10%", "10–15%", "15–20%", "20%+"];

const SlopeProfile = memo(function SlopeProfile({ className }) {
  const gpxData = useStore((state) => state.gpx.data);
  const slopes = useStore((state) => state.gpx.slopes || []);

  const segments = useMemo(() => {
    if (!gpxData?.length || !slopes.length) return null;

    const step = Math.max(1, Math.floor(gpxData.length / MAX_POINTS));
    const sampledCount = Math.floor((gpxData.length - 1) / step) + 1;
    if (sampledCount < 2) return null;

    const segWidth = WIDTH / (sampledCount - 1);

    const bands = [];
    for (let i = 0; i < sampledCount - 1; i++) {
      const originalIdx = Math.min((i + 1) * step, gpxData.length - 1);
      // why: slopes[i] is the grade INTO point i (mirrors buildSlopeAttribute's
      // per-vertex convention in the 3D mesh), so segment i uses slopes[originalIdx].
      const grade = slopes[originalIdx] || 0;
      bands.push({
        x: i * segWidth,
        width: segWidth + 0.5, // slight overlap avoids hairline seams between rects
        color: gradeColor(grade),
      });
    }
    return bands;
  }, [gpxData, slopes]);

  if (!segments) return null;

  return (
    <div className={className}>
      <svg
        className="sp-strip"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        width="100%"
        height={HEIGHT}
      >
        {segments.map((band, i) => (
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

      <div className="sp-legend">
        {DIFFICULTY_LABELS.map((label, i) => (
          <span key={label} className="sp-legend-item">
            <span
              className="sp-legend-swatch"
              style={{ background: DIFFICULTY_COLORS[i] }}
            />
            {GRADE_BAND_LABELS[i]}
          </span>
        ))}
      </div>
    </div>
  );
});

const StyledSlopeProfile = style(SlopeProfile);

export default StyledSlopeProfile;
