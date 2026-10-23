import { rgba } from "polished";
import styled from "styled-components";

import { layout, space } from "../../../theme/space.js";

const style = (Component) => styled(Component)`
  display: flex;
  flex-direction: column;
  min-height: 92vh;
  justify-content: center;
  padding: ${layout("section-block")}
    ${(props) => props.theme.layout["--gutter"]};

  .eyebrow {
    display: block;
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-tiny"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.85,
      )};
    margin-bottom: ${space(4)};
  }

  .name {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: clamp(2.75rem, 11vw, 7rem);
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    letter-spacing: -0.04em;
    line-height: 0.98;
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text"]};
    margin: 0 0 ${space(10)};
    max-width: 20ch;
  }

  .stat-row {
    display: flex;
    flex-wrap: wrap;
    gap: ${layout("stat-gap")};
  }

  .stat {
    display: flex;
    flex-direction: column;
  }

  .stat-value {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: clamp(1.75rem, 4vw, 2.5rem);
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    letter-spacing: -0.02em;
    line-height: 1;
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-primary-text"]};
  }

  .stat-label {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-top: ${space(2)};
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.85,
      )};
  }

  .clock {
    display: flex;
    align-items: baseline;
    gap: ${space(3)};
    margin-top: ${space(12)};
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
  }

  .clock-label {
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.85,
      )};
  }

  .clock-value {
    font-size: ${(props) => props.theme.font.sizes["--font-size-medium"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text"]};
  }

  .build-number {
    display: block;
    margin-top: ${space(6)};
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: 0.6875rem;
    letter-spacing: 0.04em;
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.85,
      )};
  }
`;

export default style;
