import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
import { scaleLinear } from "d3-scale";
import { Html } from "@react-three/drei";
import { useAnimations, useGLTF } from "@react-three/drei";
import { set } from "date-fns";

export default function TrailFollower({
  coordinates,
  speed = 0.02,
  height = 0.01,
  scale = 0.01,
  color = "red",
  lerpFactor = 0.02,
  showIndex = true,
  gpsResults,
  tracking,
  setCurrentPositionIndex,
  maxRollAngle = Math.PI / 12, // Maximum 15 degrees roll
  rollSensitivity = 5.5, // How sensitive the roll is to direction changes
  ...props
}) {
  const group = useRef();
  const progress = useRef(0);
  const [scaledPath, setScaledPath] = useState([]);

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

    // Update current index state for display
    setCurrentPositionIndex(currentIndex);

    const currentPoint = scaledPath[currentIndex];
    const nextPoint = scaledPath[nextIndex];

    if (!currentPoint || !nextPoint) return;

    // Interpolate between current and next point for smooth movement
    const t = (progress.current * (scaledPath.length - 1)) % 1;
    const targetPosition = new Vector3(
      currentPoint[0] + (nextPoint[0] - currentPoint[0]) * t,
      currentPoint[1] + (nextPoint[1] - currentPoint[1]) * t + height,
      currentPoint[2] + (nextPoint[2] - currentPoint[2]) * t,
    );

    // Smooth position transition using lerp
    group.current.position.lerp(targetPosition, lerpFactor);

    // Tracking mode: update camera position behind and above the plane
    if (tracking) {
      // Get forward direction of the plane
      const forward = new Vector3();
      group.current.getWorldDirection(forward);
      // Camera offset: behind (-forward) and above (+y)
      const cameraDistance = 0.5; // distance behind
      const cameraYOffset = 0.2; // height above
      const desiredCameraPos = new Vector3()
        .copy(group.current.position)
        .add(forward.clone().multiplyScalar(-cameraDistance))
        .add(new Vector3(0, cameraYOffset, 0));
      // Smoothly move camera to desired position
      state.camera.position.lerp(desiredCameraPos, lerpFactor);
      // Camera looks at the plane
      state.camera.lookAt(targetPosition);
    }

    // Calculate look-at target for smooth rotation
    const lookAtTarget = new Vector3(
      nextPoint[0],
      nextPoint[1] + height,
      nextPoint[2],
    );

    // Get current forward direction
    const currentDirection = new Vector3();
    group.current.getWorldDirection(currentDirection);

    // Calculate desired direction
    const desiredDirection = new Vector3()
      .subVectors(lookAtTarget, group.current.position)
      .normalize();

    // Calculate banking/roll angle based on direction change
    const turnVector = new Vector3().crossVectors(
      previousDirection.current,
      desiredDirection,
    );
    const turnRate = turnVector.y; // Y component indicates left/right turn

    // Calculate target roll angle
    // Positive turnRate = left turn = bank left (positive roll)
    // Negative turnRate = right turn = bank right (negative roll)
    const targetRoll =
      Math.sign(turnRate) *
      Math.min(Math.abs(turnRate) * rollSensitivity, maxRollAngle);

    // Smooth roll transition
    currentRoll.current += (targetRoll - currentRoll.current) * lerpFactor * 3;

    // Lerp between current and desired direction
    currentDirection.lerp(desiredDirection, lerpFactor);

    // Apply the lerped direction as lookAt
    const newLookAt = new Vector3().addVectors(
      group.current.position,
      currentDirection,
    );
    group.current.lookAt(newLookAt);

    // Apply banking/roll rotation around the Z-axis (roll)
    // Store current rotation and only modify the roll (Z) component
    const currentRotation = group.current.rotation.clone();
    group.current.rotation.set(
      currentRotation.x,
      currentRotation.y,
      currentRotation.z + currentRoll.current,
    );

    // Update previous direction for next frame
    previousDirection.current.copy(desiredDirection);
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
