import { useState, useMemo } from "react";
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
import { useControls } from "leva";
import LiveTracking from "../liveTracking/LiveTracking";

// import Runner from "./Runner";

function Scene({
  width,
  height,
  coordinates,
  sections,
  gpsResults,
  className,
}) {
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(null);
  const [mode, setMode] = useState("3d");
  const [showSlopeColors, setShowSlopeColors] = useState(false);
  const [tracking, setTracking] = useState(true);
  const [currentPositionIndex, setCurrentPositionIndex] = useState(0);

  useControls({
    mode: {
      value: "3d",
      options: ["2d", "3d"],
      onChange: (value) => setMode(value),
    },
    showSlopeColors: {
      value: showSlopeColors,
      onChange: (value) => setShowSlopeColors(value),
    },
    tracking: { value: tracking, onChange: (value) => setTracking(value) },
  });

  // Memoize section for SectionData
  const section = useMemo(() => {
    if (sections && sections.length && currentPositionIndex !== null) {
      return sections.find(
        (section) =>
          currentPositionIndex >= section.startIndex &&
          currentPositionIndex <= section.endIndex,
      );
    }
    return undefined;
  }, [sections, currentPositionIndex]);

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
        {/* <Perf minimal position="bottom-right" /> */}
        <ambientLight intensity={2} />
        {/* ...existing code... */}
        <TwoDimensionalProfile
          coordinates={coordinates}
          sections={sections}
          setSelectedSectionIndex={setSelectedSectionIndex}
          selectedSectionIndex={selectedSectionIndex}
          visible={mode === "2d"}
          gpsResults={gpsResults}
          showSlopeColors={showSlopeColors}
        />
        <ThreeDimensionalProfile
          coordinates={coordinates}
          sections={sections}
          setSelectedSectionIndex={setSelectedSectionIndex}
          selectedSectionIndex={selectedSectionIndex}
          visible={mode === "3d"}
          gpsResults={gpsResults}
          showSlopeColors={showSlopeColors}
        />
        {mode === "3d" && coordinates && coordinates.length > 0 && (
          <TrailFollower
            coordinates={coordinates}
            speed={0.002}
            height={0.08}
            scale={0.05}
            color="red"
            gpsResults={gpsResults}
            tracking={tracking}
            setCurrentPositionIndex={setCurrentPositionIndex}
          />
        )}
        {/* ...existing code... */}
        <AnimatedOrbitControls
          makeDefault
          enablePan={mode === "3d"}
          enableZoom
          enableRotate
          minPolarAngle={mode === "2d" ? Math.PI / 2 : -Math.PI / 4}
          maxPolarAngle={mode === "2d" ? Math.PI / 2 : Math.PI / 2}
          minAzimuthAngle={mode === "2d" ? 0 : -Math.PI / 2}
          maxAzimuthAngle={mode === "2d" ? 0 : Math.PI / 2}
          cameraPosition={mode === "3d" ? [0, 3, 12] : [0, 2, 12]}
          targetPosition={[0, 0, 0]}
        />
      </Canvas>
      <SectionData section={section} />
      <TrailData gpsResults={gpsResults} />
      <LiveTracking
        gpsResults={gpsResults}
        currentPositionIndex={currentPositionIndex}
      />
    </>
  );
}

export default style(Scene);
