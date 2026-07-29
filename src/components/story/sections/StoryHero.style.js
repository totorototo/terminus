import { rgba } from "polished";
import styled from "styled-components";

const style = (Component) => styled(Component)`
  display: flex;
  flex-direction: column;
  min-height: 92vh;
  justify-content: center;
  padding: clamp(4rem, 14vh, 7rem) clamp(1.25rem, 6vw, 4rem);

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
    margin-bottom: 1rem;
  }

  .name {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: clamp(2.75rem, 11vw, 7rem);
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    letter-spacing: -0.04em;
    line-height: 0.98;
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text"]};
    margin: 0 0 2.5rem;
    max-width: 20ch;
  }

  .stat-row {
    display: flex;
    flex-wrap: wrap;
    gap: clamp(1.5rem, 5vw, 3.5rem);
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
    margin-top: 0.375rem;
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.85,
      )};
  }

  .clock {
    display: flex;
    align-items: baseline;
    gap: 0.625rem;
    margin-top: 3rem;
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
`;

export default style;
