import { memo, useEffect, useMemo, useRef } from "react";

import { Line } from "@react-three/drei";
import { useShallow } from "zustand/react/shallow";

import useStore from "../../store/store.js";
import { transformCoordinates } from "../../utils/coordinateTransforms.js";

// Amber for highlighted, muted blue-grey for others, very muted when another is highlighted
const COLOR_HIGHLIGHT = "#f2af29";
const COLOR_DEFAULT = "#6A7FDB";
const COLOR_DIMMED = "#3a4580";

// polygonOffset pushes the line depth slightly toward the camera so it sits
// on top of the coplanar trail ribbon without z-fighting.
function ClimbLine({ points, color, lineWidth }) {
  const lineRef = useRef();

  useEffect(() => {
    const mat = lineRef.current?.material;
    if (!mat) return;
    mat.polygonOffset = true;
    mat.polygonOffsetFactor = -2;
    mat.polygonOffsetUnits = -2;
  }, []);

  return (
    <Line ref={lineRef} points={points} color={color} lineWidth={lineWidth} />
  );
}

function Climbs({ coordinateScales }) {
  const { climbs, tracePoints, highlightedClimbIndex } = useStore(
    useShallow((state) => ({
      climbs: state.gpx.climbs,
      tracePoints: state.gpx.data,
      highlightedClimbIndex: state.app.highlightedClimbIndex,
    })),
  );

  const climbSegments = useMemo(() => {
    if (!climbs?.length || !tracePoints?.length) return [];
    return climbs.map((climb) => {
      const slice = tracePoints.slice(climb.startIndex, climb.endIndex + 1);
      return transformCoordinates(slice, coordinateScales, climb.startIndex);
    });
  }, [climbs, tracePoints, coordinateScales]);

  if (!climbSegments.length) return null;

  return climbSegments.map((points, i) => {
    const isHighlighted = highlightedClimbIndex === i;
    const isOtherHighlighted = highlightedClimbIndex !== null && !isHighlighted;

    if (points.length < 2) return null;

    return (
      <ClimbLine
        key={i}
        points={points}
        color={
          isHighlighted
            ? COLOR_HIGHLIGHT
            : isOtherHighlighted
              ? COLOR_DIMMED
              : COLOR_DEFAULT
        }
        lineWidth={isHighlighted ? 4 : 1.5}
      />
    );
  });
}

export default memo(Climbs);
