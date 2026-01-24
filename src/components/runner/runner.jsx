import React, { useMemo, useEffect } from "react";
import {
  useCurrentClosestLocation,
  useCurrentClosestLocationIndex,
} from "../../store/store.js";
import { transformCoordinates } from "../../utils/coordinateTransforms.js";
import { Box } from "@react-three/drei";
import { a, useSpring } from "@react-spring/three";

const AnimatedBox = a(Box);

function Runner({ coordinateScales }) {
  const currentClosestLocation = useCurrentClosestLocation();
  const currentClosestLocationIndex = useCurrentClosestLocationIndex();

  const transformedLocation = useMemo(() => {
    if (!currentClosestLocation) return null;
    if (!coordinateScales) return null;
    if (currentClosestLocationIndex === 0) return null;

    return transformCoordinates(
      [currentClosestLocation],
      coordinateScales,
      currentClosestLocationIndex,
    )[0];
  }, [currentClosestLocation, currentClosestLocationIndex, coordinateScales]);

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
