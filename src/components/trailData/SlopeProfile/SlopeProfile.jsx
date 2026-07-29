import { memo, useMemo } from "react";

import { area as d3Area, curveLinear } from "d3-shape";

import { createXScale, createYScale } from "../../../helpers/d3.js";
import useStore from "../../../store/store.js";

import style from "./SlopeProfile.style.js";

const WIDTH = 300;
const HEIGHT = 88;
const VPAD = 4;
const MAX_POINTS = 300;

const SlopeProfile = memo(function SlopeProfile({ className }) {
  const gpxData = useStore((state) => state.gpx.data);
  const slopes = useStore((state) => state.gpx.slopes || []);

  const chart = useMemo(() => {
    if (!gpxData?.length || !slopes.length) return null;

    const step = Math.max(1, Math.floor(gpxData.length / MAX_POINTS));
    const grades = [];
    for (let i = 0; i < gpxData.length; i += step) grades.push(slopes[i] || 0);
    if (grades.length < 2) return null;

    const maxAbsGrade = Math.max(...grades.map(Math.abs), 1);

    const scaleX = createXScale(
      { min: 0, max: grades.length - 1 },
      { min: 0, max: WIDTH },
    );
    // why: a zero-centered, symmetric domain (rather than fitting min/max
    // independently) keeps a +10% climb and a -10% descent the same visual
    // height — direction is a sign flip, not a different scale.
    const scaleY = createYScale(
      { min: -maxAbsGrade, max: maxAbsGrade },
      { min: HEIGHT, max: 0 },
    );
    const zeroY = scaleY(0);

    const climbArea = d3Area()
      .x((_, i) => scaleX(i))
      .y0(zeroY)
      .y1((g) => scaleY(Math.max(g, 0)))
      .curve(curveLinear)(grades);

    const descentArea = d3Area()
      .x((_, i) => scaleX(i))
      .y0(zeroY)
      .y1((g) => scaleY(Math.min(g, 0)))
      .curve(curveLinear)(grades);

    return {
      climbArea,
      descentArea,
      zeroY,
      maxClimb: Math.round(Math.max(...grades, 0)),
      maxDescent: Math.round(Math.min(...grades, 0)),
    };
  }, [gpxData, slopes]);

  if (!chart) return null;

  const { climbArea, descentArea, zeroY, maxClimb, maxDescent } = chart;

  return (
    <div className={className}>
      <svg
        aria-hidden="true"
        viewBox={`0 -${VPAD} ${WIDTH} ${HEIGHT + VPAD * 2}`}
        preserveAspectRatio="none"
        width="100%"
        style={{ aspectRatio: `${WIDTH} / ${HEIGHT + VPAD * 2}` }}
      >
        <line
          className="sp-zero-line"
          x1={0}
          y1={zeroY}
          x2={WIDTH}
          y2={zeroY}
          strokeWidth="1"
        />
        {climbArea && (
          <path className="sp-climb-area" d={climbArea} stroke="none" />
        )}
        {descentArea && (
          <path className="sp-descent-area" d={descentArea} stroke="none" />
        )}
      </svg>

      <div className="sp-overlay">
        <span className="sp-label sp-label--climb">{maxClimb}%</span>
        <span className="sp-label sp-label--descent">{maxDescent}%</span>
      </div>
    </div>
  );
});

const StyledSlopeProfile = style(SlopeProfile);

export default StyledSlopeProfile;
