import { memo, useMemo } from "react";

import { useTheme } from "styled-components";

import { getInterpolatedColor } from "../../helpers/colorInterpolation.js";
import useStore from "../../store/store.js";
import Profile from "../profile/Profile.jsx";

const MemoizedProfile = memo(Profile);

export default function Sections({ sectionsPoints3D }) {
  const sections = useStore((state) => state.sections);
  const slopes = useStore((state) => state.gpx.slopes);
  const showSlopeColors = useStore((state) => state.app.displaySlopes);
  const profileMode = useStore((state) => state.app.profileMode);
  const progressIndex = useStore((state) => state.gps.projectedLocation.index);

  const theme = useTheme();

  const themeColors = useMemo(
    () => [
      theme.colors.dark["--color-primary"],
      theme.colors.dark["--color-secondary"],
      theme.colors.dark["--color-accent"],
    ],
    [
      theme.colors.dark["--color-primary"],
      theme.colors.dark["--color-secondary"],
      theme.colors.dark["--color-accent"],
    ],
  );

  const progressColor = useMemo(
    () => theme.colors.dark["--color-progress"],
    [theme.colors.dark["--color-progress"]],
  );

  const sectionElements = useMemo(() => {
    if (!sectionsPoints3D || sectionsPoints3D.length === 0) return null;

    return sectionsPoints3D.map(({ points, id }, idx) => {
      const section = sections[idx];
      if (!section) {
        return null;
      }
      return (
        <MemoizedProfile
          key={id}
          points={points}
          color={getInterpolatedColor(
            idx,
            sectionsPoints3D.length,
            themeColors,
          )}
          showSlopeColors={showSlopeColors}
          slopes={slopes}
          profileMode={profileMode}
          progressIndex={progressIndex}
          progressColor={progressColor}
          startIndex={section.startIndex}
          endIndex={section.endIndex}
        />
      );
    });
  }, [
    sectionsPoints3D,
    showSlopeColors,
    slopes,
    profileMode,
    themeColors,
    progressIndex,
    progressColor,
    sections,
  ]);

  return sectionElements;
}
