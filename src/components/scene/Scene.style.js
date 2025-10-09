import styled from "styled-components";

const style = (Component) => styled(Component)`
  .checkpoint-label {
    background: ${(props) => props.theme.colors.light["--color-text"]}66;
    color: ${(props) => props.theme.colors.light["--color-background"]};
    padding: 6px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: ${(props) => props.theme.font.weights["--font-weight-light"]};
    line-height: 1.2;
    letter-spacing: 1.5px;
    white-space: nowrap;
    user-select: none;
    pointer-events: none;
    opacity: 1;
  }
`;

export default style;
