import styled from "styled-components";

const style = (Component) => styled(Component)`
  z-index: 10;
  display: flex;
  padding-top: 2rem;
  padding-left: 1rem;
  padding-right: 1rem;
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-around;
  width: 100%;
  height: 20rem;

  pointer-events: none;

  color: ${(props) => props.theme.colors.dark["--color-text"]};
  line-height: 1.2;
  font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
  letter-spacing: 1.5px;
  user-select: none;

  .item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
  }

  .value {
    font-size: ${(props) => props.theme.font.sizes["--font-size-medium"]};
    color: ${(props) => props.theme.colors.dark["--color-text"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
  }
`;

export default style;
