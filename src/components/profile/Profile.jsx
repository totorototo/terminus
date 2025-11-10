import { useRef, useState, useEffect, useMemo } from "react";
import { useFrame, extend } from "@react-three/fiber";
import * as THREE from "three";
import { useSpring } from "@react-spring/three";
import { createVertices } from "../../helpers/createVertices";
import { shaderMaterial } from "@react-three/drei";

// Slope-based shader material
const SlopeMaterial = shaderMaterial(
  {
    opacity: 0.8,
  },
  // Vertex shader
  `
  attribute float slope;
  varying float vSlope;
  
  void main() {
    vSlope = slope;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
  `,
  // Fragment shader
  `
  uniform float opacity;
  varying float vSlope;
  
  vec3 getSlopeColor(float grade) {
    // Use absolute value to treat negative and positive slopes the same
    float absGrade = abs(grade);
    
    // 5 ranges: 0-5%, 5-10%, 10-15%, 15-20%, 20%+
    // Colors from ELEVATION_COLORS
    if (absGrade < 5.0) return vec3(0.957, 0.965, 0.961);   // SMALL #F4F6F5
    if (absGrade < 10.0) return vec3(0.925, 0.737, 0.243);  // EASY #ECBC3E
    if (absGrade < 15.0) return vec3(0.918, 0.533, 0.153);  // MEDIUM #EA8827
    if (absGrade < 20.0) return vec3(0.882, 0.204, 0.114);  // DIFFICULT #E1351D
    return vec3(0.588, 0.271, 0.122);                       // HARD #96451F
  }
  
  void main() {
    vec3 color = getSlopeColor(vSlope);
    gl_FragColor = vec4(color, opacity);
  }
  `,
);

// Gradient shader material for elevation visualization
const GradientMaterial = shaderMaterial(
  {},
  `
  varying float vY;
  void main() {
    vY = position.y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
  `,
  `
  varying float vY;
  void main() {
    float t = clamp(vY / 1.0, 0.0, 1.0);
    vec3 color = mix(vec3(0.0, 1.0, 0.0), vec3(1.0, 0.0, 0.0), t);
    gl_FragColor = vec4(color, 1.0);
  }
  `,
);

extend({ SlopeMaterial, GradientMaterial });

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

  const { opacity } = useSpring({
    opacity: selected ? 1 : 0.8,
  });

  // Create slope attribute buffer from slopes array
  const slopeAttribute = useMemo(() => {
    if (!slopes || slopes.length === 0 || !points || points.length < 2) {
      // Default slopes to 0 if not provided
      const defaultSlopes = new Float32Array((points.length - 1) * 6);
      return defaultSlopes;
    }

    const slopeArray = [];
    for (let i = 0; i < points.length - 1; i++) {
      const slope = slopes[i + 1] || 0;
      // 6 vertices per segment (2 triangles)
      for (let j = 0; j < 6; j++) {
        slopeArray.push(slope);
      }
    }
    return new Float32Array(slopeArray);
  }, [points, slopes]);

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
        {showSlopeColors && (
          <bufferAttribute
            attach="attributes-slope"
            array={slopeAttribute}
            count={slopeAttribute.length}
            itemSize={1}
          />
        )}
      </bufferGeometry>
      {showSlopeColors ? (
        <slopeMaterial
          side={THREE.DoubleSide}
          transparent
          opacity={opacity.get()}
          depthWrite={opacity.get() > 0.01}
        />
      ) : (
        // <gradientMaterial
        //   side={THREE.DoubleSide}
        //   transparent
        //   baseColor={baseColor}
        //   opacity={opacity.get()}
        //   depthWrite={opacity.get() > 0.01}
        // />
        <meshStandardMaterial
          transparent
          color={color}
          vertexColors={false}
          side={THREE.DoubleSide}
          alphaTest={0.001}
          depthWrite={opacity.get() > 0.01} // Disable depth write when nearly invisible
        />
      )}
    </mesh>
  );
}

export default Profile;
