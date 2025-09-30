import { useRef, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { scaleLinear } from "d3-scale";

export default function Runner({
  coordinates,
  speed = 0.05,
  height = 0.3,
  lerpFactor = 6,
}) {
  const { camera } = useThree();
  const progress = useRef(0);
  const [scaledPath, setScaledPath] = useState([]);

  // Scale coordinates to match elevation profile (same scaling as ThreeDimensionalProfile)
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

  useFrame((state, delta) => {
    // iterate over coordinates based on progress and update camera position and lookAt
    if (!scaledPath || scaledPath.length === 0) return;

    // Increment progress to move along the trail
    progress.current += speed * delta;

    // Loop back to start when reaching the end
    if (progress.current >= 1) {
      progress.current = 0;
    }

    // compute current point index
    const currentIndex = Math.floor(progress.current * (scaledPath.length - 1));
    const nextIndex = Math.min(currentIndex + 1, scaledPath.length - 1);

    const currentPoint = scaledPath[currentIndex];
    const nextPoint = scaledPath[nextIndex];

    if (!currentPoint || !nextPoint) return;

    // Use scaled 3D coordinates that match the elevation profile
    const currentPosition = new Vector3(
      currentPoint[0],
      currentPoint[1] + height,
      currentPoint[2],
    );
    const nextPosition = new Vector3(
      nextPoint[0],
      nextPoint[1] + height,
      nextPoint[2],
    );

    // Calculate look-ahead direction: from current position toward next position
    const lookDirection = new Vector3()
      .subVectors(nextPosition, currentPosition)
      .normalize();
    const lookAtTarget = new Vector3().addVectors(
      currentPosition,
      lookDirection.multiplyScalar(5),
    ); // Look 5 units ahead in direction

    // Use lerp for smooth camera position transitions
    const lerpAmount = Math.min(delta * lerpFactor, 1); // Configurable smoothness
    camera.position.lerp(currentPosition, lerpAmount);

    // Smooth camera direction/look-at transitions
    const currentTarget = new Vector3();
    camera.getWorldDirection(currentTarget);
    currentTarget.multiplyScalar(5).add(camera.position); // Get current look-at point

    // Lerp between current look direction and target look direction
    currentTarget.lerp(lookAtTarget, lerpAmount);
    camera.lookAt(currentTarget);
  });

  return null;
}
