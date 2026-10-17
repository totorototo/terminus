import { memo } from "react";

import { useTheme } from "styled-components";

import { gradeBandColors } from "../../../helpers/gradeBandColors.js";
import { computeDownhillGradientDistribution } from "../../../helpers/routeStats.js";
import useStore from "../../../store/store.js";

import style from "./DownhillGradientBreakdown.style.js";

// why: sits directly below UphillGradientBreakdown, in the same "Slope"
// chart frame — SlopeIntensity's strip above colors by |grade| (both
// directions blended), so this and its uphill counterpart split that one
// strip's meaning back into "how much climbing" vs "how much descending" at
// each steepness.
const DownhillGradientBreakdown = memo(function DownhillGradientBreakdown({
  className,
}) {
  const slopes = useStore((state) => state.gpx.slopes);
  const cumulativeDistances = useStore(
    (state) => state.gpx.cumulativeDistances,
  );
  const theme = useTheme();

  const distribution = computeDownhillGradientDistribution({
    slopes,
    cumulativeDistances,
  });

  if (!distribution) return null;

  const maxDistanceM = Math.max(
    ...distribution.map((band) => band.distanceM),
    1,
  );
  // why: the same mauve effort ramp as UphillGradientBreakdown — both read off
  // SlopeIntensity's |grade| bands, so a band means the same severity in all three.
  const bandColors = gradeBandColors(theme, distribution.length);

  return (
    <div className={className}>
      <span className="dd-title">Downhill gradient distribution</span>
      {distribution.map((band, i) => (
        <div className="dd-row" key={band.label}>
          <span className="dd-label">{band.label}</span>
          <span className="dd-track">
            <span
              className="dd-fill"
              style={{
                width: `${(band.distanceM / maxDistanceM) * 100}%`,
                background: bandColors[i],
              }}
            />
          </span>
          <span className="dd-value">
            {(band.distanceM / 1000).toFixed(1)} km
          </span>
        </div>
      ))}
    </div>
  );
});

const StyledDownhillGradientBreakdown = style(DownhillGradientBreakdown);

export default StyledDownhillGradientBreakdown;
