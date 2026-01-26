import React, { useMemo, useEffect } from "react";
import { useProjectedLocation } from "../../store/store.js";
import { transformCoordinates } from "../../utils/coordinateTransforms.js";
import { Box } from "@react-three/drei";
import { a, useSpring } from "@react-spring/three";

const AnimatedBox = a(Box);

function Runner({ coordinateScales }) {
  const projectedLocation = useProjectedLocation();

  const transformedLocation = useMemo(() => {
    if (!projectedLocation) return null;
    if (!coordinateScales) return null;
    if (projectedLocation.index === 0) return null;

    return transformCoordinates(
      [projectedLocation.coords],
      coordinateScales,
      projectedLocation.index,
    )[0];
  }, [projectedLocation, coordinateScales]);
  const [springs, api] = useSpring(() => ({
    position: [0, 0, 0],
    config: { tension: 170, friction: 26 }, // tweak as you like
  }));

  useEffect(() => {
    if (!transformedLocation) return;

    api.start({
      position: transformedLocation,
    });
  }, [transformedLocation, api]);

  if (!transformedLocation) return null;

  return <AnimatedBox position={springs.position} args={[0.01, 0.01, 0.01]} />;
}

export default Runner;
