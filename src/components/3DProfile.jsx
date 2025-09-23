import { useMemo, useEffect, useRef, useState } from "react";
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
  Text,
} from "@react-three/drei";
import { scaleLinear } from "d3-scale";
import * as THREE from "three";
import { useSpring } from "@react-spring/three";
import { useFrame } from "@react-three/fiber";
import { useSpring as useSpringWeb, animated } from "@react-spring/web";

function Overlay({ section }) {
  const { distance } = useSpringWeb({
    distance: section?.totalDistance || 0,
    config: { tension: 170, friction: 26 },
  });

  const { elevationGain } = useSpringWeb({
    elevationGain: section?.totalElevation || 0,
    config: { tension: 170, friction: 26 },
  });

  const { elevationLoss } = useSpringWeb({
    elevationLoss: section?.totalElevationLoss || 0,
    config: { tension: 170, friction: 26 },
  });

  return (
    <div
      style={{
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "flex-start",
        position: "absolute",
        pointerEvents: "none",
        top: 0,
        maxWidth: "600px",
        padding: "80px",
        color: "#a0a0a0",
        lineHeight: 1.2,
        fontSize: "15px",
        letterSpacing: "1.5px",
        userSelect: "none",
      }}
    >
      <h1
        style={{
          pointerEvents: "none",
          color: "white",
          fontSize: "2em",
          fontWeight: "100",
          lineHeight: "1em",
          margin: 0,
          marginBottom: "0.25em",
        }}
      >
        Section Analytics
      </h1>
      {section && (
        <>
          <animated.div>
            {distance.to((n) => `Distance: ${(n / 1000).toFixed(2)} km`)}
          </animated.div>
          <animated.div>
            {elevationGain.to((n) => `Elevation Gain: ${n.toFixed(0)} m`)}
          </animated.div>
          <animated.div>
            {elevationLoss.to((n) => `Elevation Loss: ${n.toFixed(0)} m`)}
          </animated.div>
          <div
            style={{ marginTop: "1em", fontSize: "0.8em", color: "#707070" }}
          >
            Click on another section to see its details.
          </div>
        </>
      )}
    </div>
  );
}

function ElevationProfile({ gpsPoints, color, metaData, onClick, selected }) {
  // const geometryRef = useRef();

  const materialRef = useRef();

  const { opacity } = useSpring({ opacity: selected ? 1 : 0.5 });

  useFrame(() => {
    if (materialRef.current) {
      materialRef.current.opacity = opacity.get();
    }
  });

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

  // useEffect(() => {
  //   if (!geometryRef.current) return;
  //   const geom = geometryRef.current;
  //   geom.computeVertexNormals();
  //   geom.attributes.position.needsUpdate = true;
  //   geom.attributes.normal.needsUpdate = true;
  // }, [positions]);

  return (
    <mesh castShadow receiveShadow onClick={onClick}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <Edges linewidth={0.5} threshold={15} color="black" />
      <meshStandardMaterial
        ref={materialRef}
        transparent
        // opacity={selected ? 1 : 0.65}
        color={color}
        side={THREE.DoubleSide}
      />
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

              // // compute points bounding box for label positioning
              // const bbox = threeDpoints.reduce(
              //   (acc, point) => {
              //     acc.minX = Math.min(acc.minX, point[0]);
              //     acc.maxX = Math.max(acc.maxX, point[0]);
              //     // acc.minY = Math.min(acc.minY, point[1]);
              //     // acc.maxY = Math.max(acc.maxY, point[1]);
              //     acc.minZ = Math.min(acc.minZ, point[2]);
              //     acc.maxZ = Math.max(acc.maxZ, point[2]);
              //     return acc;
              //   },
              //   {
              //     minX: Infinity,
              //     maxX: -Infinity,
              //     // minY: Infinity,
              //     // maxY: -Infinity,
              //     minZ: Infinity,
              //     maxZ: -Infinity,
              //   },
              // );

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
                gpsPoints={points}
                color={`hsl(${(id / sectionsPoints3D.length) * 360}, 100%, 50%)`}
                onClick={() => setSelectedSectionIndex(id)}
                selected={selectedSectionIndex === id}
              />
              {/* <Html
                  transform
                  rotation={[-Math.PI / 2, 0, Math.PI / 2]}
                  style={{
                    pointerEvents: "none",
                    color: "black",
                    padding: "2px 5px",
                    borderRadius: "3px",

                    fontSize: "10px",
                    whiteSpace: "nowrap",

                  }}
                  key={`html-label-${index}`}
                  position={[
                    bbox.minX !== Infinity && bbox.maxX !== -Infinity
                      ? bbox.maxX + 1.2
                      : points.length
                        ? points[0][0]
                        : 0,
                    0,
                    bbox.minZ !== Infinity && bbox.maxZ !== -Infinity
                      ? bbox.minZ + (bbox.maxZ - bbox.minZ) / 2
                      : points.length
                        ? points[0][2]
                        : 0,
                  ]}
                >
                  <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-start', flexDirection: 'column' }}>
                    <span>{`Section ${index + 1}`}</span>
                    <span>{`Distance: ${(totalDistance / 1000).toFixed(1)} km`}</span>
                    <span>{`D+: ${totalElevation.toFixed(1)} m`}</span>
                    <span>{`D-: ${totalElevationLoss.toFixed(1)} m`}</span>
                  </div>
                </Html> */}
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
