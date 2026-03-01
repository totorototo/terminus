import { useMemo } from "react";

import { Text } from "@react-three/drei";
import { Billboard } from "@react-three/drei";
import { useTheme } from "styled-components";

function Marker({ children, position, ...props }) {
  const theme = useTheme();
  const palette = theme.colors[theme.currentVariant];
  const textColor = useMemo(() => palette["--color-text"], [palette]);
  const outlineColor = useMemo(() => palette["--color-background"], [palette]);

  return (
    <Billboard position={position}>
      <Text
        fontSize={0.04}
        color={textColor}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.001}
        outlineColor={outlineColor}
        {...props}
      >
        {children}
      </Text>
    </Billboard>
  );
}

export default Marker;
