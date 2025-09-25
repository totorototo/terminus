import { useState, useEffect } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useSpring } from "@react-spring/three";

export default function AnimatedOrbitControls({
  cameraPosition,
  targetPosition,
  duration = 1000,
  ...rest
}) {
  const { camera, gl } = useThree();
  const [enabled, setEnabled] = useState(true);

  const spring = useSpring({
    from: {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
      targetX: 0,
      targetY: 0,
      targetZ: 0,
    },
    to: {
      x: cameraPosition[0],
      y: cameraPosition[1],
      z: cameraPosition[2],
      targetX: targetPosition[0],
      targetY: targetPosition[1],
      targetZ: targetPosition[2],
    },
    config: { duration },
    onStart: () => setEnabled(false), // disable controls during animation
    onRest: () => setEnabled(true), // enable controls after animation completes
  });

  useFrame(() => {
    if (!enabled) {
      camera.position.set(spring.x.get(), spring.y.get(), spring.z.get());
      camera.lookAt(
        spring.targetX.get(),
        spring.targetY.get(),
        spring.targetZ.get(),
      );
    }
  });

  return (
    <OrbitControls
      {...rest}
      enabled={enabled}
      args={[camera, gl.domElement]}
      target={targetPosition}
    />
  );
}
