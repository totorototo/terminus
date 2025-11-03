import { memo, useRef, useState } from "react";
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

  useFrame((state) => {
    if (!ref.current || !textRef.current) return;

    // Manual billboard behavior - always face camera
    textRef.current.lookAt(state.camera.position);

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

    // Update text opacity and scale based on visibility
    if (textRef.current.material) {
      textRef.current.material.opacity = isVisible ? 1 : 0;
      textRef.current.scale.setScalar(isVisible ? 1 : 0.25);
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
