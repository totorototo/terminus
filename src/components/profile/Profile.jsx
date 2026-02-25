import { useEffect, useMemo, useRef } from "react";

import { shaderMaterial } from "@react-three/drei";
import { extend, useFrame } from "@react-three/fiber";
import { Color, DoubleSide, DynamicDrawUsage } from "three";

import { createVertices } from "../../helpers/createVertices";

// Shared progress coloring logic for shaders
const PROGRESS_COLORING_LOGIC = `
  if (progressIndex >= 0.0) {
    if (progressIndex < startIndex) {
      // Before progress starts, keep as is
      baseColor = baseColor;
    } else if (progressIndex >= endIndex) {
      // After progress completes, use progress color
      baseColor = progressColor;
    } else {
      // During progress, convert global index to section-relative
      float relativeProgress = progressIndex - startIndex;
      if (vVertexIndex < relativeProgress) {
        baseColor = progressColor;
      }
    }
  }
`;

// Slope-based shader material with lighting
const SlopeMaterial = shaderMaterial(
  {
    opacity: 1.0,
    progressColor: new Color(0xff0000),
    progressIndex: -1.0,
    startIndex: 0.0,
    endIndex: 1.0,
  },
  // Vertex shader
  `
  precision highp float;
  
  attribute float slope;
  attribute float vertexIndex;
  varying float vSlope;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying float vVertexIndex;
  
  void main() {
    vSlope = slope;
    vVertexIndex = vertexIndex;
    
    // Calculate normals in view space
    vNormal = normalize(normalMatrix * normal);
    
    // Calculate view position for lighting
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    
    gl_Position = projectionMatrix * mvPosition;
  }
  `,
  // Fragment shader
  `
  precision highp float;
  
  uniform float opacity;
  uniform vec3 progressColor;
  uniform float progressIndex;
  uniform float startIndex;
  uniform float endIndex;
  varying float vSlope;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying float vVertexIndex;
  
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
    vec3 baseColor = getSlopeColor(vSlope);

    ${PROGRESS_COLORING_LOGIC}

    // Simple directional lighting (simulates sun from upper-right)
    vec3 lightDir = normalize(vec3(1.0, 1.0, 0.5));
    vec3 normal = normalize(vNormal);
    
    // Matte surface - high ambient, soft diffuse, no specular
    float ambientStrength = 0.6;
    vec3 ambient = ambientStrength * baseColor;
    
    // Softer diffuse light for matte appearance
    float diff = max(dot(normal, lightDir), 0.0);
    vec3 diffuse = diff * baseColor * 0.5;
    
    // Combine lighting (no specular = matte finish)
    vec3 finalColor = ambient + diffuse;
    
    gl_FragColor = vec4(finalColor, 1.0);
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

// Solid color shader material with lighting
const SolidColorMaterial = shaderMaterial(
  {
    baseColor: new Color(0x00ff00),
    progressColor: new Color(0xff0000),
    progressIndex: -1.0,
    startIndex: 0.0,
    endIndex: 1.0,
  },
  // Vertex shader
  `
  precision highp float;
  
  attribute float vertexIndex;
  varying vec3 vNormal;
  varying float vVertexIndex;
  
  void main() {
    // Calculate normals in view space
    vNormal = normalize(normalMatrix * normal);
    vVertexIndex = vertexIndex;
    
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
  `,
  // Fragment shader
  `
  precision highp float;
  
  uniform vec3 baseColor;
  uniform vec3 progressColor;
  uniform float progressIndex;
  uniform float startIndex;
  uniform float endIndex;
  varying vec3 vNormal;
  varying float vVertexIndex;
  
  void main() {
    vec3 finalBaseColor = baseColor;

    ${PROGRESS_COLORING_LOGIC.replace(/baseColor/g, "finalBaseColor")}

    // Simple directional lighting (simulates sun from upper-right)
    vec3 lightDir = normalize(vec3(1.0, 1.0, 0.5));
    vec3 normal = normalize(vNormal);
    
    // Matte surface - high ambient, soft diffuse, no specular
    float ambientStrength = 0.6;
    vec3 ambient = ambientStrength * finalBaseColor;
    
    // Softer diffuse light for matte appearance
    float diff = max(dot(normal, lightDir), 0.0);
    vec3 diffuse = diff * finalBaseColor * 0.5;
    
    // Combine lighting (no specular = matte finish)
    vec3 finalColor = ambient + diffuse;
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
  `,
);

extend({ SlopeMaterial, GradientMaterial, SolidColorMaterial });

function Profile({
  points,
  color,
  onClick,
  slopes,
  showSlopeColors = false,
  duration = 750,
  progressIndex,
  progressColor,
  startIndex,
  endIndex,
}) {
  const geometryRef = useRef();
  const materialRef = useRef();

  useEffect(() => {
    return () => {
      materialRef.current?.dispose();
    };
  }, []);

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

  // Create vertex index attribute for progress tracking
  const vertexIndexAttribute = useMemo(() => {
    if (!points || points.length < 2) {
      return new Float32Array(0);
    }

    const indexArray = [];
    for (let i = 0; i < points.length - 1; i++) {
      // 6 vertices per segment (2 triangles)
      // Each vertex gets the point index it corresponds to
      for (let j = 0; j < 6; j++) {
        indexArray.push(i);
      }
    }
    return new Float32Array(indexArray);
  }, [points]);

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

    geometryRef.current.computeVertexNormals();

    if (t === 1) {
      prevVerticesRef.current = targetVertices;
      startTimeRef.current = null;
    }
  });

  const initialPositions =
    prevVerticesRef.current.length === targetVertices.length
      ? prevVerticesRef.current
      : targetVertices;

  // Prepare progress parameters
  const safeProgressIndex = progressIndex ?? -1;
  const safeStartIndex = startIndex ?? 0;
  const safeEndIndex = endIndex ?? 1;
  const safeProgressColor = progressColor ?? color;

  // Memoize Color objects to avoid recreating them every render
  const materialColors = useMemo(
    () => ({
      base: new Color(color),
      progress: new Color(safeProgressColor),
    }),
    [color, safeProgressColor],
  );

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
          usage={DynamicDrawUsage}
        />
        {showSlopeColors && (
          <bufferAttribute
            attach="attributes-slope"
            array={slopeAttribute}
            count={slopeAttribute.length}
            itemSize={1}
          />
        )}
        <bufferAttribute
          attach="attributes-vertexIndex"
          array={vertexIndexAttribute}
          count={vertexIndexAttribute.length}
          itemSize={1}
        />
      </bufferGeometry>
      {showSlopeColors ? (
        <slopeMaterial
          ref={materialRef}
          side={DoubleSide}
          transparent={false}
          progressColor={materialColors.progress}
          progressIndex={safeProgressIndex}
          startIndex={safeStartIndex}
          endIndex={safeEndIndex}
          depthWrite={true}
          depthTest={true}
        />
      ) : (
        <solidColorMaterial
          ref={materialRef}
          side={DoubleSide}
          transparent={false}
          baseColor={materialColors.base}
          progressColor={materialColors.progress}
          progressIndex={safeProgressIndex}
          startIndex={safeStartIndex}
          endIndex={safeEndIndex}
          depthWrite={true}
          depthTest={true}
        />
      )}
    </mesh>
  );
}

export default Profile;
