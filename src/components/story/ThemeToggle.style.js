import { rgba } from "polished";
import styled from "styled-components";

const style = (Component) => styled(Component)`
  position: fixed;
  top: calc(env(safe-area-inset-top, 0px) + 1.25rem);
  right: calc(env(safe-area-inset-right, 0px) + 1.25rem);
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
    rgba(props.theme.colors[props.theme.currentVariant]["--color-text"], 0.12)};
  /* why: color-control-border is a deliberately soft ring (~2:1 against
     the page background since trail-tokens v1.2.0), below the 3:1 of
     WCAG 1.4.11 — it outlines the control without looking stark. The
     icon in color-text plus the tinted fill are what identify the
     control; use color-field-border where a boundary must reach 3:1. */
  border: 1px solid
    ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-control-border"]};
  border-radius: ${(props) => props.theme.borderRadius["--border-radius-full"]};
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
      props.theme.colors[props.theme.currentVariant]["--color-primary-text"]};
  }
`;

export default style;
