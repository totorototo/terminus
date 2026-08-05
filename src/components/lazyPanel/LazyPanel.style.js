import { rgba } from "polished";
import styled, { keyframes } from "styled-components";

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`;

const style = (Component) => styled(Component)`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;

  .lazy-panel-placeholder {
    width: 100%;
    height: 100%;
    border-radius: var(--border-radius-md);
    background: var(--color-surface);
    opacity: 0.4;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .lazy-panel-spinner {
    width: 28px;
    height: 28px;
    border: 3px solid
      ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-primary"],
          0.2,
        )};
    border-top-color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-primary"]};
    border-radius: ${(props) =>
      props.theme.borderRadius["--border-radius-full"]};
    animation: ${spin} 0.8s linear infinite;
  }

  .lazy-panel-sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
  }

  @media (prefers-reduced-motion: reduce) {
    .lazy-panel-spinner {
      animation: none;
      border-top-color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-text"]};
    }
  }
`;

export default style;
