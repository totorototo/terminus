import { rgba } from "polished";
import styled from "styled-components";

const style = (Component) => styled(Component)`
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 0 0.75rem;
  gap: 0.5rem;

  .soundscape-header {
    padding-bottom: 0.4rem;
    border-bottom: 1px solid
      ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-text"],
          0.07,
        )};
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

  .play-button {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    width: 100%;
    height: 36px;
    padding: 0 0.6rem;
    border: none;
    border-radius: ${(props) =>
      props.theme.borderRadius["--border-radius-base"]};
    background: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-primary"],
        0.08,
      )};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-primary"]};
    cursor: pointer;
    transition: all ${(props) => props.theme.transitions["--transition-fast"]};

    &:hover:not(:disabled) {
      background: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-primary"],
          0.16,
        )};
    }

    &:disabled {
      opacity: 0.35;
      cursor: default;
    }

    &.active {
      background: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-primary"],
          0.12,
        )};
    }
  }

  .play-icon {
    font-size: 10px;
    line-height: 1;
    flex-shrink: 0;
  }

  .play-label {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    letter-spacing: 0.3px;
    text-transform: uppercase;
    line-height: 1;
  }

  .playing-badge {
    margin-left: auto;
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-tiny"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    letter-spacing: 1px;
    text-transform: uppercase;
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-primary"]};
    animation: pulse 1.5s ease-in-out infinite;
  }

  .soundscape-desc {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-xxsmall"]};
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.3,
      )};
    letter-spacing: 0.3px;
    margin: 0;
    line-height: 1.4;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.4;
    }
  }
`;

export default style;
