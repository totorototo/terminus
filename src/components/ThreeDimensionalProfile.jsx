import React, { Fragment, useMemo } from "react";
import { scaleLinear } from "d3-scale";
import ElevationProfile from "./ElevationProfile";
import { Html } from "@react-three/drei";

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

    // get logitude delta
    const lonDelta = xExtent[1] - xExtent[0];
    const latDelta = zExtent[1] - zExtent[0];

    // compute aspect ratio
    const aspectRatio = lonDelta / latDelta;

    // adjust range based on aspect ratio
    if (aspectRatio > 1) {
      // wider than tall
      xExtent[0] -= lonDelta * 0.1;
      xExtent[1] += lonDelta * 0.1;
      zExtent[0] -= latDelta * aspectRatio * 0.1;
      zExtent[1] += latDelta * aspectRatio * 0.1;
    } else {
      // taller than wide
      xExtent[0] -= (lonDelta / aspectRatio) * 0.1;
      xExtent[1] += (lonDelta / aspectRatio) * 0.1;
      zExtent[0] -= latDelta * 0.1;
      zExtent[1] += latDelta * 0.1;
    }

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
      <Fragment key={id}>
        <ElevationProfile
          key={id}
          points={points}
          color={`hsl(${(id / sectionsPoints3D.length) * 360}, 100%, 50%)`}
          onClick={() => setSelectedSectionIndex(id)}
          selected={selectedSectionIndex === id}
          visible={visible}
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
                  fontSize: "12px",
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
