import { rgba } from "polished";
import styled from "styled-components";

const style = (Component) => styled(Component)`
  display: block;

  .lede {
    font-size: ${(props) => props.theme.font.sizes["--font-size-medium"]};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text-muted"]};
    max-width: 34ch;
    margin: 0 0 3rem;
  }

  .chart-frame {
    padding: 2rem 1.5rem;
    border-radius: ${(props) => props.theme.borderRadius["--border-radius-lg"]};
    border: 1px solid
      ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-text"],
          0.08,
        )};
    margin-bottom: 1.5rem;
  }

  .plan-model {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-medium"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text"]};
    margin: 0;
  }

  .text-btn {
    min-height: 44px;
    padding: 0;
    background: none;
    border: 0;
    font: inherit;
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-primary-text"]};
    text-decoration: underline;
    cursor: pointer;
  }

  .plan-error {
    margin: 0.5rem 0 0;
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-accent-text"]};
  }

  .picker-label {
    display: block;
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text-muted"]};
    margin: 1.25rem 0 0.5rem;

    &:first-of-type {
      margin-top: 0;
    }
  }

  .synced-note {
    margin: 1rem 0 0;
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text-muted"]};
  }
`;

export default style;
