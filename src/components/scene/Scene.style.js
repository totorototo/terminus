import styled from "styled-components";

const style = (Component) => styled(Component)`
  .checkpoint-label {
    background: rgba(255, 255, 255, 0.4);
    color: #333333;
    padding: 6px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 300;
    line-height: 1.2;
    letter-spacing: 1.5px;
    white-space: nowrap;
    user-select: none;
    pointer-events: none;
    opacity: 0.5;
  }
`;

export default style;
