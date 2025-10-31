import { useMemo, useRef, useEffect } from "react";
import { Edges } from "@react-three/drei";
import { useSpring } from "@react-spring/three";
import { useFrame } from "@react-three/fiber";
import { scaleThreshold } from "d3-scale";
import { useTheme } from "styled-components";
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

// Progression colors
const PROGRESSION_COLORS = {
  REMAINING: "#9E9E9E", // Gray for remaining path
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
  } else if (Math.abs(percent) >= 5 && Math.abs(percent) < 7) {
    return ELEVATION_GRADE.EASY;
  } else if (Math.abs(percent) >= 7 && Math.abs(percent) < 10) {
    return ELEVATION_GRADE.MEDIUM;
  } else if (Math.abs(percent) >= 10 && Math.abs(percent) < 15) {
    return ELEVATION_GRADE.DIFFICULT;
  } else if (Math.abs(percent) >= 15) {
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
  showSlopeColors = false, // Prop to toggle slope colors
  showProgression = false, // Prop to toggle progression colors
  currentPositionIndex = 0, // Current position index for progression display
}) {
  const materialRef = useRef();
  const geometryRef = useRef();
  const theme = useTheme();

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

  // Update buffer geometry when positions or colors change
  useEffect(() => {
    if (!geometryRef.current) return;
    const geom = geometryRef.current;
    geom.attributes.position.array = positions;
    geom.attributes.position.needsUpdate = true;

    // Update colors if they exist
    if (colors && geom.attributes.color) {
      geom.attributes.color.array = colors;
      geom.attributes.color.needsUpdate = true;
    }

    geom.computeVertexNormals();
  }, [points, currentPositionIndex]);

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

  // Create vertex colors based on slopes or progression
  const colors = useMemo(() => {
    // Priority: progression > slopes > null
    // If neither is enabled, return null (use material color)
    if (!showProgression && !showSlopeColors) {
      return null;
    }

    const colorArray = [];

    if (showProgression) {
      // Color based on progression - use theme primary color for completed
      const completedColor = theme.colors.dark["--color-secondary"];
      const remainingColor = theme.colors.dark["--color-text"];
      const [completedR, completedG, completedB] = hexToRgb(completedColor);
      const [remainingR, remainingG, remainingB] = hexToRgb(
        PROGRESSION_COLORS.REMAINING,
      );

      for (let i = 0; i < points.length - 1; i++) {
        // Determine if this segment is completed or remaining
        const isCompleted = i < currentPositionIndex;
        const [r, g, b] = isCompleted
          ? [completedR, completedG, completedB]
          : [remainingR, remainingG, remainingB];

        // Each segment has 6 vertices, assign same color to all
        for (let j = 0; j < 6; j++) {
          colorArray.push(r, g, b);
        }
      }
    } else if (showSlopeColors && slopes && slopes.length > 0) {
      // Color based on slopes
      const colorScale = createColorScale();

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
    }

    return colorArray.length > 0 ? new Float32Array(colorArray) : null;
  }, [
    points,
    slopes,
    showSlopeColors,
    showProgression,
    currentPositionIndex,
    theme,
  ]);

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
        color={(showSlopeColors || showProgression) && colors ? "white" : color} // Use white when vertex colors are present, otherwise use prop color
        vertexColors={
          (showSlopeColors || showProgression) && colors ? true : false
        } // Enable vertex colors when any color mode is enabled and available
        side={THREE.DoubleSide}
        depthWrite={opacity.get() > 0.01} // Disable depth write when nearly invisible
        alphaTest={0.001} // Skip rendering pixels below this alpha threshold
      />
      <Edges linewidth={0.5} threshold={40} color="black" />
    </mesh>
  );
}

export default ElevationProfile;
