import { memo, useMemo } from "react";

import { useTheme } from "styled-components";

import { gradeBandColors } from "../../../helpers/gradeBandColors.js";
import { computeRouteStats } from "../../../helpers/routeStats.js";
import useStore, { DEFAULT_PACE_SETTINGS } from "../../../store/store.js";
import { RUNNER_PROFILES } from "../PaceSettings/PaceSettings.constants.js";

import style from "./RouteStats.style.js";

function formatHoursMinutes(totalSeconds) {
  const totalMinutes = Math.round(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

// why: the store only holds the numeric basePaceSPerKm the user picked, not
// which named profile it came from — match it back to a label (e.g.
// "Athlete") the same way StoryPace does, so the run estimate here reads as
// tied to that same choice.
function closestProfile(basePaceSPerKm) {
  return RUNNER_PROFILES.reduce((best, p) =>
    Math.abs(p.basePaceSPerKm - basePaceSPerKm) <
    Math.abs(best.basePaceSPerKm - basePaceSPerKm)
      ? p
      : best,
  );
}

const RouteStats = memo(function RouteStats({ className }) {
  const slopes = useStore((state) => state.gpx.slopes);
  const paceFactors = useStore((state) => state.gpx.paceFactors);
  const cumulativeDistances = useStore(
    (state) => state.gpx.cumulativeDistances,
  );
  const basePaceSPerKm = useStore(
    (state) =>
      state.app?.paceSettings?.basePaceSPerKm ??
      DEFAULT_PACE_SETTINGS.basePaceSPerKm,
  );
  const theme = useTheme();

  const routeStats = useMemo(
    () =>
      computeRouteStats({
        slopes,
        paceFactors,
        cumulativeDistances,
        runBasePaceSPerKm: basePaceSPerKm,
      }),
    [slopes, paceFactors, cumulativeDistances, basePaceSPerKm],
  );

  if (!routeStats) return null;

  const {
    avgUphillGradePct,
    avgDownhillGradePct,
    terrainBreakdown,
    uphillGradientDistribution,
    runnabilityDistribution,
    walkTimeS,
    runTimeS,
  } = routeStats;

  const maxBandDistanceM = Math.max(
    ...uphillGradientDistribution.map((band) => band.distanceM),
    1,
  );
  const maxRunnabilityDistanceM = Math.max(
    ...runnabilityDistribution.map((band) => band.distanceM),
    1,
  );

  // why: same severity ramp as SlopeIntensity, keyed to the same 5 grade
  // bands, so a band reads as the same color everywhere it appears.
  const bandColors = gradeBandColors(theme, uphillGradientDistribution.length);
  // why: --color-primary, matching RunnabilityIndex's own ramp — keeps this
  // list a matched pair with that strip instead of blending into the
  // accent-colored gradient distribution above it.
  const runnabilityColors = gradeBandColors(
    theme,
    runnabilityDistribution.length,
    "--color-primary",
  );

  const terrainAriaLabel = `Terrain breakdown: ${terrainBreakdown.uphillPct.toFixed(0)}% uphill, ${terrainBreakdown.flatPct.toFixed(0)}% flat, ${terrainBreakdown.downhillPct.toFixed(0)}% downhill.`;
  const runnerProfileLabel = closestProfile(basePaceSPerKm).label;

  return (
    <div className={className}>
      <div className="rs-stat-row">
        <div className="rs-stat">
          <span className="rs-stat-value">
            +{avgUphillGradePct.toFixed(1)}%
          </span>
          <span className="rs-stat-label">avg uphill grade</span>
        </div>
        <div className="rs-stat">
          <span className="rs-stat-value">
            {avgDownhillGradePct.toFixed(1)}%
          </span>
          <span className="rs-stat-label">avg downhill grade</span>
        </div>
        <div className="rs-stat">
          <span className="rs-stat-value">{formatHoursMinutes(runTimeS)}</span>
          <span className="rs-stat-label">run time ({runnerProfileLabel})</span>
        </div>
        <div className="rs-stat">
          <span className="rs-stat-value">{formatHoursMinutes(walkTimeS)}</span>
          <span className="rs-stat-label">
            hike time ({runnerProfileLabel})
          </span>
        </div>
      </div>

      <div
        className="rs-terrain-breakdown"
        role="img"
        aria-label={terrainAriaLabel}
      >
        <div className="rs-tb-bar">
          <span
            className="rs-tb-seg rs-tb-uphill"
            style={{ width: `${terrainBreakdown.uphillPct}%` }}
          />
          <span
            className="rs-tb-seg rs-tb-flat"
            style={{ width: `${terrainBreakdown.flatPct}%` }}
          />
          <span
            className="rs-tb-seg rs-tb-downhill"
            style={{ width: `${terrainBreakdown.downhillPct}%` }}
          />
        </div>
        <div className="rs-tb-legend">
          <span className="rs-tb-legend-item">
            <span className="rs-tb-legend-dot rs-tb-uphill" />
            {terrainBreakdown.uphillPct.toFixed(1)}% uphill
          </span>
          <span className="rs-tb-legend-item">
            <span className="rs-tb-legend-dot rs-tb-flat" />
            {terrainBreakdown.flatPct.toFixed(1)}% flat
          </span>
          <span className="rs-tb-legend-item">
            <span className="rs-tb-legend-dot rs-tb-downhill" />
            {terrainBreakdown.downhillPct.toFixed(1)}% downhill
          </span>
        </div>
      </div>

      <div className="rs-grade-distribution">
        <span className="rs-gd-title">Uphill gradient distribution</span>
        {uphillGradientDistribution.map((band, i) => (
          <div className="rs-gd-row" key={band.label}>
            <span className="rs-gd-label">{band.label}</span>
            <span className="rs-gd-track">
              <span
                className="rs-gd-fill"
                style={{
                  width: `${(band.distanceM / maxBandDistanceM) * 100}%`,
                  background: bandColors[i],
                }}
              />
            </span>
            <span className="rs-gd-value">
              {(band.distanceM / 1000).toFixed(1)} km
            </span>
          </div>
        ))}
      </div>

      <div className="rs-grade-distribution">
        <span className="rs-gd-title">Runnability breakdown</span>
        {runnabilityDistribution.map((band, i) => (
          <div className="rs-gd-row" key={band.label}>
            <span className="rs-gd-label">{band.label}</span>
            <span className="rs-gd-track">
              <span
                className="rs-gd-fill"
                style={{
                  width: `${(band.distanceM / maxRunnabilityDistanceM) * 100}%`,
                  background: runnabilityColors[i],
                }}
              />
            </span>
            <span className="rs-gd-value">
              {(band.distanceM / 1000).toFixed(1)} km
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

const StyledRouteStats = style(RouteStats);

export default StyledRouteStats;
