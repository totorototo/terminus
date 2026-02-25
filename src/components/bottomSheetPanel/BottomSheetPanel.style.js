import { rgba } from "polished";
import styled from "styled-components";
import { glassMorphism } from "../../theme/mixins";

const style = (Component) => styled(Component)`
  z-index: ${({ theme }) => theme.zIndex["--z-index-modal"]};
  position: fixed;
  opacity: 0.9;
  overflow: hidden;
  border-radius: ${({ theme }) => theme.borderRadius["--border-radius-lg"]};
  touch-action: pan-x;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  margin-left: calc(env(safe-area-inset-left) - env(safe-area-inset-right));
  padding-bottom: env(safe-area-inset-bottom);

  ${glassMorphism}
  border: 1px solid
    ${({ theme }) => rgba(theme.colors.dark["--color-text"], 0.12)};

  color: ${({ theme }) => theme.colors.dark["--color-text"]};
  line-height: 1.2;
  user-select: none;

  /* Radial gradient at top */
  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 60%;
    height: 60px;
    background: radial-gradient(
      ellipse at center top,
      ${({ theme }) => rgba(theme.colors.dark["--color-primary"], 0.05)} 0%,
      transparent 100%
    );
    pointer-events: none;
    border-radius: ${({ theme }) => theme.borderRadius["--border-radius-xl"]}
      ${({ theme }) => theme.borderRadius["--border-radius-xl"]} 0 0;
  }

  /* Drag handle indicator */
  &::after {
    content: "";
    position: absolute;
    top: 8px;
    left: 50%;
    transform: translateX(-50%);
    width: 40px;
    height: 4px;
    background-color: ${({ theme }) => theme.colors.dark["--color-text"]};
    opacity: 0.3;
    border-radius: ${({ theme }) => theme.borderRadius["--border-radius-xs"]};
    z-index: 1;
  }

  /* Add padding to accommodate drag handle */
  // padding-top: 12px;
`;

export default style;
