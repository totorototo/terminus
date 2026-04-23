import { memo, useMemo } from "react";

import { useShallow } from "zustand/react/shallow";

import useStore from "../../store/store.js";
import {
  createCheckpoints,
  transformSections,
} from "../../utils/coordinateTransforms.js";
import CheckpointPins from "../checkpointPin/CheckpointPin.jsx";
import Sections from "../sections/Sections.jsx";

import style from "./EnhancedProfile.style.js";

function EnhancedProfile({ coordinateScales }) {
  const { legs, tracePoints, waypoints } = useStore(
    useShallow((state) => ({
      legs: state.legs,
      tracePoints: state.gpx.data,
      waypoints: state.waypoints,
    })),
  );

  // Memoize transformed data for performance
  const sectionsPoints3D = useMemo(() => {
    return transformSections(legs, coordinateScales, tracePoints);
  }, [legs, coordinateScales, tracePoints]);

  // Create checkpoints from legs using provided scales
  const checkpointsPoints3D = useMemo(() => {
    return createCheckpoints(legs, coordinateScales, waypoints);
  }, [legs, coordinateScales, waypoints]);

  return (
    <>
      <Sections sectionsPoints3D={sectionsPoints3D} />
      <CheckpointPins checkpointsPoints3D={checkpointsPoints3D} />
    </>
  );
}

export default memo(style(EnhancedProfile));
