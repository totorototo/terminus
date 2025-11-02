import React, { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useSprings, a } from "@react-spring/three";

function AnimatedMesh({ vertices, duration = 3000 }) {
  const geometryRef = useRef();

  // Flatten vertices for count and size
  const count = vertices.length;

  // Create springs, one for each vertex position (vec3)
  const [springs, api] = useSprings(count, (index) => ({
    position: vertices[index],
    config: { duration },
  }));

  // On vertices prop update, animate springs to new positions
  useEffect(() => {
    api.start((index) => ({
      position: vertices[index],
      config: { duration },
    }));
  }, [vertices, api, duration]);

  // Update buffer attribute every frame with interpolated values
  useFrame(() => {
    if (!geometryRef.current) return;
    const positionAttribute = geometryRef.current.attributes.position;
    // Gather each spring position value and update buffer attribute array
    const newPositions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const p = springs[i].position.get();
      newPositions.set(p, i * 3);
    }
    positionAttribute.array.set(newPositions);
    positionAttribute.needsUpdate = true;
  });

  // Initialize buffer attribute with current vertices
  const verticesArray = new Float32Array(vertices.flat());

  return (
    <mesh>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute
          attach="attributes-position"
          array={verticesArray}
          count={count}
          itemSize={3}
        />
      </bufferGeometry>
      <meshStandardMaterial color="orange" />
    </mesh>
  );
}

export default AnimatedMesh;
