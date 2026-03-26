import { useEffect, useMemo, useRef } from "react";

import { Billboard, Text } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { mix } from "polished";
import { useTheme } from "styled-components";
import { Color } from "three";

import { transformCoordinates } from "../../utils/coordinateTransforms.js";

const BLINK_DURATION = 5; // seconds per cycle
const BLINK_FREQ = 3; // oscillations per second

function OffCourseEffect({
  isOffCourse,
  deviationDistance,
  projectedLocation,
  coordinateScales,
}) {
  const { scene, clock } = useThree();
  const theme = useTheme();

  const bgColor = theme.colors[theme.currentVariant]["--color-background"];
  const primaryColor = theme.colors[theme.currentVariant]["--color-secondary"];
  const bgOffCourse = mix(0.25, primaryColor, bgColor);

  const prevOffCourse = useRef(false);
  const blinkStart = useRef(null);
  const normalColor = useMemo(() => new Color(bgColor), [bgColor]);
  const warnColor = useMemo(() => new Color(bgOffCourse), [bgOffCourse]);

  const labelPos = useMemo(() => {
    if (!projectedLocation?.coords?.length || !coordinateScales) return null;
    const pos = transformCoordinates(
      [projectedLocation.coords],
      coordinateScales,
      projectedLocation.index,
    )?.[0];
    return pos ? [pos[0], pos[1] + 0.3, pos[2]] : null;
  }, [projectedLocation, coordinateScales]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    scene.background = new Color(bgColor);
  }, [scene, bgColor]);

  useFrame(() => {
    // Detect rising edge → trigger blink sequence
    if (isOffCourse && !prevOffCourse.current) {
      blinkStart.current = clock.elapsedTime;
    }
    prevOffCourse.current = isOffCourse;

    if (blinkStart.current !== null) {
      const elapsed = clock.elapsedTime - blinkStart.current;
      if (elapsed < BLINK_DURATION) {
        const envelope = 1 - elapsed / BLINK_DURATION;
        const blink = Math.abs(Math.sin(elapsed * BLINK_FREQ * Math.PI));
        scene.background.copy(normalColor).lerp(warnColor, blink * envelope);
      } else {
        blinkStart.current = null;
        scene.background.copy(normalColor);
      }
    }
  });

  if (!isOffCourse || !labelPos || deviationDistance === 0) return null;

  return (
    <Billboard position={labelPos}>
      <Text
        fontSize={0.06}
        color={primaryColor}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.003}
        outlineColor={bgColor}
      >
        {`${Math.round(deviationDistance / 1000).toFixed(1)}km off trail`}
      </Text>
    </Billboard>
  );
}

export default OffCourseEffect;
