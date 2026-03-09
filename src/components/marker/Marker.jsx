import { Suspense, useMemo } from "react";

import { Billboard, Svg, Text } from "@react-three/drei";
import { useTheme } from "styled-components";

const ICON_URL = {
  TimeBarrier: "/icons/clock.svg",
  LifeBase: "/icons/tent.svg",
};

const ICON_SIZE = 0.04; // world units, matches default fontSize
const ICON_GAP = 0.024; // gap between icon right edge and text left edge
const ICON_SCALE = ICON_SIZE / 24; // SVG viewBox is 24×24

// Drei's Svg applies scale=[1,-1,1] internally (SVG→Three.js Y-flip).
// After that flip + our scale, the content spans (0→ICON_SIZE, 0→-ICON_SIZE).
// We shift by (-size/2, +size/2) to center it at local origin.
const ICON_OFFSET = [-ICON_SIZE / 2, ICON_SIZE / 2, 0];

function IconSvg({ url, color }) {
  return (
    <Svg
      src={url}
      scale={ICON_SCALE}
      position={ICON_OFFSET}
      skipFill
      strokeMaterial={{ color }}
    />
  );
}

function Marker({ children, position, wptType, ...props }) {
  const theme = useTheme();
  const palette = theme.colors[theme.currentVariant];
  const textColor = useMemo(() => palette["--color-text"], [palette]);
  const outlineColor = useMemo(() => palette["--color-background"], [palette]);

  const iconUrl = ICON_URL[wptType] ?? null;

  // Icon center sits left of the text; text (anchorX="left") starts at x=0.
  // Icon right edge: iconCenterX + ICON_SIZE/2 = -ICON_GAP → gap before text.
  const iconCenterX = -(ICON_SIZE / 2 + ICON_GAP);

  return (
    <Billboard position={position}>
      {iconUrl && (
        <Suspense fallback={null}>
          <group position={[iconCenterX, 0, 0]}>
            <IconSvg url={iconUrl} color={textColor} />
          </group>
        </Suspense>
      )}
      <Text
        fontSize={0.04}
        color={textColor}
        anchorY="middle"
        outlineWidth={0.001}
        outlineColor={outlineColor}
        {...props}
        anchorX={iconUrl ? "left" : "center"}
      >
        {children}
      </Text>
    </Billboard>
  );
}

export default Marker;
