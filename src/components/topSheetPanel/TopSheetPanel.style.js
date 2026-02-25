import { lighten, rgba } from "polished";
import styled from "styled-components";

const style = (Component) => styled(Component)`
  opacity: 0.8;
  background: ${({ theme }) =>
    lighten(0.1, theme.colors.dark["--color-background"])};
  overflow: hidden;
  border-radius: ${({ theme }) => theme.borderRadius["--border-radius-lg"]};
  border: 1px solid #2d2c2cff;
  cursor: ns-resize;
  user-select: none;
  touch-action: none;
  position: absolute;
  top: calc(0.1rem + env(safe-area-inset-top));
  left: 50%;
  width: 96vw;
  max-width: 600px;
  transform: translateX(-50%);
  margin-left: calc(env(safe-area-inset-left) - env(safe-area-inset-right));
  box-shadow: 0 4px 8px
    ${({ theme }) => rgba(theme.colors.dark["--color-background"], 0.1)};
  z-index: ${({ theme }) => theme.zIndex["--z-index-modal"]};
  container-type: size;

  /* Drag handle indicator at bottom (visible when collapsed) */
  &::after {
    content: "";
    position: absolute;
    bottom: 8px;
    left: 50%;
    transform: translateX(-50%);
    width: 40px;
    height: 4px;
    background-color: ${({ theme }) => theme.colors.dark["--color-text"]};
    opacity: 0.3;
    border-radius: ${({ theme }) => theme.borderRadius["--border-radius-xs"]};
    z-index: 1;
  }
`;

export default style;
