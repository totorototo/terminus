import styled from "styled-components";

const style = (Component) => styled(Component)`
  .checkpoint-label {
    background-color: grey;
    padding: 2px 5px;
    border-radius: 3px;
    border: 1px solid #ccc;
    font-size: 12px;
    white-space: nowrap;
  }
`;

export default style;
