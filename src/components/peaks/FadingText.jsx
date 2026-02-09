import { Text } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { FadingTextMaterial } from "./shader.js";

function FadingText({
  fadeDistance = 1,
  fadeStrength = 5,
  fadeFrom = 1,
  color = "white",
  ...props
}) {
  const matRef = useRef();
  const { camera } = useThree();

  const { children, ...rest } = props;

  useFrame(() => {
    if (!matRef.current) return;
    matRef.current.uCameraPos.copy(camera.position);
  });

  return (
    <Text {...rest}>
      <fadingTextMaterial
        ref={matRef}
        transparent
        depthWrite={false}
        uFadeDistance={fadeDistance}
        uFadeStrength={fadeStrength}
        uFadeFrom={fadeFrom}
        uColor={new THREE.Color(color)}
      />
      {children}
    </Text>
  );
}

export default FadingText;
