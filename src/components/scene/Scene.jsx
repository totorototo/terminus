import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import AnimatedOrbitControls from "../orbitControls/AnimatedOrbitControls";
import ThreeDimensionalProfile from "../threeDimensionalProfile/ThreeDimensionalProfile";
import style from "./Scene.style";
import TrailFollower from "../trailFollower/TrailFollower";
import useStore from "../../store/store.js";
import { OrbitControls } from "@react-three/drei";

function Scene({ width, height, className }) {
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(null);
  const trackingMode = useStore((state) => state.trackingMode);
  const displaySlopes = useStore((state) => state.displaySlopes);

  const coordinates = useStore((state) => state.gpsData);

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
          tracking={trackingMode}
        />
      )}
      <OrbitControls
        makeDefault
        enabled={!trackingMode}
        minPolarAngle={-Math.PI / 4}
        maxPolarAngle={Math.PI / 2}
        minAzimuthAngle={-Math.PI / 2}
        maxAzimuthAngle={Math.PI / 2}
        {...(!trackingMode && { cameraPosition: [0, 10, 0] })}
      />
    </Canvas>
  );
}

export default style(Scene);
