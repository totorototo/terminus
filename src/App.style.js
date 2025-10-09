import styled from "styled-components";

const style = (Component) => styled(Component)`
  background-color: var(--color-background);
  color: var(--color-text);
  width: 100%;
  min-height: 100%;
  position: relative;
`;

export default style;
