import { rgba } from "polished";
import styled from "styled-components";

const style = (Component) => styled(Component)`
  position: fixed;
  top: calc(env(safe-area-inset-top) + 1.25rem);
  right: calc(env(safe-area-inset-right) + 1.25rem);
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
  /* why: 0.4 alpha keeps the ring at roughly 3:1 against the page
     background (WCAG 1.4.11 non-text contrast) — the control needs to
     read as a distinct boundary at a glance, not just on hover. */
  border: 1px solid
    ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.4,
      )};
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
      props.theme.colors[props.theme.currentVariant]["--color-primary"]};
  }
`;

export default style;
