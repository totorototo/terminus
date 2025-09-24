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

export default function ThreeDimensionalProfile({
  width,
  height,
  coordinates,
  checkpoints,
  sections,
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

    const xScale = scaleLinear().domain(xExtent).range([-5, 5]);
    const yScale = scaleLinear().domain([0, yExtent[1]]).range([0, 1]);
    const zScale = scaleLinear().domain(zExtent).range([10, -10]);

    const points3D = coordinates.map((coord) => [
      xScale(coord[0]), // longitude → x
      yScale(coord[2]), // elevation → y
      zScale(coord[1]), // latitude → z
    ]);

    const sectionsPoints3D =
      sections && sections.length
        ? sections.map(
            ({
              points,
              totalDistance,
              totalElevation,
              totalElevationLoss,
              startPoint,
              segmentId,
            }) => {
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
                // bbox,
                id: segmentId,
              };
            },
          )
        : [];

    const checkpointsPoints3D =
      sections && sections.length
        ? Object.entries(
            sections.reduce(
              (acc, { startPoint, endPoint, startLocation, endLocation }) => {
                acc[startLocation] = startPoint;
                acc[endLocation] = endPoint;
                return acc;
              },
              {},
            ),
          ).map(([key, value]) => ({
            name: key,
            point3D: [
              xScale(value[0]), // longitude → x
              yScale(value[2]), // elevation → y
              zScale(value[1]), // latitude → z
            ],
          }))
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
