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
  const themeVariantColors = theme.colors[theme.currentVariant];
  const colorPrimary = themeVariantColors["--color-primary"];
  const colorSecondary = themeVariantColors["--color-secondary"];
  const colorAccent = themeVariantColors["--color-accent"];
  const colorProgress = themeVariantColors["--color-progress"];

  const progressColor = useMemo(() => colorProgress, [colorProgress]);

  // Smoothly blend across theme hues along the trail (rather than hard-
  // cycling between them) so adjacent sections flow into each other.
  const sectionPalette = useMemo(
    () => [colorPrimary, colorAccent, colorSecondary],
    [colorPrimary, colorAccent, colorSecondary],
  );

  const sectionElements = useMemo(() => {
    if (!sectionsPoints3D || sectionsPoints3D.length === 0) return null;

    return sectionsPoints3D.map(({ points, id }, idx) => {
      const section = legs[idx];
      if (!section) {
        return null;
      }
      // slopes is the full-race array; points is a per-section slice
      // (tracePoints.slice(startIndex, endIndex + 1) in transformSections),
      // so slopes must be sliced the same way to stay aligned.
      const sectionSlopes = slopes?.slice(
        section.startIndex,
        section.endIndex + 1,
      );
      return (
        <MemoizedProfile
          key={`${raceId}/${id}`}
          points={points}
          color={getInterpolatedColor(
            idx,
            sectionsPoints3D.length,
            sectionPalette,
            1.1,
          )}
          showSlopeColors={showSlopeColors}
          slopes={sectionSlopes}
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
    sectionPalette,
    progressIndex,
    progressColor,
    legs,
    raceId,
  ]);

  return sectionElements;
}
