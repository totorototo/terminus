import { useMemo, useRef } from "react";

import { Text } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

function FadingText({
  fadeDistance = 20,
  fadeStrength = 2,
  fadeFrom = 1,
  color = "white",
  children,
  ...props
}) {
  const { camera } = useThree();

  // 1. Créer les uniforms de façon persistante (ref = mutable by design)
  const uniformsRef = useRef({
    uFadeDistance: { value: fadeDistance },
    uFadeStrength: { value: fadeStrength },
    uFadeFrom: { value: fadeFrom },
    uCameraPos: { value: new THREE.Vector3() },
    uOrigin: { value: new THREE.Vector3(0, 0, 0) },
  });

  // 2. Mettre à jour les uniforms à chaque frame
  useFrame(() => {
    uniformsRef.current.uCameraPos.value.copy(camera.position);
    uniformsRef.current.uFadeDistance.value = fadeDistance;
    uniformsRef.current.uFadeStrength.value = fadeStrength;
    uniformsRef.current.uFadeFrom.value = fadeFrom;
  });

  // 3. Créer le matériau de base que Text va "Troika-fier"
  // On utilise onBeforeCompile ici, c'est la méthode recommandée par Troika
  const customMaterial = useMemo(() => {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true });

    mat.onBeforeCompile = (shader) => {
      shader.uniforms = { ...shader.uniforms, ...uniformsRef.current };

      shader.vertexShader = `
        varying vec3 vWorldPosFade;
        ${shader.vertexShader}
      `.replace(
        `#include <worldpos_vertex>`,
        `#include <worldpos_vertex>
         vWorldPosFade = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
      );

      shader.fragmentShader = `
        uniform float uFadeDistance;
        uniform float uFadeStrength;
        uniform float uFadeFrom;
        uniform vec3 uCameraPos;
        uniform vec3 uOrigin;
        varying vec3 vWorldPosFade;
        ${shader.fragmentShader}
      `
        .replace(
          `void main() {`,
          `void main() {
          vec3 refPos = mix(uOrigin, uCameraPos, uFadeFrom);
          float dist = distance(vWorldPosFade, refPos);
          float fade = clamp(1.0 - dist / uFadeDistance, 0.0, 1.0);
          fade = pow(fade, uFadeStrength);`,
        )
        .replace(
          `#include <dithering_fragment>`,
          `#include <dithering_fragment>
         gl_FragColor.a *= fade;
         if (gl_FragColor.a < 0.001) discard;`,
        );
    };
    return mat;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [color]); // On ne recrée le matériau que si la couleur change

  return (
    <Text {...props} material={customMaterial}>
      {children}
    </Text>
  );
}

export default FadingText;
