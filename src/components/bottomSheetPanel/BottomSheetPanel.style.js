import styled from "styled-components";
import { lighten } from "polished";

const style = (Component) => styled(Component)`
  z-index: 1000;
  position: fixed;
  opacity: 0.9;
  overflow: hidden;
  background: ${({ theme }) =>
    lighten(0.1, theme.colors.dark["--color-background"])};
  border-radius: 24px;
  color: #222;
  touch-action: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  margin-left: calc(env(safe-area-inset-left) - env(safe-area-inset-right));
  padding-bottom: env(safe-area-inset-bottom);

  /* Drag handle indicator */
  &::before {
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
  padding-top: 12px;
`;

export default style;
