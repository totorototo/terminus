import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import AnimatedOrbitControls from "../orbitControls/AnimatedOrbitControls";
import TwoDimensionalProfile from "../twoDimensionalProfile/TwoDimensionalProfile";
import ThreeDimensionalProfile from "../threeDimensionalProfile/ThreeDimensionalProfile";
import style from "./Scene.style";
import TrailFollower from "../trailFollower/TrailFollower";
import { Perf } from "r3f-perf";
import useStore from "../../store/store.js";

function Scene({ width, height, className }) {
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(null);
  const [mode, setMode] = useState("3d");
  const [showSlopeColors, setShowSlopeColors] = useState(false);
  const [tracking, setTracking] = useState(true);

  const coordinates = useStore((state) => state.gpsData);

  // TODO: implement UI controls for mode, slopes, and tracking (Action Buttons?)
  // useControls({
  //   mode: {
  //     value: "3d",
  //     options: ["2d", "3d"],
  //     onChange: (value) => setMode(value),
  //   },
  //   slopes: {
  //     value: showSlopeColors,
  //     onChange: (value) => setShowSlopeColors(value),
  //   },
  //   tracking: { value: tracking, onChange: (value) => setTracking(value) },
  // });

  return (
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
      {/* ...existing code... */}
      <TwoDimensionalProfile
        coordinates={coordinates}
        setSelectedSectionIndex={setSelectedSectionIndex}
        selectedSectionIndex={selectedSectionIndex}
        visible={mode === "2d"}
        showSlopeColors={showSlopeColors}
      />
      <ThreeDimensionalProfile
        coordinates={coordinates}
        setSelectedSectionIndex={setSelectedSectionIndex}
        selectedSectionIndex={selectedSectionIndex}
        visible={mode === "3d"}
        showSlopeColors={showSlopeColors}
      />
      {mode === "3d" && coordinates && coordinates.length > 0 && (
        <TrailFollower
          speed={0.002}
          height={0.08}
          scale={0.05}
          color="red"
          tracking={tracking}
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
  );
}

export default style(Scene);
