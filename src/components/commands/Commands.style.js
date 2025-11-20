import styled from "styled-components";
import { rgba, lighten, darken } from "polished";

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

  button {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    border: 1px solid
      ${(props) => rgba(props.theme.colors.dark["--color-text"], 0.2)};
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

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

    /* Remove focus outline */
    &:focus {
      outline: none;
      box-shadow: none;
    }

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
      transition: transform 0.1s;
    }

    /* Icon styling */
    svg {
      transition: all 0.2s ease;
    }
  }

  /* File upload styled as button */
  label.file-upload-button {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    border: 1px solid
      ${(props) => rgba(props.theme.colors.dark["--color-text"], 0.2)};
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

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
      transition: transform 0.1s;
    }

    /* Icon styling */
    svg {
      transition: all 0.2s ease;
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
