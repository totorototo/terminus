import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { CameraControls } from "@react-three/drei";
import { Vector3 } from "three";
import useStore from "../../store/store.js";

export default function CameraController({
  modelRef,
  distance = 0.5,
  height = 0.3,
  lerpFactor = 0.05,
  enabled = true,
}) {
  const cameraControlsRef = useRef();
  const trackingMode = useStore((state) => state.trackingMode);

  // Temp vectors to avoid per-frame allocations
  const tmpModelPosition = useRef(new Vector3());
  const tmpModelDirection = useRef(new Vector3());
  const tmpCameraPosition = useRef(new Vector3());
  const tmpOffset = useRef(new Vector3());

  useEffect(() => {
    if (cameraControlsRef.current) {
      // Set initial camera position when not tracking
      if (!trackingMode) {
        cameraControlsRef.current.setPosition(0, 3, 6, true);
        cameraControlsRef.current.setTarget(0, 0, 0, true);
      }
    }
  }, [trackingMode]);

  useFrame((state, delta) => {
    if (!cameraControlsRef.current || !enabled) return;

    if (trackingMode && modelRef?.current) {
      // Get model's world position and direction
      modelRef.current.getWorldPosition(tmpModelPosition.current);
      modelRef.current.getWorldDirection(tmpModelDirection.current);

      // Calculate camera offset: behind and above the plane
      tmpOffset.current
        .copy(tmpModelDirection.current)
        .multiplyScalar(-distance); // Behind the plane

      // Calculate desired camera position
      tmpCameraPosition.current
        .copy(tmpModelPosition.current)
        .add(tmpOffset.current);
      tmpCameraPosition.current.y += height; // Above the plane

      // Convert lerpFactor to frame-rate independent alpha
      const responsiveness = Math.max(0.0001, lerpFactor * 60);
      const alpha = 1 - Math.exp(-responsiveness * delta);

      // Smoothly move camera to follow the airplane
      cameraControlsRef.current.setPosition(
        tmpCameraPosition.current.x,
        tmpCameraPosition.current.y,
        tmpCameraPosition.current.z,
        false,
      );

      // Make camera look at the airplane
      cameraControlsRef.current.setTarget(
        tmpModelPosition.current.x,
        tmpModelPosition.current.y,
        tmpModelPosition.current.z,
        false,
      );

      // Update the controls
      cameraControlsRef.current.update(delta);
    } else {
      // Free camera mode - let CameraControls handle interaction
      cameraControlsRef.current.update(delta);
    }
  });

  return (
    <CameraControls
      ref={cameraControlsRef}
      enabled={!trackingMode} // Disable user controls when tracking
      makeDefault
      minPolarAngle={-Math.PI / 4}
      maxPolarAngle={Math.PI / 2}
      minAzimuthAngle={-Math.PI / 2}
      maxAzimuthAngle={Math.PI / 2}
      smoothTime={0.25}
      draggingSmoothTime={0.125}
    />
  );
}
