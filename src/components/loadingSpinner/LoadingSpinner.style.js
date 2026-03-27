import { rgba } from "polished";
import styled, { keyframes } from "styled-components";

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`;

const style = (Component) => styled(Component)`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: ${(props) =>
    props.theme.colors[props.theme.currentVariant]["--color-background"]};
  gap: 1rem;

  .spinner {
    width: 48px;
    height: 48px;
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

  p {
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text"]};
    opacity: 0.7;
    letter-spacing: 1.5px;
    margin: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    .spinner {
      animation: none;
      border-top-color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-text"]};
    }
  }
`;

export default style;
