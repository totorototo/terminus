import { Text } from "@react-three/drei";
import { Billboard } from "@react-three/drei";
import { useTheme } from "styled-components";

function Marker({ children, position, ...props }) {
  const theme = useTheme();

  return (
    <Billboard position={position}>
      <Text
        fontSize={0.04}
        color={theme.colors[theme.currentVariant]["--color-text"]}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.001}
        outlineColor={theme.colors[theme.currentVariant]["--color-background"]}
        {...props}
      >
        {children}
      </Text>
    </Billboard>
  );
}

export default Marker;
