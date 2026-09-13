import { memo } from "react";

import { useTheme } from "styled-components";

import { gradeBandColors } from "../../../helpers/gradeBandColors.js";
import { computeRunnabilityDistribution } from "../../../helpers/routeStats.js";
import useStore from "../../../store/store.js";

import style from "./RunnabilityBreakdown.style.js";

// why: sits directly below RunnabilityIndex's strip (in the same chart
// frame) rather than buried in RouteStats — "where" (the strip) and "how
// much" (this list) about the same data read as one idea only when they're
// adjacent.
const RunnabilityBreakdown = memo(function RunnabilityBreakdown({ className }) {
  const paceFactors = useStore((state) => state.gpx.paceFactors);
  const cumulativeDistances = useStore(
    (state) => state.gpx.cumulativeDistances,
  );
  const theme = useTheme();

  const distribution = computeRunnabilityDistribution({
    paceFactors,
    cumulativeDistances,
  });

  if (!distribution) return null;

  const maxDistanceM = Math.max(
    ...distribution.map((band) => band.distanceM),
    1,
  );
  // why: --color-primary, matching RunnabilityIndex's own ramp directly
  // above this list — the same severity color means the same thing in both
  // the spatial strip and this aggregate-by-distance view.
  const bandColors = gradeBandColors(
    theme,
    distribution.length,
    "--color-primary",
  );

  return (
    <div className={className}>
      <span className="rb-title">Runnability breakdown</span>
      {distribution.map((band, i) => (
        <div className="rb-row" key={band.label}>
          <span className="rb-label">{band.label}</span>
          <span className="rb-track">
            <span
              className="rb-fill"
              style={{
                width: `${(band.distanceM / maxDistanceM) * 100}%`,
                background: bandColors[i],
              }}
            />
          </span>
          <span className="rb-value">
            {(band.distanceM / 1000).toFixed(1)} km
          </span>
        </div>
      ))}
    </div>
  );
});

const StyledRunnabilityBreakdown = style(RunnabilityBreakdown);

export default StyledRunnabilityBreakdown;
