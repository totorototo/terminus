import { rgba } from "polished";
import styled, { keyframes } from "styled-components";

const pulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 0.9; }
  50% { transform: scale(1.6); opacity: 0.4; }
`;

const style = (Component) => styled(Component)`
  position: relative;
  width: 100%;

  .theme-toggle {
    position: fixed;
    top: 1.25rem;
    right: 1.25rem;
    z-index: ${(props) => props.theme.zIndex["--z-index-overlay"]};
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    /* why: glassMorphism (surface @ 0.8 + blur) assumes textured content
       behind it, like the 3D scene it was built for — here it sits over a
       flat page background of a near-identical color and reads as
       invisible. A plain tinted fill stays legible regardless of backdrop. */
    background: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.12,
      )};
    /* why: 0.4 alpha keeps the ring at roughly 3:1 against the page
       background (WCAG 1.4.11 non-text contrast) — the control needs to
       read as a distinct boundary at a glance, not just on hover. */
    border: 1px solid
      ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-text"],
          0.4,
        )};
    border-radius: ${(props) =>
      props.theme.borderRadius["--border-radius-full"]};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text"]};
    cursor: pointer;
    transition: all ${(props) => props.theme.transitions["--transition-base"]};

    &:hover {
      background: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-text"],
          0.18,
        )};
      border-color: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-primary"],
          0.6,
        )};
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-primary"]};
    }
  }

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
