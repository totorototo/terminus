import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import {
  Environment,
  GizmoHelper,
  GizmoViewport,
  Grid,
} from "@react-three/drei";
import SectionData from "./SectionData";
import AnimatedOrbitControls from "./AnimatedOrbitControls";
import TwoDimensionalProfile from "./TwoDimensionalProfile";
import ThreeDimensionalProfile from "./ThreeDimensionalProfile";
import TrailData from "./TrailData";
import Runner from "./Runner";

export default function Scene({
  width,
  height,
  coordinates,
  sections,
  gpsResults,
  mode = "2d",
}) {
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(null);
  return (
    <>
      <Canvas
        style={{ width, height }}
        shadows
        camera={{
          fov: 75,
          near: 0.1,
          far: 1000,
          position: [0, 3, 6],
        }}
      >
        <ambientLight intensity={2} />
        <Grid
          position={[0, -0.01, 0]}
          args={[10, 10]}
          cellColor="#b3c6e0"
          sectionColor="#7a8fa6"
          fadeDistance={20}
          fadeStrength={1.5}
        />

        <TwoDimensionalProfile
          coordinates={coordinates}
          sections={sections}
          setSelectedSectionIndex={setSelectedSectionIndex}
          selectedSectionIndex={selectedSectionIndex}
          visible={mode === "2d"}
        />
        <ThreeDimensionalProfile
          coordinates={coordinates}
          sections={sections}
          setSelectedSectionIndex={setSelectedSectionIndex}
          selectedSectionIndex={selectedSectionIndex}
          visible={mode === "3d"}
        />

        <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
          <GizmoViewport
            axisColors={["#9d4b4b", "#2f7f4f", "#3b5b9d"]}
            labelColor="white"
          />
        </GizmoHelper>
        <Environment preset="city" background={false} />
        <Runner coordinates={coordinates} lerpFactor={2} />

        {/* <AccumulativeShadows>
          <RandomizedLight position={[2, 1, 0]} />
        </AccumulativeShadows> */}
        {/* <AnimatedOrbitControls
          makeDefault
          enablePan
          enableZoom
          enableRotate
          minPolarAngle={mode === "2d" ? Math.PI / 6 : Math.PI / 4} // 30° in 2D, 45° in 3D
          maxPolarAngle={mode === "2d" ? (Math.PI * 5) / 6 : Math.PI / 2} // 150° in 2D, 90° in 3D
          cameraPosition={mode === "3d" ? [0, 3, 12] : [0, 2, 12]}
          targetPosition={[0, 0, 0]}
        /> */}
      </Canvas>
      <SectionData
        {...(sections &&
          sections.length &&
          selectedSectionIndex !== null && {
            section: sections.find(
              (section) => section.segmentId === selectedSectionIndex,
            ),
          })}
      />
      <TrailData gpsResults={gpsResults} />
    </>
  );
}
