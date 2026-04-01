import { rgba } from "polished";
import styled from "styled-components";

const style = (Component) => styled(Component)`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding: 0 0.75rem;
  overflow: hidden;

  .actions-header {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding-bottom: 0.4rem;
    border-bottom: 1px solid
      ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-text"],
          0.07,
        )};
    margin-bottom: 0.5rem;
    flex-shrink: 0;
  }

  .header-label {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-tiny"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.35,
      )};
    letter-spacing: 1.5px;
    text-transform: uppercase;
  }

  .actions-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .action-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.6rem;
    width: 100%;
    height: 32px;
    padding: 0 0.5rem;
    border-radius: ${(props) =>
      props.theme.borderRadius["--border-radius-base"]};
    cursor: pointer;
    transition: all ${(props) => props.theme.transitions["--transition-fast"]};
    border: none;
    background: transparent;
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.6,
      )};

    &:hover {
      background: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-primary"],
          0.08,
        )};
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-primary"]};
    }

    &.active {
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-primary"]};
    }

    &.danger {
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant][
          "--color-secondary-text"
        ]};

      &:hover {
        background: ${(props) =>
          rgba(
            props.theme.colors[props.theme.currentVariant]["--color-secondary"],
            0.08,
          )};
        color: ${(props) =>
          props.theme.colors[props.theme.currentVariant]["--color-secondary"]};
      }
    }
  }

  .action-confirm {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    height: 32px;
    padding: 0 0.5rem;
  }

  .confirm-label {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text"]};
    letter-spacing: 0.3px;
    text-transform: uppercase;
    flex: 1;
  }

  .confirm-btn {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-tiny"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    letter-spacing: 1px;
    text-transform: uppercase;
    padding: 0.2rem 0.5rem;
    border-radius: ${(props) =>
      props.theme.borderRadius["--border-radius-base"]};
    border: 1px solid
      ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-text"],
          0.2,
        )};
    background: transparent;
    cursor: pointer;
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.6,
      )};

    &.danger {
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-secondary"]};
      border-color: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-secondary"],
          0.4,
        )};
    }
  }

  .row-label {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    letter-spacing: 0.3px;
    text-transform: uppercase;
    line-height: 1;
  }

  .row-badge {
    margin-left: auto;
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-tiny"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    letter-spacing: 1px;
    text-transform: uppercase;
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-primary"]};
  }

  .build-number {
    margin-top: auto;
    margin-left: auto;
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-xxsmall"]};
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.2,
      )};
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }
`;

export default style;
