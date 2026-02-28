import { rgba } from "polished";
import styled from "styled-components";

const style = (Component) => styled(Component)`
  position: absolute;
  bottom: 110px;
  left: 50%;
  transform: translateX(-50%);
  z-index: ${(props) => props.theme.zIndex["--z-index-overlay"]};

  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 1rem;

  background: ${(props) =>
    rgba(props.theme.colors.dark["--color-background"], 0.75)};
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid
    ${(props) => rgba(props.theme.colors.dark["--color-text"], 0.12)};
  border-radius: ${(props) => props.theme.borderRadius["--border-radius-xl"]};
  box-shadow:
    0 8px 32px
      ${(props) => rgba(props.theme.colors.dark["--color-background"], 0.4)},
    0 2px 8px
      ${(props) => rgba(props.theme.colors.dark["--color-background"], 0.2)};

  pointer-events: auto;
  touch-action: none;

  .play-pause {
    width: 36px;
    height: 36px;
    border-radius: ${(props) =>
      props.theme.borderRadius["--border-radius-full"]};
    border: 1px solid
      ${(props) => rgba(props.theme.colors.dark["--color-primary"], 0.4)};
    background: ${(props) =>
      rgba(props.theme.colors.dark["--color-primary"], 0.2)};
    color: ${(props) => props.theme.colors.dark["--color-primary"]};
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    outline: none;
    padding: 0;
    transition: all ${(props) => props.theme.transitions["--transition-fast"]};
    -webkit-tap-highlight-color: transparent;

    &:hover {
      background: ${(props) =>
        rgba(props.theme.colors.dark["--color-primary"], 0.35)};
    }

    &:active {
      transform: scale(0.92);
    }
  }

  .speeds {
    display: flex;
    gap: 0.25rem;
  }

  .speed-btn {
    height: 28px;
    padding: 0 0.5rem;
    border-radius: ${(props) => props.theme.borderRadius["--border-radius-sm"]};
    border: 1px solid
      ${(props) => rgba(props.theme.colors.dark["--color-text"], 0.2)};
    background: ${(props) =>
      rgba(props.theme.colors.dark["--color-text"], 0.08)};
    color: ${(props) => rgba(props.theme.colors.dark["--color-text"], 0.6)};
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-xsmall"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    cursor: pointer;
    outline: none;
    transition: all ${(props) => props.theme.transitions["--transition-fast"]};
    -webkit-tap-highlight-color: transparent;

    &:hover {
      background: ${(props) =>
        rgba(props.theme.colors.dark["--color-text"], 0.15)};
      color: ${(props) => props.theme.colors.dark["--color-text"]};
    }

    &.active {
      background: ${(props) =>
        rgba(props.theme.colors.dark["--color-primary"], 0.2)};
      border-color: ${(props) =>
        rgba(props.theme.colors.dark["--color-primary"], 0.5)};
      color: ${(props) => props.theme.colors.dark["--color-primary"]};
    }
  }
`;

export default style;
