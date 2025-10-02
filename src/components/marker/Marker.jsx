import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import React, { useRef, useState } from "react";
import { Html } from "@react-three/drei";

function Marker({ children, ...props }) {
  const ref = useRef();
  // This holds the local occluded state
  const [isOccluded, setOccluded] = useState();
  const [isInRange, setInRange] = useState();
  const isVisible = isInRange && !isOccluded;

  // Test distance
  const vec = new THREE.Vector3();
  useFrame((state) => {
    const range =
      state.camera.position.distanceTo(ref.current.getWorldPosition(vec)) <= 10;
    if (range !== isInRange) setInRange(range);
  });

  return (
    <group ref={ref}>
      <Html
        // 3D-transform contents
        // transform
        // Hide contents "behind" other meshes
        occlude
        // Tells us when contents are occluded (or not)
        onOcclude={setOccluded}
        // We just interpolate the visible state into css opacity and transforms
        style={{
          transition: "all 0.2s",
          opacity: isVisible ? 1 : 0,
          transform: `scale(${isVisible ? 1 : 0.25})`,
        }}
        {...props}
      >
        {children}
      </Html>
    </group>
  );
}

export default Marker;
