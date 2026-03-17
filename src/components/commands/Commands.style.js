import { rgba } from "polished";
import styled, { css } from "styled-components";

/* Shared base styles for all button-like controls in this panel */
const buttonBase = css`
  width: 48px;
  height: 48px;
  border-radius: ${(props) => props.theme.borderRadius["--border-radius-full"]};
  border: 1px solid
    ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.2,
      )};
  cursor: pointer;
  transition: all ${(props) => props.theme.transitions["--transition-standard"]};

  /* Glass morphism effect */
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);

  /* Shadow for depth */
  box-shadow:
    0 4px 16px
      ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-background"],
          0.1,
        )},
    0 1px 4px
      ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-background"],
          0.1,
        )},
    inset 0 1px 0
      ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-text"],
          0.1,
        )};

  outline: none;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;

  /* Focus indicator for keyboard navigation */
  &:focus-visible {
    outline: 2px solid
      ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-primary"]};
    outline-offset: 2px;
  }

  /* Prevent scroll on touch */
  touch-action: none;

  /* Remove blue highlight on mobile */
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;

  /* Hover effects */
  &:hover {
    transform: translateY(-2px);
    box-shadow:
      0 8px 24px
        ${(props) =>
          rgba(
            props.theme.colors[props.theme.currentVariant][
              "--color-background"
            ],
            0.15,
          )},
      0 2px 8px
        ${(props) =>
          rgba(
            props.theme.colors[props.theme.currentVariant][
              "--color-background"
            ],
            0.1,
          )},
      inset 0 1px 0
        ${(props) =>
          rgba(
            props.theme.colors[props.theme.currentVariant]["--color-text"],
            0.2,
          )};
  }

  &:active {
    transform: translateY(0);
    transition: transform
      ${(props) => props.theme.transitions["--transition-instant"]};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
    pointer-events: none;

    &:hover {
      transform: none;
    }
  }

  /* Icon styling */
  svg {
    transition: all ${(props) => props.theme.transitions["--transition-base"]};
  }
`;

const style = (Component) => styled(Component)`
  position: absolute;
  height: 100%;
  right: 0;
  top: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;

  padding-top: clamp(6rem, 29vh, 20rem);
  padding-bottom: clamp(4rem, 22vh, 16rem);
  margin-right: 1rem;
  gap: 1rem;

  touch-action: none;

  button {
    ${buttonBase}
  }

  /* File upload styled as button */
  label.file-upload-button {
    ${buttonBase}

    &.off {
      background: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-text"],
          0.1,
        )};
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-text"]};
      border-color: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-text"],
          0.2,
        )};

      &:hover {
        background: ${(props) =>
          rgba(
            props.theme.colors[props.theme.currentVariant]["--color-text"],
            0.2,
          )};
        border-color: ${(props) =>
          rgba(
            props.theme.colors[props.theme.currentVariant]["--color-text"],
            0.3,
          )};
      }

      svg {
        opacity: 0.8;
      }
    }
  }

  button.on {
    background: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-primary"],
        0.25,
      )};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-primary"]};
    border-color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-primary"],
        0.4,
      )};

    &:hover {
      background: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-primary"],
          0.35,
        )};
      border-color: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-primary"],
          0.6,
        )};
    }

    svg {
      filter: drop-shadow(
        0 1px 2px
          ${(props) =>
            rgba(
              props.theme.colors[props.theme.currentVariant]["--color-primary"],
              0.3,
            )}
      );
    }
  }

  button.off {
    background: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.1,
      )};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text"]};
    border-color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.2,
      )};

    &:hover {
      background: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-text"],
          0.2,
        )};
      border-color: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-text"],
          0.3,
        )};
    }

    svg {
      opacity: 0.8;
    }
  }

  /* ── Desktop follower FAB (bottom-right) ────────────────────── */
  &.desktop-dock {
    position: absolute;
    height: 48px;
    width: 48px;
    right: calc(env(safe-area-inset-right) + 0.75rem);
    bottom: calc(env(safe-area-inset-bottom) + 0.75rem);
    top: auto;
    left: auto;
    transform: none;
    padding: 0;
    margin-right: 0;
    gap: 0;

    /* All buttons (secondary + FAB) stack at the same spot; spring translates secondaries radially */
    button {
      position: absolute;
      top: 0;
      right: 0;
    }

    /*
     * Secondary buttons use React Spring's inline transform (translate + scale).
     * The base hover lift (translateY(-2px)) is overridden by inline style specificity,
     * so no additional CSS rule is needed here.
     */

    /* FAB trigger rendered on top */
    button.fab {
      z-index: 1;
    }
  }
`;

export default style;
