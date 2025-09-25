import { useMemo, useRef, useEffect } from "react";
import { Edges } from "@react-three/drei";
import { useSpring } from "@react-spring/three";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

function ElevationProfile({
  points,
  color,
  onClick,
  selected,
  visible = false,
}) {
  const materialRef = useRef();
  const geometryRef = useRef();

  const { opacity } = useSpring({
    opacity: visible ? (selected ? 1 : 0.6) : 0,
  });

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

  // Create a key to force Edges re-render when geometry changes
  const geometryKey = useMemo(() => {
    // Create a simple hash from first few and last few positions for performance
    const sample =
      positions.length > 20
        ? Array.from(positions.slice(0, 12)).concat(
            Array.from(positions.slice(-12)),
          )
        : Array.from(positions);
    return sample.join(",");
  }, [positions]);

  // Update buffer geometry when positions change
  useEffect(() => {
    if (!geometryRef.current) return;
    const geom = geometryRef.current;
    geom.attributes.position.array = positions;
    geom.attributes.position.needsUpdate = true;
    geom.computeVertexNormals();
  }, [positions]);

  return (
    <mesh
      castShadow
      receiveShadow
      onClick={(e) => {
        e.stopPropagation();
        onClick && onClick(e);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "default";
      }}
    >
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <meshStandardMaterial
        ref={materialRef}
        transparent
        color={color}
        side={THREE.DoubleSide}
      />
      <Edges
        key={geometryKey} // Force re-render when geometry changes
        linewidth={0.5}
        threshold={15}
        color="black"
      />
    </mesh>
  );
}

export default ElevationProfile;
