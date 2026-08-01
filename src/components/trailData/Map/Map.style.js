import { rgba } from "polished";
import styled from "styled-components";

const style = (Component) => styled(Component)`
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: ${(props) => props.theme.borderRadius["--border-radius-md"]};
  overflow: hidden;

  &:fullscreen,
  &:-webkit-full-screen {
    border-radius: 0;
  }

  &.is-fullscreen {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100dvh;
    border-radius: 0;
    z-index: ${(props) => props.theme.zIndex["--z-index-modal"]};
  }

  .mapboxgl-map {
    border-radius: ${(props) => props.theme.borderRadius["--border-radius-md"]};
  }

  &:fullscreen .mapboxgl-map,
  &:-webkit-full-screen .mapboxgl-map,
  &.is-fullscreen .mapboxgl-map {
    border-radius: 0;
  }

  .fullscreen-btn {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    padding: 0;
    border-radius: ${(props) =>
      props.theme.borderRadius["--border-radius-base"]};
    border: 1px solid
      ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-text"],
          0.15,
        )};
    background: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-background"],
        0.7,
      )};
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.75,
      )};
    cursor: pointer;
    backdrop-filter: blur(6px);
    transition: all ${(props) => props.theme.transitions["--transition-fast"]};
    -webkit-tap-highlight-color: transparent;

    &:hover {
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-primary"]};
      border-color: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-primary"],
          0.4,
        )};
    }
  }

  /* why: in fullscreen the button sits at the true screen edge, where a
     notch/status bar (network, battery, clock) can cover it — same problem
     ThemeToggle solves for its own fixed corner button. Skipped in the
     embedded card view, where the button isn't near a physical screen edge.
     The CSS fallback (.is-fullscreen) can't ask the OS to hide its status
     bar the way native fullscreen can, so env(safe-area-inset-top) isn't
     guaranteed to report that row's real height there — max() against a
     generous fixed floor guarantees clearance even when it reports 0. */
  &:fullscreen .fullscreen-btn,
  &:-webkit-full-screen .fullscreen-btn,
  &.is-fullscreen .fullscreen-btn {
    top: max(calc(env(safe-area-inset-top, 0px) + 0.75rem), 3.25rem);
    right: calc(env(safe-area-inset-right, 0px) + 0.75rem);
  }

  .map-message {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    padding: 1rem;
    text-align: center;
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text"]};
  }

  .offline-preview {
    width: 100%;
    height: 100%;
    display: block;
    background: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-background"]};
  }

  .offline-badge {
    position: absolute;
    bottom: 0.5rem;
    left: 50%;
    transform: translateX(-50%);
    padding: 0.25rem 0.6rem;
    border-radius: ${(props) => props.theme.borderRadius["--border-radius-sm"]};
    background: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-background"]};
    opacity: 0.85;
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text"]};
    pointer-events: none;
    white-space: nowrap;
  }

  .waypoint-marker {
    fill: var(--waypoint-color);
    stroke: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-background"]};
    stroke-width: 1.5px;
    cursor: pointer;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.4));
  }

  .runner-marker {
    position: relative;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--runner-color);
    border: 2px solid
      ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-background"]};
    box-shadow: 0 0 0 2px var(--runner-color);
  }

  .runner-marker::before {
    content: "";
    position: absolute;
    inset: -2px;
    border-radius: 50%;
    background: var(--runner-color);
    opacity: 0.4;
    animation: runner-pulse 1.8s ease-out infinite;
  }

  @keyframes runner-pulse {
    0% {
      transform: scale(1);
      opacity: 0.4;
    }
    100% {
      transform: scale(2.6);
      opacity: 0;
    }
  }
`;

export default style;
