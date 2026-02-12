import { useMemo } from "react";
import { useTheme } from "styled-components";
import Profile from "../profile/Profile.jsx";
import useStore from "../../store/store.js";
import { getInterpolatedColor } from "../../helpers/colorInterpolation.js";

export default function Sections({ sectionsPoints3D }) {
  const sections = useStore((state) => state.sections);
  const slopes = useStore((state) => state.gpx.slopes);
  const showSlopeColors = useStore((state) => state.app.displaySlopes);
  const profileMode = useStore((state) => state.app.profileMode);
  const { index: progressIndex } = useStore(
    (state) => state.gps.projectedLocation,
  );
  const theme = useTheme();

  const themeColors = useMemo(
    () => [
      theme.colors.dark["--color-primary"],
      theme.colors.dark["--color-secondary"],
      theme.colors.dark["--color-accent"],
    ],
    [theme],
  );

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

  return sectionElements;
}
