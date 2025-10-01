import { useMemo, useRef, useEffect } from "react";
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
  visible = false,
  gpsResults, // Add gpsResults prop for slopes
}) {
  const materialRef = useRef();
  const geometryRef = useRef();

  const { opacity } = useSpring({
    opacity: visible ? (selected ? 1 : 0.8) : 0,
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
    if (!gpsResults?.slopes || gpsResults.slopes.length === 0) {
      // Fallback to uniform color if no slopes data
      const colorCount = (points.length - 1) * 6; // 6 vertices per segment
      return new Float32Array(colorCount * 3).fill(1); // White color
    }

    const slopes = gpsResults.slopes;
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
  }, [points, gpsResults?.slopes]);

  // Create a key to force Edges re-render when geometry changes or visibility changes
  const geometryKey = useMemo(() => {
    // Create a simple hash from first few and last few positions for performance
    const sample =
      positions.length > 20
        ? Array.from(positions.slice(0, 12)).concat(
            Array.from(positions.slice(-12)),
          )
        : Array.from(positions);
    // Include visible state and slopes to force refresh when data changes
    const slopesHash = gpsResults?.slopes
      ? gpsResults.slopes.slice(0, 5).join(",")
      : "no-slopes";
    return `${sample.join(",")}-visible:${visible}-slopes:${slopesHash}`;
  }, [positions, visible, gpsResults?.slopes]);

  // Update buffer geometry when positions change
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
  }, [positions, colors]);

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
        color={gpsResults?.slopes ? "white" : color} // Use white when vertex colors are present
        vertexColors={gpsResults?.slopes ? true : false} // Enable vertex colors when slopes are available
        side={THREE.DoubleSide}
        depthWrite={opacity.get() > 0.01} // Disable depth write when nearly invisible
        alphaTest={0.001} // Skip rendering pixels below this alpha threshold
      />
      {visible && (
        <Edges
          key={geometryKey} // Force re-render when geometry changes
          linewidth={0.5}
          threshold={40}
          color="black"
        />
      )}
    </mesh>
  );
}

export default ElevationProfile;
