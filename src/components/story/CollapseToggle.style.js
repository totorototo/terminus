import { rgba } from "polished";
import styled from "styled-components";

const style = (Component) => styled(Component)`
  display: block;
  width: 100%;
  min-height: 44px;
  margin-top: 1rem;
  background: none;
  border: 1px dashed
    ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.2,
      )};
  border-radius: ${(props) => props.theme.borderRadius["--border-radius-base"]};
  font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
  font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
  letter-spacing: 0.05em;
  color: ${(props) =>
    rgba(props.theme.colors[props.theme.currentVariant]["--color-text"], 0.85)};
  cursor: pointer;
  transition: all ${(props) => props.theme.transitions["--transition-base"]};

  &:hover {
    border-style: solid;
    border-color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.4,
      )};
  }
`;

export default style;
