import React, { useMemo } from "react";
import { scaleLinear } from "d3-scale";
import ElevationProfile from "./ElevationProfile";

export default function ThreeDimensionalProfile({
  coordinates,
  sections,
  selectedSectionIndex,
  setSelectedSectionIndex,
  visible,
}) {
  // Memoize scales and points3D for performance
  const { sectionsPoints3D, checkpointsPoints3D } = useMemo(() => {
    const xExtent = [
      Math.min(...coordinates.map((coord) => coord[0])),
      Math.max(...coordinates.map((coord) => coord[0])),
    ]; // longitude
    const yExtent = [
      Math.min(...coordinates.map((coord) => coord[2])),
      Math.max(...coordinates.map((coord) => coord[2])),
    ]; // elevation
    const zExtent = [
      Math.min(...coordinates.map((coord) => coord[1])),
      Math.max(...coordinates.map((coord) => coord[1])),
    ]; // latitude

    // keep the way it is for 3d mode, and flatten for 2d mode
    // display the profile in the x-y plane
    // z will be constant (0)
    // x will item index scaled to fit -5 to 5
    // y will be elevation scaled to fit 0 to 1
    // z will be 0

    // 3D mode: use geographic coordinates, 2D mode: flatten to x-y plane with distance-based x-axis
    const xScale = scaleLinear().domain(xExtent).range([-2, 2]);

    const yScale = scaleLinear().domain([0, yExtent[1]]).range([0, 1]);

    const zScale = scaleLinear().domain(zExtent).range([5, -5]);

    const points3D = coordinates.map((coord) => [
      xScale(coord[0]), // longitude → x
      yScale(coord[2]), // elevation → y
      zScale(coord[1]), // latitude → z
    ]);

    const sectionsPoints3D =
      sections && sections.length
        ? sections.map(
            (
              {
                points,
                totalDistance,
                totalElevation,
                totalElevationLoss,
                startPoint,
                segmentId,
              },
              sectionIndex,
            ) => {
              const threeDpoints = points.map((coord) => [
                xScale(coord[0]), // longitude → x
                yScale(coord[2]), // elevation → y
                zScale(coord[1]), // latitude → z
              ]);

              return {
                points: threeDpoints,
                totalDistance,
                totalElevation,
                totalElevationLoss,
                startPoint,
                id: segmentId,
              };
            },
          )
        : [];

    const checkpointsPoints3D =
      sections && sections.length
        ? Object.entries(
            sections.reduce(
              (
                acc,
                {
                  startPoint,
                  endPoint,
                  startLocation,
                  endLocation,
                  startIndex,
                  endIndex,
                },
              ) => {
                acc[startLocation] = { point: startPoint, index: startIndex };
                acc[endLocation] = { point: endPoint, index: endIndex };
                return acc;
              },
              {},
            ),
          ).map(([key, value]) => {
            return {
              name: key,
              point3D: [
                xScale(value.point[0]), // longitude → x
                yScale(value.point[2]), // elevation → y
                zScale(value.point[1]), // latitude → z
              ],
            };
          })
        : [];

    return {
      xScale,
      yScale,
      zScale,
      points3D,
      sectionsPoints3D,
      checkpointsPoints3D,
    };
  }, [coordinates, sections]);

  return (
    sectionsPoints3D &&
    sectionsPoints3D.length > 0 &&
    sectionsPoints3D.map(({ points, id }) => (
      <>
        <ElevationProfile
          key={id}
          points={points}
          color={`hsl(${(id / sectionsPoints3D.length) * 360}, 100%, 50%)`}
          onClick={() => setSelectedSectionIndex(id)}
          selected={selectedSectionIndex === id}
          visible={visible}
        />
      </>
    ))
  );
}
