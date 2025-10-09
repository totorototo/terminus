import styled from "styled-components";
import { lighten } from "polished";

const style = (Component) => styled(Component)`
  opacity: 0.8;
  background: ${({ theme }) => lighten(0.1, theme.colors.dark["--color-background"])};
  overflow: hidden;
  border-radius: 24px;
  border: 1px solid #2d2c2cff;
  cursor: ns-resize;
  user-select: none;
  touch-action: none;
  position: absolute;
  top: 20px;
  left: 50%;
  width: 96vw;
  max-width: 600px;
  transform: translateX(-50%);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  container-type: size;otto
`;

export default style;
