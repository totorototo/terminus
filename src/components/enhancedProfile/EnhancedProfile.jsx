import { useMemo } from "react";
import style from "./EnhancedProfile.style.js";
import useStore from "../../store/store.js";
import {
  transformSections,
  createCheckpoints,
} from "../../utils/coordinateTransforms.js";
import Sections from "../sections/Sections.jsx";
import Checkpoints from "../checkpoints/Checkpoints.jsx";

function EnhancedProfile({ coordinateScales }) {
  const sections = useStore((state) => state.sections);

  // Memoize transformed data for performance
  const sectionsPoints3D = useMemo(() => {
    // Transform sections to 3D using provided scales
    return transformSections(sections, coordinateScales);
  }, [sections, coordinateScales]);

  // Create checkpoints from sections using provided scales
  const checkpointsPoints3D = useMemo(() => {
    return createCheckpoints(sections, coordinateScales);
  }, [sections, coordinateScales]);

  return (
    <>
      <Sections sectionsPoints3D={sectionsPoints3D} />
      <Checkpoints checkpointsPoints3D={checkpointsPoints3D} />
    </>
  );
}

export default style(EnhancedProfile);
