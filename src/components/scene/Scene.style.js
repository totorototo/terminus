import styled from "styled-components";

const style = (Component) => styled(Component)`
  .checkpoint-label {
    background: rgba(82, 81, 81, 0.93);
    color: #a0a0a0;
    padding: 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 300;
    line-height: 1.2;
    letter-spacing: 1.5px;
    white-space: nowrap;
    user-select: none;
    pointer-events: none;
    opacity: 0.8;
  }
`;

export default style;
