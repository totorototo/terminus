import { useEffect, useRef } from "react";

import { CameraControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useShallow } from "zustand/react/shallow";

import useStore from "../../store/store.js";

export default function CameraController({ enabled = true }) {
  const cameraControlsRef = useRef();
  const { profileMode } = useStore(
    useShallow((state) => ({
      profileMode: state.app.profileMode,
    })),
  );

  useEffect(() => {
    if (cameraControlsRef.current) {
      cameraControlsRef.current.setPosition(15, 0, 0, true);
      cameraControlsRef.current.setTarget(0, 0, 0, true);
    }
  }, [profileMode]);

  useFrame((_, delta) => {
    if (!cameraControlsRef.current || !enabled) return;
    cameraControlsRef.current.update(delta);
  });

  return (
    <CameraControls
      ref={cameraControlsRef}
      makeDefault
      minPolarAngle={profileMode ? Math.PI / 2 : -Math.PI / 4}
      maxPolarAngle={profileMode ? Math.PI / 2 : Math.PI / 2}
      minAzimuthAngle={profileMode ? Math.PI / 2 : -Math.PI / 2}
      maxAzimuthAngle={Math.PI / 2}
      smoothTime={0.25}
      draggingSmoothTime={0.125}
    />
  );
}
