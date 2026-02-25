import styled from "styled-components";

const style = (Component) => styled(Component)`
  z-index: ${(props) => props.theme.zIndex["--z-index-overlay"]};
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  pointer-events: none;
  max-width: 600px;
  color: ${(props) => props.theme.colors.dark["--color-text"]};
  opacity: 0.8;
  line-height: 1.2;
  font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
  letter-spacing: 1.5px;
  user-select: none;

  h1 {
    pointer-events: none;
    color: ${(props) => props.theme.colors.dark["--color-text"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-xlarge"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-light"]};
    line-height: 1em;
    margin: 0;
    margin-bottom: 0.25em;
  }
`;
export default style;
