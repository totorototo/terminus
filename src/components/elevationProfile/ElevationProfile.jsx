import React, { useRef, useState, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { scaleThreshold } from "d3-scale";
import { useSpring } from "@react-spring/three";

// Elevation grade and colors constants omitted for brevity, reuse from your code.
// Elevation grade constants
const ELEVATION_GRADE = {
  SMALL: 0,
  EASY: 1,
  MEDIUM: 2,
  DIFFICULT: 3,
  HARD: 4,
  UNKNOWN: 5,
};

const ELEVATION_COLORS = {
  SMALL: "#F4F6F5",
  EASY: "#ECBC3E",
  MEDIUM: "#EA8827",
  DIFFICULT: "#E1351D",
  HARD: "#96451F",
  UNKNOWN: "#00451F",
};

// Create D3 color scale
const createColorScale = () => {
  return scaleThreshold()
    .domain([1, 2, 3, 4])
    .range([
      ELEVATION_COLORS.SMALL,
      ELEVATION_COLORS.EASY,
      ELEVATION_COLORS.MEDIUM,
      ELEVATION_COLORS.DIFFICULT,
      ELEVATION_COLORS.HARD,
    ]);
};

// Get elevation grade based on slope percentage
const getRange = (percent) => {
  if (Math.abs(percent) < 5) {
    return ELEVATION_GRADE.SMALL;
  } else if (Math.abs(percent) >= 5 && Math.abs(percent) < 10) {
    return ELEVATION_GRADE.EASY;
  } else if (Math.abs(percent) >= 10 && Math.abs(percent) < 15) {
    return ELEVATION_GRADE.MEDIUM;
  } else if (Math.abs(percent) >= 15 && Math.abs(percent) < 20) {
    return ELEVATION_GRADE.DIFFICULT;
  } else if (Math.abs(percent) >= 20) {
    return ELEVATION_GRADE.HARD;
  }
  return ELEVATION_GRADE.UNKNOWN;
};

function ElevationProfileManualInterpolationWithColors({
  points,
  color,
  onClick,
  selected,
  slopes,
  showSlopeColors = false,
  profileMode,
  duration = 750,
}) {
  const geometryRef = useRef();
  const materialRef = useRef();

  const { opacity } = useSpring({
    opacity: selected ? 1 : 0.8,
  });

  // Create vertices (same as before)
  const createVertices = (pts) => {
    if (!pts || pts.length < 2) return new Float32Array();

    const topVertices = pts.map(([long, ele, lat]) => [long, ele, lat]);
    const baseVertices = pts.map(([long, _ele, lat]) => [long, 0, lat]);

    const verts = [];
    for (let i = 0; i < pts.length - 1; i++) {
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
  };

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

    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!result) return [1, 1, 1];
      return [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255,
      ];
    };

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

  // Previous vertices and start time state for interpolation
  const [prevVertices, setPrevVertices] = useState(targetVertices);
  const [startTime, setStartTime] = useState(null);

  useEffect(() => {
    if (!geometryRef.current) return;
    setPrevVertices((prev) => {
      if (prev.length !== targetVertices.length) return targetVertices;
      return prev;
    });
    setStartTime(performance.now());
  }, [targetVertices]);

  const interpolatedPositions = useRef(new Float32Array(targetVertices.length));

  useFrame(() => {
    if (!geometryRef.current || !startTime) return;
    const elapsed = performance.now() - startTime;
    const t = Math.min(elapsed / duration, 1);

    for (let i = 0; i < targetVertices.length; i++) {
      const start = prevVertices[i] ?? 0;
      const end = targetVertices[i] ?? 0;
      interpolatedPositions.current[i] = start + (end - start) * t;
    }

    const positionAttribute = geometryRef.current.attributes.position;
    positionAttribute.array.set(interpolatedPositions.current);
    positionAttribute.needsUpdate = true;

    if (t === 1) {
      setPrevVertices(targetVertices);
      setStartTime(null);
    }
  });

  const initialPositions =
    prevVertices.length === targetVertices.length
      ? prevVertices
      : targetVertices;

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
  );
}

export default ElevationProfileManualInterpolationWithColors;
