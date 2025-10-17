import React, { Fragment, useMemo, useRef, useState } from "react";
import ElevationProfile from "../elevationProfile/ElevationProfile";
import { Text, Billboard } from "@react-three/drei";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import style from "./ThreeDimensionalProfile.style.js";
import useStore from "../../store/store.js";
import { useTheme } from "styled-components";
import {
  transformSections,
  createCheckpoints,
} from "../../utils/coordinateTransforms.js";

const Marker = React.memo(function Marker({ children, position, ...props }) {
  const ref = useRef();
  const textRef = useRef();
  const theme = useTheme();

  const [isOccluded, setOccluded] = useState(false);
  const [isInRange, setInRange] = useState(false);
  const isVisible = isInRange && !isOccluded;

  const vec = new THREE.Vector3();
  const raycaster = new THREE.Raycaster();

  useFrame((state) => {
    if (!ref.current || !textRef.current) return;

    // Manual billboard behavior - always face camera
    textRef.current.lookAt(state.camera.position);

    // Check distance range
    const distance = state.camera.position.distanceTo(
      ref.current.getWorldPosition(vec),
    );
    const range = distance <= 10;
    if (range !== isInRange) setInRange(range);

    // Check occlusion with simple raycasting
    const worldPos = ref.current.getWorldPosition(vec);
    const direction = worldPos.clone().sub(state.camera.position).normalize();
    raycaster.set(state.camera.position, direction);

    // Simple occlusion check - you might want to make this more sophisticated
    const intersects = raycaster.intersectObjects(state.scene.children, true);
    const occluded =
      intersects.length > 0 && intersects[0].distance < distance - 0.1;
    if (occluded !== isOccluded) setOccluded(occluded);

    // Update text opacity and scale based on visibility
    if (textRef.current.material) {
      textRef.current.material.opacity = isVisible ? 1 : 0;
      textRef.current.scale.setScalar(isVisible ? 1 : 0.25);
    }
  });

  return (
    <group ref={ref} position={position}>
      <Text
        ref={textRef}
        fontSize={0.04}
        color={theme.colors.dark["--color-text"]}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.001}
        outlineColor={theme.colors.dark["--color-background"]}
        {...props}
      >
        {children}
      </Text>
    </group>
  );
});

function ThreeDimensionalProfile({
  selectedSectionIndex,
  setSelectedSectionIndex,
  showSlopeColors,
  coordinateScales,
}) {
  // reuse stable handlers per section id to avoid creating new functions each render
  const handlersRef = useRef(new Map());
  const getHandler = (id) => {
    const map = handlersRef.current;
    if (!map.has(id)) map.set(id, () => setSelectedSectionIndex(id));
    return map.get(id);
  };
  const sections = useStore((state) => state.gps.sections);
  const coordinates = useStore((state) => state.gps.data);
  const slopes = useStore((state) => state.gps.slopes);

  // Memoize transformed data for performance
  const { sectionsPoints3D, checkpointsPoints3D } = useMemo(() => {
    // Transform sections to 3D using provided scales
    const sectionsPoints3D = transformSections(sections, coordinateScales);

    // Create checkpoints from sections using provided scales
    const checkpointsPoints3D = createCheckpoints(sections, coordinateScales);

    return {
      sectionsPoints3D,
      checkpointsPoints3D,
    };
  }, [sections, coordinateScales]);

  // Memoize the rendered section components so we only rebuild them when
  // the underlying section data or relevant props change.
  const sectionElements = useMemo(() => {
    if (!sectionsPoints3D || sectionsPoints3D.length === 0) return null;
    return sectionsPoints3D.map(({ points, id }, idx) => (
      <Fragment key={id}>
        <ElevationProfile
          key={id}
          points={points}
          color={`hsl(${(id / sectionsPoints3D.length) * 360}, 100%, 50%)`}
          onClick={getHandler(id)}
          selected={selectedSectionIndex === id}
          showSlopeColors={showSlopeColors}
          slopes={slopes}
        />
      </Fragment>
    ));
  }, [
    sectionsPoints3D,
    selectedSectionIndex,
    showSlopeColors,
    slopes,
    setSelectedSectionIndex,
  ]);

  // Markers are independent of each section — render them once, memoized.
  const markerElements = useMemo(() => {
    if (!checkpointsPoints3D || checkpointsPoints3D.length === 0) return null;
    return checkpointsPoints3D.map((cp, index) => (
      <Marker
        key={cp.name || index}
        position={[cp.point3D[0], cp.point3D[1] + 0.2, cp.point3D[2]]}
      >
        {cp.name}
      </Marker>
    ));
  }, [checkpointsPoints3D]);

  return (
    <>
      {sectionElements}
      {markerElements}
    </>
  );
}

export default style(ThreeDimensionalProfile);
