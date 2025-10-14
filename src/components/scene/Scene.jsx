import { useState, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import ThreeDimensionalProfile from "../threeDimensionalProfile/ThreeDimensionalProfile";
import style from "./Scene.style";
import TrailFollower from "../trailFollower/TrailFollower";
import useStore from "../../store/store.js";
import CameraController from "../cameraController/CameraController.jsx";

function Scene({ width, height, className }) {
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(null);
  const displaySlopes = useStore((state) => state.displaySlopes);

  const coordinates = useStore((state) => state.gpsData);
  const modelRef = useRef();

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
      {/* <Perf minimal position="bottom-right" /> */}
      <ambientLight intensity={2} />
      <ThreeDimensionalProfile
        coordinates={coordinates}
        setSelectedSectionIndex={setSelectedSectionIndex}
        selectedSectionIndex={selectedSectionIndex}
        showSlopeColors={displaySlopes}
      />
      {coordinates && coordinates.length > 0 && (
        <TrailFollower
          speed={0.002}
          height={0.08}
          scale={0.05}
          color="red"
          modelRef={modelRef}
        />
      )}
      <CameraController modelRef={modelRef} />
    </Canvas>
  );
}

export default style(Scene);
