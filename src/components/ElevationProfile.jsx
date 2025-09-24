import { useMemo, useRef } from "react";
import { Edges } from "@react-three/drei";
import { useSpring } from "@react-spring/three";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

function ElevationProfile({ points, color, onClick, selected }) {
  const materialRef = useRef();

  const { opacity } = useSpring({ opacity: selected ? 1 : 0.5 });

  useFrame(() => {
    if (materialRef.current) {
      materialRef.current.opacity = opacity.get();
    }
  });

  const positions = useMemo(() => {
    const topVertices = points.map(([long, ele, lat]) => [long, ele, lat]);
    const baseVertices = points.map(([long, _ele, lat]) => [long, 0, lat]);

    const verts = [];
    for (let i = 0; i < points.length - 1; i++) {
      verts.push(
        ...topVertices[i],
        ...baseVertices[i],
        ...topVertices[i + 1],
        ...topVertices[i + 1],
        ...baseVertices[i],
        ...baseVertices[i + 1],
      );
    }
    return new Float32Array(verts);
  }, [points]);

  return (
    <mesh castShadow receiveShadow onClick={onClick}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <Edges linewidth={0.5} threshold={15} color="black" />
      <meshStandardMaterial
        ref={materialRef}
        transparent
        color={color}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export default ElevationProfile;
