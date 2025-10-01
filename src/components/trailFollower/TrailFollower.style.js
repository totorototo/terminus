import styled from "styled-components";

const style = (Component) => styled(Component)`
  .index-label {
    pointer-events: none;
    user-select: none;
    font-size: 12px;
    font-weight: bold;
    color: white;
    background: rgba(0, 0, 0, 1);
    padding: 4px 8px;
    border-radius: 4px;
    text-align: center;
    min-width: 40px;
  }
`;

export default style;
