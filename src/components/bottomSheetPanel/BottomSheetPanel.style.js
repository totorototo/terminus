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
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);

  .drag-handle {
    width: 100%;
    height: 40px;
    cursor: grab;
    touch-action: none;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    &:active {
      cursor: grabbing;
    }

    &::before {
      content: "";
      width: 40px;
      height: 1px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 2px;
    }
  }

  .content {
    flex: 1;
    width: 100%;
    overflow-y: auto;
    touch-action: auto;
  }
`;

export default style;
