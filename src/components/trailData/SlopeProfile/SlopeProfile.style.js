import { rgba } from "polished";
import styled from "styled-components";

const labelInset = (props) => `${props.theme.space["--space-hair"]}`;
const overlayInset = (props) => `-${props.theme.space["--space-1"]} 0`;

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

  /* why: the effort chart in the terrain mauve — climbs on effort-4,
     descents on effort-1, so harder reads as more contrast and direction
     never borrows the brand gold or the ahead sage. */
  .sp-climb-area {
    fill: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-effort-4"]};
  }

  .sp-descent-area {
    fill: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-effort-1"]};
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
      props.theme.colors[props.theme.currentVariant]["--color-effort-4"]};
  }

  /* effort-1 fails 4.5:1 as text; effort-3 is the lightest step that holds. */
  .sp-label--descent {
    bottom: ${labelInset};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-effort-3"]};
  }
`;

export default style;
