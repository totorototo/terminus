import { rgba } from "polished";
import styled from "styled-components";

const style = (Component) => styled(Component)`
  display: block;
  padding-bottom: clamp(6rem, 20vh, 10rem);

  .footer {
    margin-top: 3rem;
    text-align: center;
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: 0.6875rem;
    letter-spacing: 0.04em;
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.4,
      )};
  }

  .actions {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .action-btn {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    background: none;
    border: 1px solid
      ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-text"],
          0.15,
        )};
    border-radius: ${(props) =>
      props.theme.borderRadius["--border-radius-base"]};
    padding: 0.75rem 1.25rem;
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text"]};
    cursor: pointer;
    transition: all ${(props) => props.theme.transitions["--transition-base"]};

    &:hover:not(:disabled) {
      border-color: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-primary"],
          0.4,
        )};
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-primary"]};
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    &.danger:hover:not(:disabled) {
      border-color: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-accent"],
          0.5,
        )};
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-accent-text"]};
    }
  }

  .room-id {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1.25rem;
    min-height: 44px;
    background: none;
    border: none;
    cursor: pointer;
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    color: inherit;

    &:hover .room-id-value {
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-primary"]};
    }
  }

  .room-id-label {
    font-size: ${(props) => props.theme.font.sizes["--font-size-xxsmall"]};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.4,
      )};
  }

  .room-id-value {
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text"]};
    transition: color ${(props) => props.theme.transitions["--transition-base"]};
  }

  .room-id-copied {
    font-size: ${(props) => props.theme.font.sizes["--font-size-xxsmall"]};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-primary"]};
  }

  .confirm-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
  }

  .confirm-btn {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    background: none;
    border: 1px solid
      ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-text"],
          0.2,
        )};
    border-radius: ${(props) =>
      props.theme.borderRadius["--border-radius-base"]};
    padding: 0.5rem 0.875rem;
    cursor: pointer;
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text"]};

    &.danger {
      border-color: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-accent"],
          0.5,
        )};
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-accent-text"]};
    }
  }
`;

export default style;
