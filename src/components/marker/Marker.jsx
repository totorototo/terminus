import { memo, useRef, useState, useEffect } from "react";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useTheme } from "styled-components";

function Marker({ children, position, ...props }) {
  const ref = useRef();
  const textRef = useRef();
  const theme = useTheme();

  const vec = useRef(new THREE.Vector3());
  const raycaster = useRef(new THREE.Raycaster());
  const currentOpacity = useRef(0);
  const targetOpacity = useRef(0);
  const animationStartTime = useRef(null);

  // Reset opacity and start time when position changes (fade in again)
  useEffect(() => {
    currentOpacity.current = 0;
    animationStartTime.current = Date.now();
  }, [position]);

  useFrame((state, delta) => {
    if (!ref.current || !textRef.current) return;

    // Manual billboard behavior - always face camera
    textRef.current.lookAt(state.camera.position);

    // Check if delay has passed
    const delayMs = 400;
    const timeSinceStart = Date.now() - (animationStartTime.current || 0);
    const canAnimate = timeSinceStart >= delayMs;

    // Check distance range
    const distance = state.camera.position.distanceTo(
      ref.current.getWorldPosition(vec.current),
    );
    const isInRange = distance <= 10;

    // Check occlusion with simple raycasting
    const worldPos = ref.current.getWorldPosition(vec.current);
    const direction = worldPos.clone().sub(state.camera.position).normalize();
    raycaster.current.set(state.camera.position, direction);

    // Simple occlusion check - you might want to make this more sophisticated
    const intersects = raycaster.current.intersectObjects(
      state.scene.children,
      true,
    );
    const isOccluded =
      intersects.length > 0 && intersects[0].distance < distance - 0.1;

    const isVisible = isInRange && !isOccluded;

    // Set target opacity based on visibility (only after delay)
    targetOpacity.current = canAnimate && isVisible ? 1 : 0;

    // Smooth transition (lerp) between current and target opacity
    const fadeSpeed = 3; // Adjust for faster/slower fade
    currentOpacity.current = THREE.MathUtils.lerp(
      currentOpacity.current,
      targetOpacity.current,
      delta * fadeSpeed,
    );

    // Update text opacity and scale based on visibility
    if (textRef.current.material) {
      textRef.current.material.opacity = currentOpacity.current;
      textRef.current.scale.setScalar(
        THREE.MathUtils.lerp(0.25, 1, currentOpacity.current),
      );
    }
  });

  return (
    <group ref={ref} position={position}>
      <Text
        ref={textRef}
        fontSize={0.04}
        color={theme.colors.dark["--color-text"]}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.001}
        outlineColor={theme.colors.dark["--color-background"]}
        {...props}
      >
        {children}
      </Text>
    </group>
  );
}

export default Marker;
