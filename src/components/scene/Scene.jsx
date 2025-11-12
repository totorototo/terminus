import { useState, useRef, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import EnhancedProfile from "../enhancedProfile/EnhancedProfile.jsx";
import style from "./Scene.style";
import TrailFollower from "../trailFollower/TrailFollower";
import useStore from "../../store/store.js";
import CameraController from "../cameraController/CameraController.jsx";
import { createCoordinateScales } from "../../utils/coordinateTransforms.js";
import Runner from "../runner/runner.jsx";

function Scene({ width, height, className }) {
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(null);
  const displaySlopes = useStore((state) => state.app.displaySlopes);
  const profileMode = useStore((state) => state.app.profileMode);

  const coordinates = useStore((state) => state.gps.data);
  const modelRef = useRef();

  // Compute coordinate scales once and pass to children to avoid duplicate computations
  const coordinateScales = useMemo(() => {
    return createCoordinateScales(coordinates, { profileMode });
  }, [coordinates, profileMode]);

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
      <ambientLight intensity={0.9} />
      <spotLight
        position={[10, 10, 10]}
        angle={0.5}
        penumbra={1}
        decay={0}
        intensity={1}
        castShadow
      />
      <pointLight
        position={[-10, 10, -10]}
        decay={0}
        intensity={0.5}
        castShadow
      />

      <EnhancedProfile
        setSelectedSectionIndex={setSelectedSectionIndex}
        selectedSectionIndex={selectedSectionIndex}
        showSlopeColors={displaySlopes}
        coordinateScales={coordinateScales}
        profileMode={profileMode}
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
