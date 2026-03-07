import { memo, useMemo } from "react";

import { useTheme } from "styled-components";
import { useShallow } from "zustand/react/shallow";

import { getInterpolatedColor } from "../../helpers/colorInterpolation.js";
import useStore from "../../store/store.js";
import Profile from "../profile/Profile.jsx";

const MemoizedProfile = memo(Profile);

export default function Sections({ sectionsPoints3D }) {
  const { legs, slopes, showSlopeColors, profileMode, progressIndex, raceId } =
    useStore(
      useShallow((state) => ({
        legs: state.legs,
        slopes: state.gpx.slopes,
        showSlopeColors: state.app.displaySlopes,
        profileMode: state.app.profileMode,
        progressIndex: state.gps.projectedLocation.index,
        raceId: state.app.raceId,
      })),
    );

  const theme = useTheme();

  const themeColors = useMemo(
    () => [
      theme.colors[theme.currentVariant]["--color-primary"],
      theme.colors[theme.currentVariant]["--color-secondary"],
      theme.colors[theme.currentVariant]["--color-accent"],
    ],
    [
      theme.colors[theme.currentVariant]["--color-primary"],
      theme.colors[theme.currentVariant]["--color-secondary"],
      theme.colors[theme.currentVariant]["--color-accent"],
    ],
  );

  const progressColor = useMemo(
    () => theme.colors[theme.currentVariant]["--color-progress"],
    [theme.colors[theme.currentVariant]["--color-progress"]],
  );

  const sectionElements = useMemo(() => {
    if (!sectionsPoints3D || sectionsPoints3D.length === 0) return null;

    return sectionsPoints3D.map(({ points, id }, idx) => {
      const section = legs[idx];
      if (!section) {
        return null;
      }
      return (
        <MemoizedProfile
          key={`${raceId}/${id}`}
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
    legs,
    raceId,
  ]);

  return sectionElements;
}
