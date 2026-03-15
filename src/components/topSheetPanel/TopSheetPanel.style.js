import { rgba } from "polished";
import styled from "styled-components";
import { glassMorphism } from "../../theme/mixins";

const style = (Component) => styled(Component)`
  opacity: 0.9;
  overflow: hidden;
  border-radius: ${({ theme }) => theme.borderRadius["--border-radius-lg"]};
  ${glassMorphism}
  border: 1px solid
    ${({ theme }) =>
    rgba(theme.colors[theme.currentVariant]["--color-text"], 0.12)};
  cursor: ${({ locked }) => (locked ? "default" : "ns-resize")};
  user-select: none;
  touch-action: none;
  position: absolute;
  top: calc(0.1rem + env(safe-area-inset-top));

  @media (hover: hover) and (pointer: fine) {
    top: 1.5rem;
  }
  left: 50%;
  width: 96vw;
  max-width: 600px;
  transform: translateX(-50%);
  margin-left: calc(env(safe-area-inset-left) - env(safe-area-inset-right));
  z-index: ${({ theme }) => theme.zIndex["--z-index-modal"]};
  container-type: size;

  /* Drag handle indicator at bottom (hidden when locked) */
  &::after {
    content: "";
    position: absolute;
    bottom: 8px;
    left: 50%;
    transform: translateX(-50%);
    width: 40px;
    height: 4px;
    background-color: ${({ theme }) =>
      theme.colors[theme.currentVariant]["--color-text"]};
    opacity: ${({ locked }) => (locked ? 0 : 0.3)};
    border-radius: ${({ theme }) => theme.borderRadius["--border-radius-xs"]};
    z-index: 1;
  }
`;

export default style;
