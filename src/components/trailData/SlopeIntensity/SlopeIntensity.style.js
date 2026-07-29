import { rgba } from "polished";
import styled from "styled-components";

const legendGap = (props) => `${props.theme.spacing[2]}px`;
const dotSize = (props) => `${props.theme.spacing[3]}px`;

const style = (Component) => styled(Component)`
  width: 100%;

  .si-strip {
    display: block;
    border-radius: ${(props) => props.theme.borderRadius["--border-radius-sm"]};
    overflow: hidden;
  }

  .si-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 0.75rem;
    margin-top: 0.6rem;
  }

  .si-legend-item {
    display: flex;
    align-items: center;
    gap: ${legendGap};
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-xxsmall"]};
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.5,
      )};
    letter-spacing: 0.04em;
  }

  .si-legend-dot {
    display: inline-block;
    width: ${dotSize};
    height: ${dotSize};
    border-radius: ${(props) =>
      props.theme.borderRadius["--border-radius-full"]};
    flex-shrink: 0;
  }
`;

export default style;
