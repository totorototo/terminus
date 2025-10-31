import { useMemo, useRef } from "react";
import { Edges } from "@react-three/drei";
import { useSpring } from "@react-spring/three";
import { useFrame } from "@react-three/fiber";
import { scaleThreshold } from "d3-scale";
import * as THREE from "three";

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

function ElevationProfile({
  points,
  color,
  onClick,
  selected,
  slopes,
  showSlopeColors = false, // New prop to toggle slope colors
}) {
  const materialRef = useRef();
  const geometryRef = useRef();

  const { opacity } = useSpring({
    opacity: selected ? 1 : 0.8,
  });

  useFrame(() => {
    if (materialRef.current) {
      const currentOpacity = opacity.get();
      materialRef.current.opacity = currentOpacity;
      // Disable depth write when nearly invisible to prevent z-fighting
      materialRef.current.depthWrite = currentOpacity > 0.01;
      // Update material to trigger re-render if needed
      materialRef.current.needsUpdate = true;
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

  // Create vertex colors based on slopes
  const colors = useMemo(() => {
    // If slope colors are disabled or no slopes data, return null (use material color)
    if (!showSlopeColors || !slopes || slopes.length === 0) {
      return null;
    }

    const colorScale = createColorScale();
    const colorArray = [];

    // Helper function to convert hex color to RGB array
    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? [
            parseInt(result[1], 16) / 255,
            parseInt(result[2], 16) / 255,
            parseInt(result[3], 16) / 255,
          ]
        : [1, 1, 1]; // Default to white
    };

    for (let i = 0; i < points.length - 1; i++) {
      const slope = slopes[i + 1] || 0; // Use slope of next point (since first point has 0 slope)
      const grade = getRange(slope);
      const hexColor = colorScale(grade);
      const [r, g, b] = hexToRgb(hexColor);

      // Each segment has 6 vertices, assign same color to all
      for (let j = 0; j < 6; j++) {
        colorArray.push(r, g, b);
      }
    }

    return new Float32Array(colorArray);
  }, [points, slopes, showSlopeColors]);

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
        {colors && (
          <bufferAttribute
            attach="attributes-color"
            count={colors.length / 3}
            array={colors}
            itemSize={3}
          />
        )}
      </bufferGeometry>
      <meshStandardMaterial
        ref={materialRef}
        transparent
        color={showSlopeColors && colors ? "white" : color} // Use white when vertex colors are present, otherwise use prop color
        vertexColors={showSlopeColors && colors ? true : false} // Enable vertex colors when slope colors are enabled and available
        side={THREE.DoubleSide}
        depthWrite={opacity.get() > 0.01} // Disable depth write when nearly invisible
        alphaTest={0.001} // Skip rendering pixels below this alpha threshold
      />
      <Edges linewidth={0.5} threshold={40} color="black" />
    </mesh>
  );
}

export default ElevationProfile;
