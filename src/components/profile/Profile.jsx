import { useRef, useState, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSpring } from "@react-spring/three";
import { createColorScale } from "../../helpers/d3";
import { getRange } from "../../helpers/getRange";
import { createVertices } from "../../helpers/createVertices";
import { hexToRgb } from "../../helpers/colors";

function Profile({
  points,
  color,
  onClick,
  selected,
  slopes,
  showSlopeColors = false,
  duration = 750,
}) {
  const geometryRef = useRef();
  const materialRef = useRef();
  const meshRef = useRef();

  const { opacity } = useSpring({
    opacity: selected ? 1 : 0.8,
  });

  // Create colors buffer based on slopes and points
  const colors = useMemo(() => {
    if (
      !showSlopeColors ||
      !slopes ||
      slopes.length === 0 ||
      !points ||
      points.length < 2
    ) {
      return null;
    }
    const colorScale = createColorScale();
    const colorArray = [];

    for (let i = 0; i < points.length - 1; i++) {
      const slope = slopes[i + 1] || 0;
      const grade = getRange(slope);
      const hexColor = colorScale(grade);
      const [r, g, b] = hexToRgb(hexColor);

      // 6 vertices per segment (2 triangles)
      for (let j = 0; j < 6; j++) {
        colorArray.push(r, g, b);
      }
    }
    return new Float32Array(colorArray);
  }, [points, slopes, showSlopeColors]);

  const targetVertices = useMemo(() => createVertices(points), [points]);

  // Previous vertices and start time for interpolation — use refs to avoid
  // triggering re-renders when these change (improves performance).
  const prevVerticesRef = useRef(targetVertices);
  const startTimeRef = useRef(null);

  useEffect(() => {
    if (!geometryRef.current) return;
    // If vertex count changed, replace the prev vertices buffer.
    if (prevVerticesRef.current.length !== targetVertices.length) {
      prevVerticesRef.current = targetVertices;
    }
    startTimeRef.current = performance.now();

    // Ensure interpolatedPositions buffer matches new vertex count
    if (
      !interpolatedPositions.current ||
      interpolatedPositions.current.length !== targetVertices.length
    ) {
      interpolatedPositions.current = new Float32Array(targetVertices.length);
    }
  }, [targetVertices]);

  const interpolatedPositions = useRef(new Float32Array(targetVertices.length));

  useFrame(() => {
    if (!geometryRef.current || !startTimeRef.current) return;
    const elapsed = performance.now() - startTimeRef.current;
    const t = Math.min(elapsed / duration, 1);

    for (let i = 0; i < targetVertices.length; i++) {
      const start = prevVerticesRef.current[i] ?? 0;
      const end = targetVertices[i] ?? 0;
      interpolatedPositions.current[i] = start + (end - start) * t;
    }

    const positionAttribute = geometryRef.current.attributes.position;
    positionAttribute.array.set(interpolatedPositions.current);
    positionAttribute.needsUpdate = true;

    if (t === 1) {
      prevVerticesRef.current = targetVertices;
      startTimeRef.current = null;
    }
  });

  const initialPositions =
    prevVerticesRef.current.length === targetVertices.length
      ? prevVerticesRef.current
      : targetVertices;

  return (
    <>
      {/* Back-face scaled mesh for a consistent outline (works across browsers).
          It re-uses the same geometry object (when available) so it updates
          automatically when the main geometry changes. */}
      {geometryRef.current && (
        <mesh
          geometry={geometryRef.current}
          scale={[1.001, 1.001, 1.001]}
          renderOrder={0}
        >
          <meshBasicMaterial
            color={"black"}
            side={THREE.DoubleSide}
            polygonOffset
            polygonOffsetFactor={1}
            polygonOffsetUnits={1}
            toneMapped={false}
            transparent
            opacity={0.15} // Further reduced transparency
            alphaTest={0.02} // Lowered to make faint areas less visible
            depthWrite={false} // Keep disabled to avoid z-fighting
          />
        </mesh>
      )}

      <mesh
        ref={meshRef}
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
            array={initialPositions}
            count={initialPositions.length / 3}
            itemSize={3}
            usage={THREE.DynamicDrawUsage}
          />
          {colors && (
            <bufferAttribute
              attach="attributes-color"
              array={colors}
              count={colors.length / 3}
              itemSize={3}
            />
          )}
        </bufferGeometry>
        <meshStandardMaterial
          ref={materialRef}
          transparent
          color={showSlopeColors && colors ? "white" : color}
          vertexColors={showSlopeColors && colors ? true : false}
          side={THREE.DoubleSide}
          alphaTest={0.001}
          depthWrite={opacity.get() > 0.01} // Disable depth write when nearly invisible
        />
      </mesh>
    </>
  );
}

export default Profile;
