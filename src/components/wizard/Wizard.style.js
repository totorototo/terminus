import { rgba } from "polished";
import styled from "styled-components";

const style = (Component) => styled(Component)`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${(props) => props.theme.colors.dark["--color-background"]};

  .card {
    width: min(380px, 90vw);
    padding: 2.5rem 2rem;
    border-radius: 1.5rem;
    border: 1px solid
      ${(props) => rgba(props.theme.colors.dark["--color-text"], 0.12)};
    background: ${(props) =>
      rgba(props.theme.colors.dark["--color-text"], 0.05)};
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .title {
    font-size: 1.75rem;
    font-weight: 700;
    color: ${(props) => props.theme.colors.dark["--color-text"]};
    margin: 0;
    letter-spacing: -0.02em;
  }

  .subtitle {
    font-size: 0.9rem;
    color: ${(props) => rgba(props.theme.colors.dark["--color-text"], 0.6)};
    margin: 0;
    text-align: center;
  }

  .choices {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-top: 0.5rem;
  }

  .choice-btn {
    width: 100%;
    padding: 1.1rem 1.5rem;
    border-radius: 1rem;
    border: 1px solid
      ${(props) => rgba(props.theme.colors.dark["--color-text"], 0.15)};
    background: ${(props) =>
      rgba(props.theme.colors.dark["--color-text"], 0.07)};
    color: ${(props) => props.theme.colors.dark["--color-text"]};
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 1rem;
    transition: all 0.2s ease;
    -webkit-tap-highlight-color: transparent;

    &:hover {
      background: ${(props) =>
        rgba(props.theme.colors.dark["--color-text"], 0.13)};
      border-color: ${(props) =>
        rgba(props.theme.colors.dark["--color-text"], 0.25)};
    }

    &:active {
      transform: scale(0.98);
    }

    &.primary {
      background: ${(props) =>
        rgba(props.theme.colors.dark["--color-primary"], 0.2)};
      border-color: ${(props) =>
        rgba(props.theme.colors.dark["--color-primary"], 0.4)};
      color: ${(props) => props.theme.colors.dark["--color-primary"]};

      &:hover {
        background: ${(props) =>
          rgba(props.theme.colors.dark["--color-primary"], 0.3)};
      }
    }
  }

  .choice-icon {
    font-size: 1.5rem;
    line-height: 1;
  }

  .choice-label {
    font-size: 1rem;
    font-weight: 500;
  }

  .back-btn {
    align-self: flex-start;
    background: none;
    border: none;
    color: ${(props) => rgba(props.theme.colors.dark["--color-text"], 0.5)};
    font-size: 0.85rem;
    cursor: pointer;
    padding: 0;
    margin-bottom: 0.25rem;
    -webkit-tap-highlight-color: transparent;

    &:hover {
      color: ${(props) => props.theme.colors.dark["--color-text"]};
    }
  }

  .code-input {
    width: 100%;
    padding: 1rem 1.25rem;
    border-radius: 0.75rem;
    border: 1px solid
      ${(props) => rgba(props.theme.colors.dark["--color-text"], 0.2)};
    background: ${(props) =>
      rgba(props.theme.colors.dark["--color-text"], 0.07)};
    color: ${(props) => props.theme.colors.dark["--color-text"]};
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-align: center;
    text-transform: uppercase;
    outline: none;
    box-sizing: border-box;

    &::placeholder {
      color: ${(props) => rgba(props.theme.colors.dark["--color-text"], 0.25)};
      letter-spacing: 0.2em;
    }

    &:focus {
      border-color: ${(props) =>
        rgba(props.theme.colors.dark["--color-primary"], 0.5)};
    }
  }

  .confirm-btn {
    width: 100%;
    padding: 1rem;
    border-radius: 0.75rem;
    border: 1px solid
      ${(props) => rgba(props.theme.colors.dark["--color-primary"], 0.4)};
    background: ${(props) =>
      rgba(props.theme.colors.dark["--color-primary"], 0.2)};
    color: ${(props) => props.theme.colors.dark["--color-primary"]};
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    -webkit-tap-highlight-color: transparent;

    &:hover:not(:disabled) {
      background: ${(props) =>
        rgba(props.theme.colors.dark["--color-primary"], 0.3)};
    }

    &:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }
  }
`;

export default style;
