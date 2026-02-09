import { Text } from "@react-three/drei";
import { useTheme } from "styled-components";
import { Billboard } from "@react-three/drei";

function Marker({ children, position, ...props }) {
  const theme = useTheme();

  return (
    <Billboard position={position}>
      <Text
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
    </Billboard>
  );
}

export default Marker;
