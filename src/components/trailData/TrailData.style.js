import { rgba } from "polished";
import styled from "styled-components";

const style = (Component) => styled(Component)`
  z-index: ${(props) => props.theme.zIndex["--z-index-overlay"]};
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 380px;
  padding: 2rem 1.25rem 1.25rem;
  border-radius: ${(props) => props.theme.borderRadius["--border-radius-xl"]};
  pointer-events: auto;
  height: 40rem;

  /* Stats container */
  .stats-container {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    width: 100%;
    margin-bottom: 1.5rem;
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1;

    &:first-child {
      align-items: flex-start;
    }

    &:last-child {
      align-items: flex-end;
    }
  }

  .stat-value {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-medium"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text"]};
    letter-spacing: -1px;
    line-height: 1;
    word-wrap: break-word;
    white-space: normal;
    overflow-wrap: break-word;
    max-width: 100%;
  }

  .stat-label {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-tiny"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.5,
      )};
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin-top: 8px;
    line-height: 1;
  }

  .stat-divider {
    width: 1px;
    height: 48px;
    background: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.07,
      )};
    align-self: center;
  }

  /* Content divider */
  .content-divider {
    width: 100%;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      ${(props) =>
          rgba(
            props.theme.colors[props.theme.currentVariant]["--color-text"],
            0.07,
          )}
        20%,
      ${(props) =>
          rgba(
            props.theme.colors[props.theme.currentVariant]["--color-text"],
            0.07,
          )}
        80%,
      transparent
    );
    margin-bottom: 1rem;
  }

  .component-container {
    display: flex;
    width: 100%;
    scrollbar-width: none;
    ::-webkit-scrollbar {
      display: none; /* Safari and Chrome */
    }
    scroll-snap-type: x mandatory;
    overflow-x: auto;
    overflow-y: hidden;
    flex: 1;
    flex-flow: row nowrap;
    -webkit-overflow-scrolling: touch;
    margin-bottom: 0.75rem;
  }

  .panel-dots {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding-bottom: 0.75rem;
    flex-shrink: 0;
  }

  .panel-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    border: none;
    padding: 0;
    cursor: pointer;
    background: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.2,
      )};
    transition:
      background ${(props) => props.theme.transitions["--transition-fast"]},
      transform ${(props) => props.theme.transitions["--transition-fast"]};

    &.active {
      background: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-text"]};
      transform: scale(1.4);
    }
  }

  .component-children {
    display: flex;
    width: 100%;
    height: 100%;
    align-items: center;
    justify-content: center;
    scroll-snap-align: center;
    flex-shrink: 0;
    padding-left: 0.2rem;
    padding-right: 0.2rem;
  }
`;

export default style;
