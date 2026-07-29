import { rgba } from "polished";
import styled from "styled-components";

const style = (Component) => styled(Component)`
  width: 100%;
  display: block;

  .sp-strip {
    display: block;
    border-radius: ${(props) => props.theme.borderRadius["--border-radius-sm"]};
    overflow: hidden;
  }

  .sp-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 0.75rem;
    margin-top: 0.5rem;
  }

  .sp-legend-item {
    display: flex;
    align-items: center;
    gap: 3px;
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-xxsmall"]};
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.4,
      )};
    text-transform: uppercase;
  }

  .sp-legend-swatch {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: ${(props) =>
      props.theme.borderRadius["--border-radius-full"]};
    flex-shrink: 0;
  }
`;

export default style;
