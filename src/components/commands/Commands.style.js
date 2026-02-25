import { rgba } from "polished";
import styled from "styled-components";

const style = (Component) => styled(Component)`
  position: absolute;
  height: 100%;
  right: 0;
  top: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;

  padding-top: 16rem;
  padding-bottom: 16rem;
  margin-right: 1rem;
  gap: 1rem;

  touch-action: none;

  button {
    width: 48px;
    height: 48px;
    border-radius: ${(props) =>
      props.theme.borderRadius["--border-radius-full"]};
    border: 1px solid
      ${(props) => rgba(props.theme.colors.dark["--color-text"], 0.2)};
    cursor: pointer;
    transition: all
      ${(props) => props.theme.transitions["--transition-standard"]};

    /* Glass morphism effect */
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);

    /* Shadow for depth */
    box-shadow:
      0 4px 16px
        ${(props) => rgba(props.theme.colors.dark["--color-background"], 0.1)},
      0 1px 4px
        ${(props) => rgba(props.theme.colors.dark["--color-background"], 0.1)},
      inset 0 1px 0
        ${(props) => rgba(props.theme.colors.dark["--color-text"], 0.1)};

    /* Remove default button styles */
    outline: none;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;

    /* Focus indicator for keyboard navigation */
    &:focus-visible {
      outline: 2px solid
        ${(props) => props.theme.colors.dark["--color-primary"]};
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
            rgba(props.theme.colors.dark["--color-background"], 0.15)},
        0 2px 8px
          ${(props) => rgba(props.theme.colors.dark["--color-background"], 0.1)},
        inset 0 1px 0
          ${(props) => rgba(props.theme.colors.dark["--color-text"], 0.2)};
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
  }

  /* File upload styled as button */
  label.file-upload-button {
    width: 48px;
    height: 48px;
    border-radius: ${(props) =>
      props.theme.borderRadius["--border-radius-full"]};
    border: 1px solid
      ${(props) => rgba(props.theme.colors.dark["--color-text"], 0.2)};
    cursor: pointer;
    transition: all
      ${(props) => props.theme.transitions["--transition-standard"]};

    /* Glass morphism effect */
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);

    /* Shadow for depth */
    box-shadow:
      0 4px 16px
        ${(props) => rgba(props.theme.colors.dark["--color-background"], 0.1)},
      0 1px 4px
        ${(props) => rgba(props.theme.colors.dark["--color-background"], 0.1)},
      inset 0 1px 0
        ${(props) => rgba(props.theme.colors.dark["--color-text"], 0.1)};

    /* Remove default styles */
    outline: none;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;

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
            rgba(props.theme.colors.dark["--color-background"], 0.15)},
        0 2px 8px
          ${(props) => rgba(props.theme.colors.dark["--color-background"], 0.1)},
        inset 0 1px 0
          ${(props) => rgba(props.theme.colors.dark["--color-text"], 0.2)};
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

    &.off {
      background: ${(props) =>
        rgba(props.theme.colors.dark["--color-text"], 0.1)};
      color: ${(props) => props.theme.colors.dark["--color-text"]};
      border-color: ${(props) =>
        rgba(props.theme.colors.dark["--color-text"], 0.2)};

      &:hover {
        background: ${(props) =>
          rgba(props.theme.colors.dark["--color-text"], 0.2)};
        border-color: ${(props) =>
          rgba(props.theme.colors.dark["--color-text"], 0.3)};
      }

      svg {
        opacity: 0.8;
      }
    }
  }

  button.on {
    background: ${(props) =>
      rgba(props.theme.colors.dark["--color-primary"], 0.25)};
    color: ${(props) => props.theme.colors.dark["--color-primary"]};
    border-color: ${(props) =>
      rgba(props.theme.colors.dark["--color-primary"], 0.4)};

    &:hover {
      background: ${(props) =>
        rgba(props.theme.colors.dark["--color-primary"], 0.35)};
      border-color: ${(props) =>
        rgba(props.theme.colors.dark["--color-primary"], 0.6)};
    }

    svg {
      filter: drop-shadow(
        0 1px 2px
          ${(props) => rgba(props.theme.colors.dark["--color-primary"], 0.3)}
      );
    }
  }

  button.off {
    background: ${(props) =>
      rgba(props.theme.colors.dark["--color-text"], 0.1)};
    color: ${(props) => props.theme.colors.dark["--color-text"]};
    border-color: ${(props) =>
      rgba(props.theme.colors.dark["--color-text"], 0.2)};

    &:hover {
      background: ${(props) =>
        rgba(props.theme.colors.dark["--color-text"], 0.2)};
      border-color: ${(props) =>
        rgba(props.theme.colors.dark["--color-text"], 0.3)};
    }

    svg {
      opacity: 0.8;
    }
  }
`;

export default style;
