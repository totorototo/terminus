import { useRef, useMemo, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import EnhancedProfile from "../enhancedProfile/EnhancedProfile.jsx";
import style from "./Scene.style";
import TrailFollower from "../trailFollower/TrailFollower";
import useStore from "../../store/store.js";
import CameraController from "../cameraController/CameraController.jsx";
import { createCoordinateScales } from "../../utils/coordinateTransforms.js";
import { Model } from "../helicopter.jsx";
import Marker from "../marker/Marker.jsx";
import { useTheme } from "styled-components";
import Peaks from "../peaks/Peaks.jsx";

function Scene({ width, height, className }) {
  const profileMode = useStore((state) => state.app.profileMode);
  const trackingMode = useStore((state) => state.app.trackingMode);
  const coordinates = useStore((state) => state.gpx.data);
  const { name } = useStore((state) => state.gpx.metadata);
  const projectedLocation = useStore((state) => state.gps.projectedLocation);

  const modelRef = useRef();
  const theme = useTheme();

  // Compute coordinate scales once and pass to children to avoid duplicate computations
  const coordinateScales = useMemo(() => {
    return createCoordinateScales(coordinates, { profileMode });
  }, [coordinates, profileMode]);

  return (
    <Suspense fallback={null}>
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
          intensity={5}
          castShadow
        />
        <pointLight
          position={[-10, 10, -10]}
          decay={0}
          intensity={0.5}
          castShadow
        />

        {name && (
          <Marker
            position={[0, 1.5, 0]}
            fontSize={0.15}
            color={theme.colors.dark["--color-text"]}
          >
            {name}
          </Marker>
        )}

        <Peaks coordinateScales={coordinateScales} profileMode={profileMode} />

        <EnhancedProfile
          coordinateScales={coordinateScales}
          profileMode={profileMode}
        />

        {trackingMode && (
          <TrailFollower
            speed={0.002}
            height={0.08}
            scale={0.05}
            color="red"
            modelRef={modelRef}
            coordinateScales={coordinateScales}
          />
        )}

        {projectedLocation && projectedLocation.timestamp !== 0 && (
          <Suspense fallback={null}>
            <Model scale={0.01} coordinateScales={coordinateScales} />
          </Suspense>
        )}

        <CameraController modelRef={modelRef} />
      </Canvas>
    </Suspense>
  );
}

export default style(Scene);
