import { rgba } from "polished";
import styled from "styled-components";

const style = (Component) => styled(Component)`
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 0 0.75rem;
  gap: 0.5rem;

  .soundscape-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 0.4rem;
    border-bottom: 1px solid
      ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-text"],
          0.07,
        )};
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

  .live-badge {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-tiny"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    letter-spacing: 1px;
    text-transform: uppercase;
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-primary"]};
    animation: pulse 1.5s ease-in-out infinite;
  }

  .controls {
    display: grid;
    grid-template-columns: 38px 1fr 38px;
    gap: 0.4rem;
    align-items: center;
  }

  .ctrl-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 38px;
    border-radius: 100px;
    border: 1px solid
      ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-text"],
          0.12,
        )};
    background: transparent;
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.45,
      )};
    font-size: 11px;
    cursor: pointer;
    transition: all ${(props) => props.theme.transitions["--transition-fast"]};

    &:hover:not(:disabled) {
      border-color: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-text"],
          0.25,
        )};
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-text"]};
      background: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-text"],
          0.06,
        )};
    }

    &:disabled {
      opacity: 0.2;
      cursor: default;
    }

    &.ctrl-primary {
      font-size: 13px;
      border-color: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-primary"],
          0.3,
        )};
      background: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-primary"],
          0.08,
        )};
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-primary"]};

      &:hover:not(:disabled) {
        background: ${(props) =>
          rgba(
            props.theme.colors[props.theme.currentVariant]["--color-primary"],
            0.15,
          )};
        border-color: ${(props) =>
          rgba(
            props.theme.colors[props.theme.currentVariant]["--color-primary"],
            0.5,
          )};
      }

      &.active {
        background: ${(props) =>
          rgba(
            props.theme.colors[props.theme.currentVariant]["--color-primary"],
            0.18,
          )};
        border-color: ${(props) =>
          rgba(
            props.theme.colors[props.theme.currentVariant]["--color-primary"],
            0.55,
          )};
        box-shadow: 0 0 14px
          ${(props) =>
            rgba(
              props.theme.colors[props.theme.currentVariant]["--color-primary"],
              0.2,
            )};
      }
    }
  }

  .oscilloscope {
    display: block;
    width: 100%;
    height: 44px;
    border-radius: ${(props) =>
      props.theme.borderRadius["--border-radius-base"]};
    background: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.04,
      )};
    overflow: hidden;
    opacity: 0;
    transition: opacity
      ${(props) => props.theme.transitions["--transition-fast"]};

    &.visible {
      opacity: 1;
    }

    .osc-midline {
      stroke: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-primary"],
          0.18,
        )};
      stroke-width: 0.5;
      stroke-dasharray: 2 4;
      vector-effect: non-scaling-stroke;
    }

    .osc-waveform {
      stroke: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-primary"]};
      stroke-width: 1.5;
      fill: none;
      vector-effect: non-scaling-stroke;
    }

    .osc-progress {
      fill: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-primary"]};
      opacity: 0.3;
    }
  }

  .live-stats {
    display: flex;
    align-items: center;
    gap: 0;
    height: 0;
    overflow: hidden;
    opacity: 0;
    transition:
      height ${(props) => props.theme.transitions["--transition-fast"]},
      opacity ${(props) => props.theme.transitions["--transition-fast"]};

    &.visible {
      height: 32px;
      opacity: 1;
    }
  }

  .live-stat {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  .live-stat-divider {
    width: 1px;
    height: 20px;
    background: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.08,
      )};
  }

  .live-stat-label {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-xxsmall"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    letter-spacing: 1px;
    text-transform: uppercase;
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.3,
      )};
  }

  .live-stat-value {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-primary"]};
    line-height: 1;
  }

  .soundscape-desc {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-xxsmall"]};
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.3,
      )};
    letter-spacing: 0.3px;
    margin: 0;
    line-height: 1.4;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.4;
    }
  }
`;

export default style;
