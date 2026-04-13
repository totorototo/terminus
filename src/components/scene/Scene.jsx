import { memo, Suspense, useMemo, useRef } from "react";

import { Canvas } from "@react-three/fiber";
import { useTheme } from "styled-components";
import { useShallow } from "zustand/react/shallow";

import useStore from "../../store/store.js";
import { createCoordinateScales } from "../../utils/coordinateTransforms.js";
import CameraController from "../cameraController/CameraController.jsx";
import EnhancedProfile from "../enhancedProfile/EnhancedProfile.jsx";
import FlyBy from "../flyBy/FlyBy";
import Marker from "../marker/Marker.jsx";
import OffCourseEffect from "../offCourseEffect/OffCourseEffect.jsx";
import Peaks from "../peaks/Peaks.jsx";
import { Model } from "../ufo/Ufo.jsx";

import style from "./Scene.style";

const SceneLights = memo(function SceneLights() {
  return (
    <>
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
    </>
  );
});

function Scene({ width, height, className }) {
  const {
    profileMode,
    trackingMode,
    coordinates,
    name,
    projectedLocation,
    isOffCourse,
    deviationDistance,
  } = useStore(
    useShallow((state) => ({
      profileMode: state.app.profileMode,
      trackingMode: state.app.trackingMode,
      coordinates: state.gpx.data,
      name: state.gpx.metadata.name,
      projectedLocation: state.gps.projectedLocation,
      isOffCourse: state.gps.isOffCourse,
      deviationDistance: state.gps.deviationDistance,
    })),
  );

  const modelRef = useRef();
  const theme = useTheme();

  // Compute coordinate scales once and pass to children to avoid duplicate computations
  const coordinateScales = useMemo(() => {
    return createCoordinateScales(coordinates, { profileMode });
  }, [coordinates, profileMode]);

  return (
    <Suspense fallback={null}>
      {/* Visually-hidden live region — announces off-course state to screen readers */}
      <div
        aria-live="assertive"
        aria-atomic="true"
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
          whiteSpace: "nowrap",
        }}
      >
        {isOffCourse && deviationDistance > 0
          ? `Off trail — ${(deviationDistance / 1000).toFixed(1)} km from route`
          : ""}
      </div>
      <Canvas
        className={className}
        style={{ width, height }}
        shadows
        onCreated={({ gl }) => {
          gl.domElement.setAttribute("aria-label", "3D trail visualization");
        }}
        camera={{
          fov: 75,
          near: 0.1,
          far: 1000,
          position: [15, 0, 0],
        }}
      >
        <OffCourseEffect
          isOffCourse={isOffCourse}
          deviationDistance={deviationDistance}
          projectedLocation={projectedLocation}
          coordinateScales={coordinateScales}
        />
        {/* <Perf minimal position="bottom-right" /> */}
        <SceneLights />

        {name && (
          <Marker
            position={[0, 1.5, 0]}
            fontSize={0.15}
            color={theme.colors[theme.currentVariant]["--color-text"]}
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
          <FlyBy
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
            <Model scale={0.02} coordinateScales={coordinateScales} />
          </Suspense>
        )}

        <CameraController modelRef={modelRef} />
      </Canvas>
    </Suspense>
  );
}

export default style(Scene);
