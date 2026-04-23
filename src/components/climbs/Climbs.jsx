import { memo, useEffect, useMemo, useRef } from "react";

import { useSpring } from "@react-spring/three";
import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useTheme } from "styled-components";
import { useShallow } from "zustand/react/shallow";

import useStore from "../../store/store.js";
import { transformCoordinates } from "../../utils/coordinateTransforms.js";
import { PROFILE_ANIMATION_DURATION } from "../profile/Profile.jsx";

// polygonOffset pushes the line depth slightly toward the camera so it sits
// on top of the coplanar trail ribbon without z-fighting.
function ClimbLine({ points, color, lineWidth, springOpacity }) {
  const lineRef = useRef();

  useEffect(() => {
    const mat = lineRef.current?.material;
    if (!mat) return;
    mat.polygonOffset = true;
    mat.polygonOffsetFactor = -2;
    mat.polygonOffsetUnits = -2;
    mat.transparent = true;
  }, []);

  useFrame(({ camera }) => {
    const mat = lineRef.current?.material;
    if (!mat) return;
    // eslint-disable-next-line react-hooks/immutability
    mat.opacity = springOpacity.get();
    // Scale linewidth with camera distance so visual thickness stays constant at any zoom level.
    // Reference distance matches the default camera position (15, 0, 0).

    mat.linewidth = (lineWidth / 200) * (camera.position.length() / 15);
  });

  return (
    <Line
      ref={lineRef}
      points={points}
      color={color}
      lineWidth={lineWidth / 100}
      transparent
      worldUnits={true}
    />
  );
}

function Climbs({ coordinateScales }) {
  const theme = useTheme();
  const colors = theme.colors[theme.currentVariant];
  const colorHighlight = colors["--color-primary"];
  const colorDefault = colors["--color-primary"];
  const colorDimmed = colors["--color-surface"];

  const {
    climbs,
    tracePoints,
    highlightedClimbIndex,
    theme: currentTheme,
  } = useStore(
    useShallow((state) => ({
      climbs: state.gpx.climbs,
      tracePoints: state.gpx.data,
      highlightedClimbIndex: state.app.highlightedClimbIndex,
      theme: state.app.theme,
    })),
  );

  const [{ opacity: springOpacity }, api] = useSpring(() => ({ opacity: 0 }));
  const hideTimerRef = useRef(null);
  const showTimerRef = useRef(null);

  useEffect(() => {
    clearTimeout(hideTimerRef.current);
    clearTimeout(showTimerRef.current);
    hideTimerRef.current = setTimeout(() => api.set({ opacity: 0 }), 0);
    showTimerRef.current = setTimeout(
      () => api.start({ opacity: 1, config: { tension: 80, friction: 20 } }),
      PROFILE_ANIMATION_DURATION,
    );
    return () => {
      clearTimeout(hideTimerRef.current);
      clearTimeout(showTimerRef.current);
    };
  }, [coordinateScales, highlightedClimbIndex, api, currentTheme]);

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
            ? colorHighlight
            : isOtherHighlighted
              ? colorDimmed
              : colorDefault
        }
        lineWidth={isHighlighted ? 4 : 3}
        springOpacity={springOpacity}
      />
    );
  });
}

export default memo(Climbs);
