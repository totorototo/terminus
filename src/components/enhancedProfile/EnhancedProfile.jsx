import { useMemo } from "react";
import Profile from "../profile/Profile.jsx";
import style from "./EnhancedProfile.style.js";
import useStore from "../../store/store.js";
import {
  transformSections,
  createCheckpoints,
} from "../../utils/coordinateTransforms.js";
import Marker from "../marker/Marker.jsx";
import { useTheme } from "styled-components";
import { getInterpolatedColor } from "../../helpers/colorInterpolation.js";

function EnhancedProfile({ coordinateScales, profileMode }) {
  const sections = useStore((state) => state.sections);
  const slopes = useStore((state) => state.gpx.slopes);
  const showSlopeColors = useStore((state) => state.app.displaySlopes);
  const theme = useTheme();
  const { index: progressIndex } = useStore(
    (state) => state.gps.projectedLocation,
  );

  // Theme colors for interpolation
  const themeColors = useMemo(
    () => [
      theme.colors.dark["--color-primary"],
      theme.colors.dark["--color-secondary"],
      theme.colors.dark["--color-accent"],
    ],
    [theme],
  );

  // Memoize transformed data for performance
  const { sectionsPoints3D, checkpointsPoints3D } = useMemo(() => {
    // Transform sections to 3D using provided scales
    const sectionsPoints3D = transformSections(sections, coordinateScales);

    // Create checkpoints from sections using provided scales
    const checkpointsPoints3D = createCheckpoints(sections, coordinateScales);

    return {
      sectionsPoints3D,
      checkpointsPoints3D,
    };
  }, [sections, coordinateScales, profileMode]);

  // Memoize the rendered section components so we only rebuild them when
  // the underlying section data or relevant props change.
  const sectionElements = useMemo(() => {
    if (!sectionsPoints3D || sectionsPoints3D.length === 0) return null;

    return sectionsPoints3D.map(({ points, id }, idx) => (
      <Profile
        key={id}
        points={points}
        color={getInterpolatedColor(idx, sectionsPoints3D.length, themeColors)}
        showSlopeColors={showSlopeColors}
        slopes={slopes}
        profileMode={profileMode}
        progressIndex={progressIndex}
        progressColor={theme.colors.dark["--color-progress"]}
        startIndex={sections[idx].startIndex}
        endIndex={sections[idx].endIndex}
      />
    ));
  }, [
    sectionsPoints3D,
    showSlopeColors,
    slopes,
    profileMode,
    themeColors,
    progressIndex,
  ]);

  // Markers are independent of each section — render them once, memoized.
  const markerElements = useMemo(() => {
    if (!checkpointsPoints3D || checkpointsPoints3D.length === 0) return null;
    return checkpointsPoints3D.map((cp, index) => (
      <Marker
        key={cp.name || index}
        position={[cp.point3D[0], cp.point3D[1] + 0.2, cp.point3D[2]]}
      >
        {cp.name}
      </Marker>
    ));
  }, [checkpointsPoints3D]);

  return (
    <>
      {sectionElements}
      {markerElements}
    </>
  );
}

export default style(EnhancedProfile);
