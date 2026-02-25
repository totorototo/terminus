import { shaderMaterial } from "@react-three/drei";
import { extend } from "@react-three/fiber";
import * as THREE from "three";

export const FadingTextMaterial = shaderMaterial(
  {
    uFadeDistance: 50,
    uFadeStrength: 1,
    uFadeFrom: 1, // 0 = origin, 1 = camera (like Grid)
    uCameraPos: new THREE.Vector3(),
    uOrigin: new THREE.Vector3(0, 0, 0),
    uColor: new THREE.Color("#ffffff"),
  },
  /* vertex shader */
  `
    varying vec3 vWorldPos;
    void main() {
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPos = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  /* fragment shader */
  `
    uniform float uFadeDistance;
    uniform float uFadeStrength;
    uniform float uFadeFrom;
    uniform vec3 uCameraPos;
    uniform vec3 uOrigin;
    uniform vec3 uColor;

    varying vec3 vWorldPos;

    void main() {
      // Blend between origin and camera as reference point
      vec3 refPos = mix(uOrigin, uCameraPos, uFadeFrom);
      float dist = distance(vWorldPos, refPos);

      // Map distance to 0–1, then shape it like Grid fadeStrength
      float t = clamp(1.0 - dist / uFadeDistance, 0.0, 1.0);
      t = pow(t, uFadeStrength);

      vec3 color = uColor;
      gl_FragColor = vec4(color, t);
      if (gl_FragColor.a <= 0.001) discard;
    }
  `,
);

extend({ FadingTextMaterial });
