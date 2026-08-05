import { rgba } from "polished";
import styled from "styled-components";

const style = (Component) => styled(Component)`
  display: block;

  .lede {
    font-size: ${(props) => props.theme.font.sizes["--font-size-medium"]};
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.65,
      )};
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

  .picker-label {
    display: block;
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.8,
      )};
    margin: 1.25rem 0 0.5rem;

    &:first-of-type {
      margin-top: 0;
    }
  }

  .profile-picker {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .profile-btn {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    min-height: 44px;
    padding: 0.5rem 1rem;
    border-radius: ${(props) =>
      props.theme.borderRadius["--border-radius-base"]};
    border: 1px solid
      ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-text"],
          0.15,
        )};
    background: none;
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.65,
      )};
    cursor: pointer;
    transition: all ${(props) => props.theme.transitions["--transition-base"]};

    &.active {
      border-color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-secondary"]};
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-secondary"]};
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }

  .synced-note {
    margin: 1rem 0 0;
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.45,
      )};
  }
`;

export default style;
