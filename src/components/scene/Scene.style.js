import styled from "styled-components";

const style = (Component) => styled(Component)`
  .checkpoint-label {
    background: rgba(255, 255, 255, 0.9);
    color: #262424ff;
    padding: 8px 12px;
    border-radius: 4px;
    border: 1px solid #808080;
    font-size: 12px;
    font-weight: 100;
    line-height: 1.2;
    letter-spacing: 1.5px;
    white-space: nowrap;
    user-select: none;
    pointer-events: none;
    opacity: 0.8;
  }
`;

export default style;
