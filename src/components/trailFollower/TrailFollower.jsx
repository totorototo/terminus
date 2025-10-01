import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
import { scaleLinear } from "d3-scale";
import { Box, Html } from "@react-three/drei";
import { useAnimations, useGLTF } from "@react-three/drei";
import style from "./TrailFollower.style.js";

export default function TrailFollower({
  coordinates,
  speed = 0.02,
  height = 0.01,
  scale = 0.01,
  color = "red",
  lerpFactor = 0.05,
  showIndex = true,
  gpsResults,
  ...props
}) {
  const group = useRef();
  const progress = useRef(0);
  const [scaledPath, setScaledPath] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

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
    setCurrentIndex(currentIndex);

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

    // Lerp between current and desired direction
    currentDirection.lerp(desiredDirection, lerpFactor);

    // Apply the lerped direction as lookAt
    const newLookAt = new Vector3().addVectors(
      group.current.position,
      currentDirection,
    );
    group.current.lookAt(newLookAt);
  });

  return (
    <group ref={group} scale={scale} {...props} dispose={null}>
      <primitive
        object={nodes.Sketchfab_Scene}
        rotation={[0, 0, 0]}
        castShadow
      />
      {showIndex && (
        <Html
          position={[0, 15, 0]}
          center
          transform={false}
          sprite={true}
          style={{
            zIndex: 10000,
            pointerEvents: "none",
            userSelect: "none",
            transform: "translate3d(-50%, -100%, 0)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              justifyContent: "flex-start",
              gap: "0.15em",
              fontSize: "12px",
              fontWeight: "100",
              color: "#262424ff",
              background: "rgba(255, 255, 255, 0.95)",
              padding: "8px 12px",
              borderRadius: "6px",
              textAlign: "left",
              minWidth: "100px",
              lineHeight: "1.2",
              letterSpacing: "1px",
              userSelect: "none",
              pointerEvents: "none",
              border: "1px solid #808080",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
              backdropFilter: "blur(4px)",
              maxWidth: "150px",
              whiteSpace: "nowrap",
            }}
          >
            {gpsResults?.cumulativeDistances?.[currentIndex] !== undefined && (
              <div>
                {`${(gpsResults.cumulativeDistances[currentIndex] / 1000).toFixed(2)} km`}
              </div>
            )}
            {gpsResults?.cumulativeElevations?.[currentIndex] !== undefined && (
              <div>
                {`↗ ${gpsResults.cumulativeElevations[currentIndex].toFixed(0)} m`}
              </div>
            )}
            {gpsResults?.cumulativeElevationLosses?.[currentIndex] !==
              undefined && (
              <div>
                {`↘ ${gpsResults.cumulativeElevationLosses[currentIndex].toFixed(0)} m`}
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

useGLTF.preload("/cartoon_plane.glb");
