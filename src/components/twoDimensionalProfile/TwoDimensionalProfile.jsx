import React, { Fragment, useMemo } from "react";
import { scaleLinear } from "d3-scale";
import ElevationProfile from "../elevationProfile/ElevationProfile";
import { Html } from "@react-three/drei";

export default function TwoDimensionalProfile({
  coordinates,
  sections,
  setSelectedSectionIndex,
  selectedSectionIndex,
  visible,
  gpsResults, // Add gpsResults prop for slopes
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

    const xScale = scaleLinear()
      .domain([0, coordinates.length - 1])
      .range([-5, 5]);

    const yScale = scaleLinear().domain([0, yExtent[1]]).range([0, 1]);

    const zScale = () => 0; // constant Z

    const points3D = coordinates.map((coord, index) => [
      xScale(index), // point index → x
      yScale(coord[2]), // elevation → y
      0, // z = 0
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
              const threeDpoints = points.map((coord, index) => {
                // Calculate offset based on array index, not ID search
                const offset = sections
                  .slice(0, sectionIndex)
                  .reduce((acc, s) => acc + s.points.length, 0);

                return [
                  xScale(index + offset), // point index → x -> offset added here
                  yScale(coord[2]), // elevation → y
                  0, // z = 0
                ];
              });

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
            // 2D mode: use the stored index directly
            return {
              name: key,
              point3D: [
                xScale(value.index), // use the stored cumulative index → x
                yScale(value.point[2]) + 0.5, // elevation → y
                0, // z = 0
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
      <Fragment key={id}>
        <ElevationProfile
          key={id}
          points={points}
          color={`hsl(${(id / sectionsPoints3D.length) * 360}, 100%, 50%)`}
          onClick={() => setSelectedSectionIndex(id)}
          selected={selectedSectionIndex === id}
          visible={visible}
          gpsResults={gpsResults}
        />

        {visible &&
          checkpointsPoints3D &&
          checkpointsPoints3D.length > 0 &&
          checkpointsPoints3D.map((cp, index) => (
            <Html
              key={index}
              position={[cp.point3D[0], cp.point3D[1] + 0.2, cp.point3D[2]]}
              style={{ pointerEvents: "none" }}
            >
              <div
                style={{
                  backgroundColor: "grey",
                  padding: "2px 5px",
                  borderRadius: "3px",
                  border: "1px solid #ccc",
                  fontSize: "10px",
                  whiteSpace: "nowrap",
                }}
              >
                {cp.name}
              </div>
            </Html>
          ))}
      </Fragment>
    ))
  );
}
