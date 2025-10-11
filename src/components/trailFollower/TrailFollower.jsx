import { useRef, useEffect, useState, use, useCallback } from "react";
import { useFrame } from "@react-three/fiber";

import { Vector3 } from "three";
import { scaleLinear } from "d3-scale";
import { Html } from "@react-three/drei";
import { useAnimations, useGLTF } from "@react-three/drei";
import useStore from "../../store/store";

function throttle(fn, delay) {
  let timeout = null;
  return (...args) => {
    if (!timeout) {
      fn(...args);
      timeout = setTimeout(() => {
        timeout = null;
      }, delay);
    }
  };
}

export default function TrailFollower({
  speed = 0.02,
  height = 0.01,
  scale = 0.01,
  color = "red",
  lerpFactor = 0.02,
  showIndex = true,
  tracking,
  maxRollAngle = Math.PI / 12, // Maximum 15 degrees roll
  rollSensitivity = 5.5, // How sensitive the roll is to direction changes
  ...props
}) {
  const group = useRef();
  const progress = useRef(0);
  const [scaledPath, setScaledPath] = useState([]);

  // Temp vectors to avoid per-frame allocations
  const tmpForward = useRef(new Vector3());
  const tmpDesired = useRef(new Vector3());
  const tmpNewLookAt = useRef(new Vector3());
  const tmpTurnVec = useRef(new Vector3());
  const tmpDesiredDir = useRef(new Vector3());
  const tmpOffset = useRef(new Vector3());
  const tmpCameraPos = useRef(new Vector3());
  const tmpUp = useRef(new Vector3(0, 0.2, 0));

  const setCurrentPositionIndex = useStore(
    (state) => state.setCurrentPositionIndex,
  );
  const coordinates = useStore((state) => state.gpsData);

  const throttledSetIndex = useRef(throttle(setCurrentPositionIndex, 1000));

  // Store previous direction for banking calculation
  const previousDirection = useRef(new Vector3(0, 0, -1));
  const currentRoll = useRef(0);

  const { nodes, animations } = useGLTF("/cartoon_plane.glb");
  const { actions } = useAnimations(animations, group);

  // Scale coordinates to match elevation profile (same scaling as Runner)
  useEffect(() => {
    if (!coordinates || coordinates.length === 0) return;

    const xExtent = [
      Math.min(...coordinates.map((coord) => coord[0])),
      Math.max(...coordinates.map((coord) => coord[0])),
    ];
    const yExtent = [
      Math.min(...coordinates.map((coord) => coord[2])),
      Math.max(...coordinates.map((coord) => coord[2])),
    ];
    const zExtent = [
      Math.min(...coordinates.map((coord) => coord[1])),
      Math.max(...coordinates.map((coord) => coord[1])),
    ];

    const lonDelta = xExtent[1] - xExtent[0];
    const latDelta = zExtent[1] - zExtent[0];
    const aspectRatio = lonDelta / latDelta;

    if (aspectRatio > 1) {
      xExtent[0] -= lonDelta * 0.1;
      xExtent[1] += lonDelta * 0.1;
      zExtent[0] -= latDelta * aspectRatio * 0.1;
      zExtent[1] += latDelta * aspectRatio * 0.1;
    } else {
      xExtent[0] -= (lonDelta / aspectRatio) * 0.1;
      xExtent[1] += (lonDelta / aspectRatio) * 0.1;
      zExtent[0] -= latDelta * 0.1;
      zExtent[1] += latDelta * 0.1;
    }

    const xScale = scaleLinear().domain(xExtent).range([-2, 2]);
    const yScale = scaleLinear().domain([0, yExtent[1]]).range([0, 1]);
    const zScale = scaleLinear().domain(zExtent).range([5, -5]);

    const scaled = coordinates.map((coord) => [
      xScale(coord[0]), // longitude → x
      yScale(coord[2]), // elevation + height → y
      zScale(coord[1]), // latitude → z
    ]);

    setScaledPath(scaled);
  }, [coordinates, height]);

  useEffect(() => {
    if (group.current) {
      group.current.updateMatrix();
    }
    // Start animation if available
    if (actions && Object.keys(actions).length > 0) {
      const firstAction = Object.values(actions)[0];
      firstAction.setEffectiveTimeScale(2.5).play();
    }
  }, [actions]);

  useFrame((state, delta) => {
    if (!scaledPath || scaledPath.length === 0 || !group.current) return;

    // Increment progress to move along the trail
    progress.current += speed * delta;

    // Loop back to start when reaching the end
    if (progress.current >= 1) {
      progress.current = 0;
    }

    // Compute current point index
    const currentIndex = Math.floor(progress.current * (scaledPath.length - 1));
    const nextIndex = Math.min(currentIndex + 1, scaledPath.length - 1);

    // Update position index with throttling
    throttledSetIndex.current(currentIndex);

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
    group.current.position.lerp(targetPosition, alpha);

    // Tracking mode: update camera position behind and above the plane
    if (tracking) {
      // Get forward direction of the plane
      group.current.getWorldDirection(tmpForward.current);
      // Camera offset: behind (-forward) and above (+y)
      const cameraDistance = 0.5; // distance behind
      const cameraYOffset = 0.2; // height above
      // tmpOffset = forward * -cameraDistance
      tmpOffset.current
        .copy(tmpForward.current)
        .multiplyScalar(-cameraDistance);
      // tmpCameraPos = group.position + tmpOffset + up
      tmpCameraPos.current.copy(group.current.position).add(tmpOffset.current);
      tmpUp.current.set(0, cameraYOffset, 0);
      tmpCameraPos.current.add(tmpUp.current);

      // Smoothly move camera to desired position using alpha
      state.camera.position.lerp(tmpCameraPos.current, alpha);
      // Camera looks at the plane
      state.camera.lookAt(group.current.position);
    }

    // Calculate look-at target for smooth rotation (reuse tmpDesired)
    tmpDesired.current.set(nextPoint[0], nextPoint[1] + height, nextPoint[2]);

    // Get current forward direction into tmpForward
    group.current.getWorldDirection(tmpForward.current);

    // Calculate desired direction into tmpDesiredDir (reuse)
    tmpDesiredDir.current
      .subVectors(tmpDesired.current, group.current.position)
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
    tmpNewLookAt.current.addVectors(group.current.position, tmpForward.current);
    group.current.lookAt(tmpNewLookAt.current);

    // Apply banking/roll rotation around the Z-axis (roll) without cloning
    group.current.rotation.set(
      group.current.rotation.x,
      group.current.rotation.y,
      group.current.rotation.z + currentRoll.current,
    );

    // Update previous direction for next frame (store normalized direction)
    previousDirection.current.copy(tmpDesiredDir.current);
  });

  return (
    <group ref={group} scale={scale} {...props} dispose={null}>
      <primitive
        object={nodes.Sketchfab_Scene}
        rotation={[0, 0, 0]}
        castShadow
      />
    </group>
  );
}

useGLTF.preload("/cartoon_plane.glb");
