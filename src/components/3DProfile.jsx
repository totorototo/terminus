import { useMemo, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import {
  Grid,
  OrbitControls,
  Environment,
  AccumulativeShadows,
  RandomizedLight,
  GizmoHelper,
  GizmoViewport,
  ContactShadows,
  Edges,
  OrthographicCamera,
  Html,
} from "@react-three/drei";
import { scaleLinear } from "d3-scale";
import * as THREE from "three";

const gridSize = [100, 100];

function ElevationProfile({ gpsPoints, color }) {
  const geometryRef = useRef();

  const positions = useMemo(() => {
    const topVertices = gpsPoints.map(([long, ele, lat]) => [long, ele, lat]);
    const baseVertices = gpsPoints.map(([long, _ele, lat]) => [long, 0, lat]);

    const verts = [];
    for (let i = 0; i < gpsPoints.length - 1; i++) {
      verts.push(
        ...topVertices[i],
        ...baseVertices[i],
        ...topVertices[i + 1],
        ...topVertices[i + 1],
        ...baseVertices[i],
        ...baseVertices[i + 1],
      );
    }
    return new Float32Array(verts);
  }, [gpsPoints]);

  useEffect(() => {
    if (!geometryRef.current) return;
    const geom = geometryRef.current;
    geom.computeVertexNormals();
    geom.attributes.position.needsUpdate = true;
    geom.attributes.normal.needsUpdate = true;
  }, [positions]);

  return (
    <mesh castShadow receiveShadow>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <Edges linewidth={0.5} threshold={15} color="black" />

      <meshStandardMaterial color={color} side={THREE.DoubleSide} />
    </mesh>
  );
}

export default function ThreeDimensionalProfile({
  width,
  height,
  coordinates,
  checkpoints,
  sections,
}) {
  console.log(sections);

  // Memoize scales and points3D for performance
  const {
    xScale,
    yScale,
    zScale,
    points3D,
    sectionsPoints3D,
    checkpointsPoints3D,
  } = useMemo(() => {
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
    const zScale = scaleLinear().domain(zExtent).range([-10, 10]);

    const points3D = coordinates.map((coord) => [
      xScale(coord[0]), // longitude → x
      yScale(coord[2]), // elevation → y
      zScale(coord[1]), // latitude → z
    ]);

    const sectionsPoints3D =
      sections && sections.length
        ? sections.map(({ points }) =>
            points.map((coord) => [
              xScale(coord[0]), // longitude → x
              yScale(coord[2]), // elevation → y
              zScale(coord[1]), // latitude → z
            ]),
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
        <OrthographicCamera makeDefault position={[8, 7, 10]} zoom={60} />
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
          sectionsPoints3D.map((section, index) => (
            <ElevationProfile
              key={index}
              gpsPoints={section}
              color={`hsl(${(index / sectionsPoints3D.length) * 360}, 100%, 50%)`}
            />
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
        {/* {xScale &&
          yScale &&
          zScale &&
          checkpoints &&
          checkpoints.length > 0 &&
          checkpoints.map((cp, index) => (
            <Html
              key={index}
              position={[
                xScale(cp.point[0]),
                yScale(cp.point[2]) + 0.2,
                zScale(cp.point[1]),
              ]}
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
                {`${(cp.distance / 1000).toFixed(1)} km`}
              </div>
            </Html>
          ))}
        {/* {xScale &&
          yScale &&
          zScale &&
          checkpoints &&
          checkpoints.length > 0 &&
          checkpoints.map((cp, index) => (
            <Html
              key={index}
              position={[
                xScale(cp.point[0]),
                yScale(cp.point[2]) + 0.2,
                zScale(cp.point[1]),
              ]}
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
                {`${(cp.distance / 1000).toFixed(1)} km`}
              </div>
            </Html>
          ))} */}
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
    </>
  );
}
