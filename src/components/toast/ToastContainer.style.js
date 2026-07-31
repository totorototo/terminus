import styled, { keyframes } from "styled-components";

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const style = (Component) => styled(Component)`
  position: fixed;
  left: 50%;
  bottom: max(var(--safe-area-inset-bottom, 0px), 1rem);
  transform: translateX(-50%);
  /* Above LandscapeOverlay (10000) and InstallPromptOverlay (9000) so a toast
     is never hidden behind either full-screen blocker. */
  z-index: 10500;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 0 1rem;
  width: 100%;
  max-width: 420px;
  pointer-events: none;

  .toast {
    pointer-events: auto;
    width: 100%;
    background: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-surface"]};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text"]};
    border-left: 3px solid
      ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-primary"]};
    border-radius: ${(props) => props.theme.borderRadius["--border-radius-md"]};
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    padding: 0.75rem 1rem;
    animation: ${slideIn}
      ${(props) => props.theme.transitions["--transition-standard"]};
  }

  .toast-error {
    border-left-color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-accent"]};
  }

  .toast-success {
    border-left-color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-success"]};
  }

  @media (prefers-reduced-motion: reduce) {
    .toast {
      animation: none;
    }
  }
`;

export default style;
