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
`;

export default style;
