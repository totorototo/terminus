import { rgba } from "polished";
import styled from "styled-components";

const style = (Component) => styled(Component)`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding: 0 0.75rem;
  overflow: hidden;

  .list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 0.4rem;
    border-bottom: 1px solid
      ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-text"],
          0.07,
        )};
    margin-bottom: 0.25rem;
    flex-shrink: 0;
  }

  .header-label {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-tiny"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.35,
      )};
    letter-spacing: 1.5px;
    text-transform: uppercase;
  }

  .header-count {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-tiny"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.25,
      )};
    letter-spacing: 0.5px;
  }

  .climb-list {
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    scrollbar-width: none;
    flex: 1;
    min-height: 0;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  .climb-row {
    display: flex;
    align-items: flex-start;
    padding: 0.35rem 0;
    gap: 0.55rem;
    opacity: 0.55;
    transition: opacity
      ${(props) => props.theme.transitions["--transition-fast"]};

    &.past {
      opacity: 0.3;
    }

    &.current {
      opacity: 1;
    }
  }

  .climb-left {
    display: flex;
    align-items: flex-start;
    gap: 0.55rem;
    flex: 1;
    min-width: 0;
  }

  .climb-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
    margin-top: 3px;
    background: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.2,
      )};

    &.past {
      background: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-text"],
          0.25,
        )};
    }

    &.current {
      background: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-primary"]};
      box-shadow: 0 0 6px
        ${(props) =>
          rgba(
            props.theme.colors[props.theme.currentVariant]["--color-primary"],
            0.55,
          )};
    }
  }

  .climb-info {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
    flex: 1;
  }

  .climb-meta-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .climb-at {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-tiny"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text"]};

    .current & {
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-primary"]};
    }
  }

  .climb-summit {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-tiny"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.5,
      )};
    flex-shrink: 0;
  }

  .climb-stats-row {
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }

  .climb-stat {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-xsmall"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-light"]};
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.5,
      )};

    &.gain {
      color: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-primary"],
          0.7,
        )};
    }

    &.gradient {
      color: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-secondary"],
          0.65,
        )};
    }
  }

  .climb-sep {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-xsmall"]};
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.2,
      )};
  }

  .empty-state {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-tiny"]};
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.3,
      )};
    text-align: center;
    padding: 1.5rem 0;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
`;

export default style;
