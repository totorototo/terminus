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

  .dn-horizon-line {
    stroke: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.15,
      )};
    stroke-dasharray: 2 3;
  }

  .dn-day-area {
    fill: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-primary"],
        0.4,
      )};
  }

  .dn-night-area {
    fill: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-secondary"],
        0.4,
      )};
  }

  .dn-done-mask {
    fill: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-background"]};
    opacity: 0.78;
  }

  .dn-overlay {
    position: absolute;
    inset: ${overlayInset};
    pointer-events: none;
  }

  .dn-label {
    position: absolute;
    left: ${labelInset};
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-xxsmall"]};
    letter-spacing: 0.04em;
    line-height: 1;
  }

  .dn-label--day {
    top: ${labelInset};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-primary-text"]};
  }

  .dn-label--night {
    bottom: ${labelInset};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-secondary-text"]};
  }
`;

export default style;
