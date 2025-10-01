import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import {
  Environment,
  GizmoHelper,
  GizmoViewport,
  Grid,
} from "@react-three/drei";
import SectionData from "../sectionData/SectionData";
import AnimatedOrbitControls from "../orbitControls/AnimatedOrbitControls";
import TwoDimensionalProfile from "../twoDimensionalProfile/TwoDimensionalProfile";
import ThreeDimensionalProfile from "../threeDimensionalProfile/ThreeDimensionalProfile";
import TrailData from "../trailData/TrailData";
import style from "./Scene.style";
import TrailFollower from "../trailFollower/TrailFollower";
import { Perf } from "r3f-perf";
// import Runner from "./Runner";

function Scene({
  width,
  height,
  coordinates,
  sections,
  gpsResults,
  mode = "2d",
  className,
}) {
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(null);
  return (
    <>
      <Canvas
        className={className}
        style={{ width, height }}
        shadows
        camera={{
          fov: 75,
          near: 0.1,
          far: 1000,
          position: [0, 3, 6],
        }}
      >
        <Perf minimal position="bottom-right" />
        <ambientLight intensity={2} />
        {/* <Grid
          position={[0, -0.01, 0]}
          args={[10, 10]}
          cellColor="#b3c6e0"
          sectionColor="#7a8fa6"
          fadeDistance={20}
          fadeStrength={1.5}
        /> */}

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
        {mode === "3d" && coordinates && coordinates.length > 0 && (
          <TrailFollower
            coordinates={coordinates} // Your GPS coordinate array
            speed={0.002} // Movement speed (default: 0.02)
            height={0.08} // Height above terrain (default: 0.5)
            scale={0.05} // Box scale (default: 0.1)
            color="red" // Box color (default: "red")
            gpsResults={gpsResults}
          />
        )}

        {/* <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
          <GizmoViewport
            axisColors={["#9d4b4b", "#2f7f4f", "#3b5b9d"]}
            labelColor="white"
          />
        </GizmoHelper> */}
        <Environment preset="city" background={false} />
        {/* <Runner coordinates={coordinates} lerpFactor={2} /> */}

        {/* <AccumulativeShadows>
          <RandomizedLight position={[2, 1, 0]} />
        </AccumulativeShadows> */}
        <AnimatedOrbitControls
          makeDefault
          enablePan={mode === "3d"} // Disable panning in 2D mode
          enableZoom
          enableRotate
          minPolarAngle={mode === "2d" ? Math.PI / 2 : -Math.PI / 4} // 90° in 2D (horizontal), -45° in 3D
          maxPolarAngle={mode === "2d" ? Math.PI / 2 : Math.PI / 2} // 90° in 2D (horizontal), 90° in 3D
          minAzimuthAngle={mode === "2d" ? 0 : -Math.PI / 2} // 0° in 2D (no rotation), -90° in 3D
          maxAzimuthAngle={mode === "2d" ? 0 : Math.PI / 2} // 0° in 2D (no rotation), 90° in 3D
          cameraPosition={mode === "3d" ? [0, 3, 12] : [0, 2, 12]}
          targetPosition={[0, 0, 0]}
        />
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

export default style(Scene);
