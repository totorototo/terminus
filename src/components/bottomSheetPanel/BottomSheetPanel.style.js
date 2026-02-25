import { rgba } from "polished";
import styled from "styled-components";

const style = (Component) => styled(Component)`
  z-index: 1000;
  position: fixed;
  opacity: 0.9;
  overflow: hidden;
  border-radius: 24px;
  touch-action: pan-x;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  margin-left: calc(env(safe-area-inset-left) - env(safe-area-inset-right));
  padding-bottom: env(safe-area-inset-bottom);

  /* Glassmorphism effect */
  background: ${({ theme }) => rgba(theme.colors.dark["--color-surface"], 0.8)};
  backdrop-filter: blur(10px);
  border: 1px solid
    ${({ theme }) => rgba(theme.colors.dark["--color-text"], 0.12)};
  box-shadow: 0 8px 32px 0
    ${({ theme }) => rgba(theme.colors.dark["--color-background"], 0.1)};

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
    border-radius: 1.75rem 1.75rem 0 0;
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
    border-radius: 2px;
    z-index: 1;
  }

  /* Add padding to accommodate drag handle */
  // padding-top: 12px;
`;

export default style;
