import { useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  AccumulativeShadows,
  RandomizedLight,
  GizmoHelper,
  GizmoViewport,
  OrthographicCamera,
  Html,
} from "@react-three/drei";
import { scaleLinear } from "d3-scale";
import ElevationProfile from "./ElevationProfile";
import Overlay from "./Overlay";
import { de } from "date-fns/locale";

export default function ThreeDimensionalProfile({
  width,
  height,
  coordinates,
  sections,
  mode = "2d",
}) {
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(null);

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
    const xScale =
      mode === "3d"
        ? scaleLinear().domain(xExtent).range([-5, 5])
        : scaleLinear()
            .domain([0, coordinates.length - 1])
            .range([-5, 5]);

    const yScale = scaleLinear().domain([0, yExtent[1]]).range([0, 1]);

    const zScale =
      mode === "3d" ? scaleLinear().domain(zExtent).range([10, -10]) : () => 0; // constant Z

    const points3D =
      mode === "3d"
        ? coordinates.map((coord) => [
            xScale(coord[0]), // longitude → x
            yScale(coord[2]), // elevation → y
            zScale(coord[1]), // latitude → z
          ])
        : coordinates.map((coord, index) => [
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
              const threeDpoints =
                mode === "3d"
                  ? points.map((coord) => [
                      xScale(coord[0]), // longitude → x
                      yScale(coord[2]), // elevation → y
                      zScale(coord[1]), // latitude → z
                    ])
                  : points.map((coord, index) => {
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
            if (mode === "3d") {
              return {
                name: key,
                point3D: [
                  xScale(value.point[0]), // longitude → x
                  yScale(value.point[2]), // elevation → y
                  zScale(value.point[1]), // latitude → z
                ],
              };
            } else {
              // 2D mode: use the stored index directly
              return {
                name: key,
                point3D: [
                  xScale(value.index), // use the stored cumulative index → x
                  yScale(value.point[2]) + 0.2, // elevation → y
                  0, // z = 0
                ],
              };
            }
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
  }, [coordinates, sections, mode]);

  return (
    <>
      <Canvas style={{ width, height }} shadows>
        <OrthographicCamera
          makeDefault
          position={[0, 4, 10]}
          zoom={60}
          fov={75}
        />
        <ambientLight intensity={2} />
        {/* <Grid
          position={[0, -0.01, 0]}
          args={gridSize}
          cellColor="#b3c6e0"
          sectionColor="#7a8fa6"
          fadeDistance={20}
          fadeStrength={1.5}
        /> */}
        {/* {points3D && points3D.length > 0 && (
          <ElevationProfile gpsPoints={points3D} />
        )} */}
        {sectionsPoints3D &&
          sectionsPoints3D.length > 0 &&
          sectionsPoints3D.map(({ points, id }) => (
            <>
              <ElevationProfile
                key={id}
                points={points}
                color={`hsl(${(id / sectionsPoints3D.length) * 360}, 100%, 50%)`}
                onClick={() => setSelectedSectionIndex(id)}
                selected={selectedSectionIndex === id}
              />
            </>
          ))}

        {checkpointsPoints3D &&
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

        <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
          <GizmoViewport
            axisColors={["#9d4b4b", "#2f7f4f", "#3b5b9d"]}
            labelColor="white"
          />
        </GizmoHelper>
        <Environment preset="city" background={false} />

        <AccumulativeShadows>
          <RandomizedLight position={[2, 1, 0]} />
        </AccumulativeShadows>
        <OrbitControls
          makeDefault
          enablePan
          enableZoom
          enableRotate
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>
      <Overlay
        {...(sections &&
          sections.length &&
          selectedSectionIndex !== null && {
            section: sections.find(
              (section) => section.segmentId === selectedSectionIndex,
            ),
          })}
      />
    </>
  );
}
