import { rgba } from "polished";
import styled from "styled-components";

const labelInset = (props) => `${props.theme.spacing[1]}px`;
const overlayInset = (props) => `-${props.theme.spacing[2]}px 0`;

const style = (Component) => styled(Component)`
  width: 100%;
  position: relative;

  svg {
    display: block;
    overflow: visible;
  }

  .sp-zero-line {
    stroke: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.15,
      )};
    stroke-dasharray: 2 3;
  }

  .sp-climb-area {
    fill: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-primary"],
        0.4,
      )};
  }

  .sp-descent-area {
    fill: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-secondary"],
        0.4,
      )};
  }

  .sp-done-mask {
    fill: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-background"]};
    opacity: 0.78;
  }

  .sp-overlay {
    position: absolute;
    inset: ${overlayInset};
    pointer-events: none;
  }

  .sp-label {
    position: absolute;
    left: ${labelInset};
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-xxsmall"]};
    letter-spacing: 0.04em;
    line-height: 1;
  }

  .sp-label--climb {
    top: ${labelInset};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-primary-text"]};
  }

  .sp-label--descent {
    bottom: ${labelInset};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-secondary-text"]};
  }
`;

export default style;
