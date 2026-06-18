import styled from "styled-components";

const style = (Component) => styled(Component)`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;

  .lazy-panel-placeholder {
    width: 100%;
    height: 100%;
    border-radius: var(--border-radius-md);
    background: var(--color-surface);
    opacity: 0.4;
  }
`;

export default style;
