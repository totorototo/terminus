import { memo } from "react";

import { useTheme } from "styled-components";

import { gradeBandColors } from "../../../helpers/gradeBandColors.js";
import { computeUphillGradientDistribution } from "../../../helpers/routeStats.js";
import useStore from "../../../store/store.js";

import style from "./UphillGradientBreakdown.style.js";

// why: sits directly below SlopeIntensity's strip (in the same chart frame)
// rather than buried further down the section — "where" (the strip) and
// "how much" (this list) about the same grade bands read as one idea only
// when they're adjacent.
const UphillGradientBreakdown = memo(function UphillGradientBreakdown({
  className,
}) {
  const slopes = useStore((state) => state.gpx.slopes);
  const cumulativeDistances = useStore(
    (state) => state.gpx.cumulativeDistances,
  );
  const theme = useTheme();

  const distribution = computeUphillGradientDistribution({
    slopes,
    cumulativeDistances,
  });

  if (!distribution) return null;

  const maxDistanceM = Math.max(
    ...distribution.map((band) => band.distanceM),
    1,
  );
  // why: same severity ramp as SlopeIntensity's own bands, keyed to
  // --color-accent, so a band reads as the same color in both the spatial
  // strip and this aggregate-by-distance view.
  const bandColors = gradeBandColors(theme, distribution.length);

  return (
    <div className={className}>
      <span className="gd-title">Uphill gradient distribution</span>
      {distribution.map((band, i) => (
        <div className="gd-row" key={band.label}>
          <span className="gd-label">{band.label}</span>
          <span className="gd-track">
            <span
              className="gd-fill"
              style={{
                width: `${(band.distanceM / maxDistanceM) * 100}%`,
                background: bandColors[i],
              }}
            />
          </span>
          <span className="gd-value">
            {(band.distanceM / 1000).toFixed(1)} km
          </span>
        </div>
      ))}
    </div>
  );
});

const StyledUphillGradientBreakdown = style(UphillGradientBreakdown);

export default StyledUphillGradientBreakdown;
