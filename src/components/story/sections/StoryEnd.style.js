import { rgba } from "polished";
import styled from "styled-components";

import { space } from "../../../theme/space.js";

const style = (Component) => styled(Component)`
  display: block;
  padding-bottom: clamp(6rem, 20vh, 10rem);

  .footer {
    margin-top: ${space(12)};
    text-align: center;
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: 0.6875rem;
    letter-spacing: 0.04em;
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text-faint"]};
  }

  .kofi-card {
    display: flex;
    align-items: center;
    gap: ${space(4)};
    margin-bottom: ${space(6)};
    text-decoration: none;
    border: 1px solid
      ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-primary"],
          0.4,
        )};
    border-radius: ${(props) =>
      props.theme.borderRadius["--border-radius-base"]};
    background: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-primary"],
        0.1,
      )};
    padding: ${space(4)} ${space(5)};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-primary-text"]};
    cursor: pointer;
    transition: all ${(props) => props.theme.transitions["--transition-base"]};

    &:hover {
      border-color: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-primary"],
          0.7,
        )};
      background: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-primary"],
          0.16,
        )};
    }

    strong {
      display: block;
      font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
      font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
      font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    }

    span span {
      display: block;
      font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
      font-size: 0.75rem;
      opacity: 0.8;
    }
  }

  .actions {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: ${space(3)};
  }

  .action-btn {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: ${space(3)};
    white-space: nowrap;
    text-decoration: none;
    background: none;
    border: 1px solid
      ${(props) =>
        props.theme.colors[props.theme.currentVariant][
          "--color-control-border"
        ]};
    border-radius: ${(props) =>
      props.theme.borderRadius["--border-radius-base"]};
    padding: ${space(3)} ${space(5)};
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
        props.theme.colors[props.theme.currentVariant]["--color-primary-text"]};
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

    &.active {
      border-color: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-primary"],
          0.6,
        )};
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-primary-text"]};
      background: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-primary"],
          0.12,
        )};
    }
  }

  .contact-form {
    display: flex;
    flex-direction: column;
    gap: ${space(3)};
    border: 1px solid
      ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-text"],
          0.15,
        )};
    border-radius: ${(props) =>
      props.theme.borderRadius["--border-radius-base"]};
    padding: ${space(4)} ${space(5)};

    label {
      display: flex;
      flex-direction: column;
      gap: ${space(2)};
      font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
      font-size: 0.75rem;
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-text-muted"]};
    }

    input,
    textarea {
      border: 1px solid
        ${(props) =>
          props.theme.colors[props.theme.currentVariant][
            "--color-control-border"
          ]};
      border-radius: ${(props) =>
        props.theme.borderRadius["--border-radius-sm"]};
      padding: ${space(2)} ${space(3)};
      background: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-background"]};
      font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
      font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-text"]};
      resize: vertical;

      &:focus {
        outline: 2px solid
          ${(props) =>
            props.theme.colors[props.theme.currentVariant]["--color-primary"]};
        outline-offset: 1px;
      }

      &:disabled {
        opacity: 0.5;
      }
    }

    .contact-status {
      font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
      font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};

      &.success {
        color: ${(props) =>
          props.theme.colors[props.theme.currentVariant][
            "--color-primary-text"
          ]};
      }

      &.error {
        color: ${(props) =>
          props.theme.colors[props.theme.currentVariant][
            "--color-accent-text"
          ]};
      }
    }
  }

  .confirm-row {
    display: flex;
    align-items: center;
    gap: ${space(3)};
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
        props.theme.colors[props.theme.currentVariant][
          "--color-control-border"
        ]};
    border-radius: ${(props) =>
      props.theme.borderRadius["--border-radius-base"]};
    padding: ${space(2)} ${space(4)};
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
