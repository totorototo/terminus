import { useState, useRef, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import ThreeDimensionalProfile from "../threeDimensionalProfile/ThreeDimensionalProfile";
import style from "./Scene.style";
import TrailFollower from "../trailFollower/TrailFollower";
import useStore from "../../store/store.js";
import CameraController from "../cameraController/CameraController.jsx";
import { createCoordinateScales } from "../../utils/coordinateTransforms.js";
import Runner from "../runner/runner.jsx";

function Scene({ width, height, className }) {
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(null);
  const displaySlopes = useStore((state) => state.app.displaySlopes);

  const coordinates = useStore((state) => state.gps.data);
  const modelRef = useRef();

  // Compute coordinate scales once and pass to children to avoid duplicate computations
  const coordinateScales = useMemo(() => {
    return createCoordinateScales(coordinates);
  }, [coordinates]);

  return (
    <Canvas
      className={className}
      style={{ width, height }}
      shadows
      camera={{
        fov: 75,
        near: 0.1,
        far: 1000,
        position: [15, 0, 0],
      }}
    >
      {/* <Perf minimal position="bottom-right" /> */}
      <ambientLight intensity={2} />
      <ThreeDimensionalProfile
        setSelectedSectionIndex={setSelectedSectionIndex}
        selectedSectionIndex={selectedSectionIndex}
        showSlopeColors={displaySlopes}
        coordinateScales={coordinateScales}
      />

      <TrailFollower
        speed={0.002}
        height={0.08}
        scale={0.05}
        color="red"
        modelRef={modelRef}
        coordinateScales={coordinateScales}
      />

      <Runner coordinateScales={coordinateScales} />

      <CameraController modelRef={modelRef} />
    </Canvas>
  );
}

export default style(Scene);
