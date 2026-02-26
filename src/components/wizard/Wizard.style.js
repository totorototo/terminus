import { rgba } from "polished";
import styled, { keyframes } from "styled-components";

import { glassMorphism } from "../../theme/mixins";

const stepEnter = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const style = (Component) => styled(Component)`
  position: fixed;
  inset: 0;
  z-index: ${(props) => props.theme.zIndex["--z-index-modal"]};
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${(props) => props.theme.colors.dark["--color-background"]};

  .card {
    position: relative;
    width: min(380px, 90vw);
    border-radius: ${(props) => props.theme.borderRadius["--border-radius-lg"]};
    border: 1px solid
      ${(props) => rgba(props.theme.colors.dark["--color-primary"], 0.2)};
    overflow: hidden;
    ${glassMorphism}

    /* Radial glow at top — matches panel aesthetic */
    &::before {
      content: "";
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 70%;
      height: 80px;
      background: radial-gradient(
        ellipse at center top,
        ${(props) => rgba(props.theme.colors.dark["--color-primary"], 0.07)} 0%,
        transparent 100%
      );
      pointer-events: none;
      z-index: 0;
    }
  }

  .step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.875rem;
    padding: 2rem;
    animation: ${stepEnter} 0.2s ease both;
  }

  .title {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: 2rem;
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) => props.theme.colors.dark["--color-text"]};
    margin: 0;
    letter-spacing: -0.04em;
    line-height: 1;
  }

  .subtitle {
    font-size: 0.875rem;
    color: ${(props) => rgba(props.theme.colors.dark["--color-text"], 0.5)};
    margin: 0;
    text-align: center;
  }

  .choices {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
    margin-top: 0.25rem;
  }

  .choice-btn {
    width: 100%;
    padding: 1rem 1.25rem;
    border-radius: ${(props) =>
      props.theme.borderRadius["--border-radius-base"]};
    border: 1px solid
      ${(props) => rgba(props.theme.colors.dark["--color-text"], 0.12)};
    background: ${(props) =>
      rgba(props.theme.colors.dark["--color-text"], 0.05)};
    color: ${(props) => rgba(props.theme.colors.dark["--color-text"], 0.65)};
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    transition: all ${(props) => props.theme.transitions["--transition-base"]};
    -webkit-tap-highlight-color: transparent;

    &:hover {
      background: ${(props) =>
        rgba(props.theme.colors.dark["--color-text"], 0.1)};
      border-color: ${(props) =>
        rgba(props.theme.colors.dark["--color-text"], 0.2)};
      color: ${(props) => props.theme.colors.dark["--color-text"]};
    }

    &:active {
      transform: scale(0.98);
    }

    &.primary {
      background: ${(props) =>
        rgba(props.theme.colors.dark["--color-primary"], 0.1)};
      border-color: ${(props) =>
        rgba(props.theme.colors.dark["--color-primary"], 0.3)};
      color: ${(props) => props.theme.colors.dark["--color-primary"]};
      box-shadow: 0 0 16px
        ${(props) => rgba(props.theme.colors.dark["--color-primary"], 0.07)};

      &:hover {
        background: ${(props) =>
          rgba(props.theme.colors.dark["--color-primary"], 0.18)};
        border-color: ${(props) =>
          rgba(props.theme.colors.dark["--color-primary"], 0.45)};
        box-shadow: 0 0 24px
          ${(props) => rgba(props.theme.colors.dark["--color-primary"], 0.14)};
      }
    }
  }

  .choice-label {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: 0.9375rem;
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    letter-spacing: -0.02em;
  }

  .back-btn {
    align-self: flex-start;
    background: none;
    border: none;
    color: ${(props) => rgba(props.theme.colors.dark["--color-text"], 0.35)};
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: 0.8125rem;
    cursor: pointer;
    padding: 0;
    transition: color ${(props) => props.theme.transitions["--transition-fast"]};
    -webkit-tap-highlight-color: transparent;

    &:hover {
      color: ${(props) => props.theme.colors.dark["--color-text"]};
    }
  }

  .code-input {
    width: 100%;
    padding: 0.875rem 1.25rem;
    border-radius: ${(props) => props.theme.borderRadius["--border-radius-md"]};
    border: 1px solid
      ${(props) => rgba(props.theme.colors.dark["--color-text"], 0.15)};
    background: ${(props) =>
      rgba(props.theme.colors.dark["--color-text"], 0.05)};
    color: ${(props) => props.theme.colors.dark["--color-text"]};
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: 1.75rem;
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    letter-spacing: 0.25em;
    text-align: center;
    text-transform: uppercase;
    outline: none;
    box-sizing: border-box;
    transition: border-color
      ${(props) => props.theme.transitions["--transition-fast"]};

    &::placeholder {
      color: ${(props) => rgba(props.theme.colors.dark["--color-text"], 0.18)};
    }

    &:focus {
      border-color: ${(props) =>
        rgba(props.theme.colors.dark["--color-primary"], 0.5)};
      box-shadow: 0 0 0 1px
        ${(props) => rgba(props.theme.colors.dark["--color-primary"], 0.15)};
    }
  }

  .footer {
    position: absolute;
    bottom: 1.5rem;
    left: 0;
    right: 0;
    text-align: center;
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: 0.6875rem;
    color: ${(props) => rgba(props.theme.colors.dark["--color-text"], 0.25)};
    letter-spacing: 0.04em;
    pointer-events: none;
  }

  .confirm-btn {
    width: 100%;
    padding: 1rem;
    border-radius: ${(props) => props.theme.borderRadius["--border-radius-md"]};
    border: 1px solid
      ${(props) => rgba(props.theme.colors.dark["--color-primary"], 0.3)};
    background: ${(props) =>
      rgba(props.theme.colors.dark["--color-primary"], 0.1)};
    color: ${(props) => props.theme.colors.dark["--color-primary"]};
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: 0.9375rem;
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    letter-spacing: -0.01em;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    transition: all ${(props) => props.theme.transitions["--transition-base"]};
    -webkit-tap-highlight-color: transparent;

    &:hover:not(:disabled) {
      background: ${(props) =>
        rgba(props.theme.colors.dark["--color-primary"], 0.18)};
      border-color: ${(props) =>
        rgba(props.theme.colors.dark["--color-primary"], 0.45)};
      box-shadow: 0 0 20px
        ${(props) => rgba(props.theme.colors.dark["--color-primary"], 0.14)};
    }

    &:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
  }
`;

export default style;
