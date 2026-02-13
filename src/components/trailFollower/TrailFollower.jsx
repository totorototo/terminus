import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";

import { Vector3 } from "three";
import { useAnimations, useGLTF } from "@react-three/drei";
import useStore from "../../store/store";
import { transformCoordinates } from "../../utils/coordinateTransforms";

export default function TrailFollower({
  speed = 0.02,
  height = 0.01,
  scale = 0.01,
  color = "red",
  lerpFactor = 0.02,
  maxRollAngle = Math.PI / 12, // Maximum 15 degrees roll
  rollSensitivity = 5.5, // How sensitive the roll is to direction changes
  modelRef = null,
  coordinateScales,
  ...props
}) {
  const progress = useRef(0);
  const [scaledPath, setScaledPath] = useState([]);

  // Temp vectors to avoid per-frame allocations
  const tmpForward = useRef(new Vector3());
  const tmpDesired = useRef(new Vector3());
  const tmpNewLookAt = useRef(new Vector3());
  const tmpTurnVec = useRef(new Vector3());
  const tmpDesiredDir = useRef(new Vector3());

  // Store previous direction for banking calculation
  const previousDirection = useRef(new Vector3(0, 0, -1));
  const currentRoll = useRef(0);

  const setCurrentPositionIndex = useStore(
    (state) => state.setCurrentPositionIndex,
  );
  const setStartingDate = useStore((state) => state.setStartingDate);
  const coordinates = useStore((state) => state.gpx.data);

  const { nodes, animations } = useGLTF("/cartoon_plane.glb");
  const { actions } = useAnimations(animations, modelRef);

  // Scale coordinates to match elevation profile (same scaling as Runner)
  useEffect(() => {
    if (!coordinates || coordinates.length === 0 || !coordinateScales) return;

    const points3D = transformCoordinates(coordinates, coordinateScales);
    setScaledPath(points3D);
  }, [coordinates, coordinateScales, height]);

  useEffect(() => {
    if (modelRef.current) {
      modelRef.current.updateMatrix();
    }
    // Start animation if available
    if (actions && Object.keys(actions).length > 0) {
      const firstAction = Object.values(actions)[0];
      firstAction.setEffectiveTimeScale(2.5).play();
    }
  }, [actions]);

  useEffect(() => {
    // setStartingDate(Date.now());
  }, []);

  useFrame((state, delta) => {
    if (!scaledPath || scaledPath.length === 0 || !modelRef.current) return;

    // Increment progress to move along the trail
    progress.current += speed * delta;

    // Loop back to start when reaching the end
    if (progress.current >= 1) {
      progress.current = 0;
      // setStartingDate(Date.now());
    }

    // Compute current point index
    const currentIndex = Math.floor(progress.current * (scaledPath.length - 1));
    const nextIndex = Math.min(currentIndex + 1, scaledPath.length - 1);

    if (currentIndex) {
      // Update position index with throttling (disabled - causes perf issues)
      // setCurrentPositionIndex({
      //   index: currentIndex,
      //   date: Date.now(),
      // });
    }

    const currentPoint = scaledPath[currentIndex];
    const nextPoint = scaledPath[nextIndex];

    if (!currentPoint || !nextPoint) return;

    // Interpolate between current and next point for smooth movement
    const t = (progress.current * (scaledPath.length - 1)) % 1;
    const targetPosition = tmpNewLookAt.current.set(
      currentPoint[0] + (nextPoint[0] - currentPoint[0]) * t,
      currentPoint[1] + (nextPoint[1] - currentPoint[1]) * t + height,
      currentPoint[2] + (nextPoint[2] - currentPoint[2]) * t,
    );

    // Compute delta-aware alpha from lerpFactor
    // Convert lerpFactor (roughly per-frame) into an exponential smoothing alpha
    const responsiveness = Math.max(0.0001, lerpFactor * 60); // tuned to typical 60FPS baseline
    const alpha = 1 - Math.exp(-responsiveness * delta);

    // Smooth position transition using lerp with alpha
    modelRef.current.position.lerp(targetPosition, alpha);

    // Calculate look-at target for smooth rotation (reuse tmpDesired)
    tmpDesired.current.set(nextPoint[0], nextPoint[1] + height, nextPoint[2]);

    // Get current forward direction into tmpForward
    modelRef.current.getWorldDirection(tmpForward.current);

    // Calculate desired direction into tmpDesiredDir (reuse)
    tmpDesiredDir.current
      .subVectors(tmpDesired.current, modelRef.current.position)
      .normalize();

    // Calculate banking/roll angle based on direction change into tmpTurnVec
    tmpTurnVec.current.crossVectors(
      previousDirection.current,
      tmpDesiredDir.current,
    );
    const turnRate = tmpTurnVec.current.y;

    // Calculate target roll angle
    const targetRoll =
      Math.sign(turnRate) *
      Math.min(Math.abs(turnRate) * rollSensitivity, maxRollAngle);

    // Smooth roll transition (use alpha)
    currentRoll.current += (targetRoll - currentRoll.current) * alpha * 3;

    // Lerp between current forward and desired direction using alpha
    tmpForward.current.lerp(tmpDesiredDir.current, alpha);

    // Build lookAt point and apply
    tmpNewLookAt.current.addVectors(
      modelRef.current.position,
      tmpForward.current,
    );

    modelRef.current.lookAt(tmpNewLookAt.current);

    // Apply banking/roll rotation around the Z-axis (roll) without cloning
    modelRef.current.rotation.set(
      modelRef.current.rotation.x,
      modelRef.current.rotation.y,
      modelRef.current.rotation.z + currentRoll.current,
    );

    // Update previous direction for next frame (store normalized direction)
    previousDirection.current.copy(tmpDesiredDir.current);
  });

  return (
    <group ref={modelRef} scale={scale} {...props} dispose={null}>
      <primitive
        object={nodes.Sketchfab_Scene}
        rotation={[0, 0, 0]}
        castShadow
      />
    </group>
  );
}

useGLTF.preload("/cartoon_plane.glb");
