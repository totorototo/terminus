import styled from "styled-components";

const style = (Component) => styled(Component)`
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  pointer-events: none;
  max-width: 600px;
  color: ${(props) => props.theme.colors.dark["--color-text"]};
  opacity: 0.8;
  line-height: 1.2;
  font-size: 15px;
  letter-spacing: 1.5px;
  user-select: none;

  h1 {
    pointer-events: none;
    color: white;
    font-size: 2em;
    font-weight: 100;
    line-height: 1em;
    margin: 0;
    margin-bottom: 0.25em;
  }
`;
export default style;
