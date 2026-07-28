import { rgba } from "polished";
import styled, { keyframes } from "styled-components";

const pulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 0.9; }
  50% { transform: scale(1.6); opacity: 0.4; }
`;

const style = (Component) => styled(Component)`
  position: relative;
  width: 100%;

  .story-contour {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .contour-line {
    stroke: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-secondary"]};
    stroke-width: 1;
    opacity: 0.16;
  }

  .story-marker {
    position: absolute;
    width: 8px;
    height: 8px;
    margin: -4px 0 0 -4px;
    border-radius: 50%;
    background: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-accent"]};
    box-shadow: 0 0 12px
      ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-accent"],
          0.8,
        )};
    pointer-events: none;

    &::after {
      content: "";
      position: absolute;
      inset: -6px;
      border-radius: 50%;
      border: 1px solid
        ${(props) =>
          props.theme.colors[props.theme.currentVariant]["--color-accent"]};
      animation: ${pulse} 2.4s ease-out infinite;

      @media (prefers-reduced-motion: reduce) {
        animation: none;
      }
    }
  }

  .story-content {
    position: relative;
    z-index: 1;
  }
`;

export default style;
