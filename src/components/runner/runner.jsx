import React, { useMemo } from "react";
import {
  useCurrentClosestLocation,
  useCurrentClosestLocationIndex,
} from "../../store/store.js";
import { transformCoordinates } from "../../utils/coordinateTransforms.js";
import { Box } from "@react-three/drei";

function Runner({ coordinateScales }) {
  const currentClosestLocation = useCurrentClosestLocation();
  const currentClosestLocationIndex = useCurrentClosestLocationIndex();

  const transformedLocation = useMemo(() => {
    if (!currentClosestLocation) return null;
    if (!coordinateScales) return null;
    if (currentClosestLocationIndex === 0) return null;

    return transformCoordinates([currentClosestLocation], coordinateScales)[0];
  }, [currentClosestLocation, coordinateScales, transformCoordinates]);

  return (
    transformedLocation && (
      <Box position={transformedLocation} args={[0.01, 0.01, 0.01]} />
    )
  );
}

export default Runner;
