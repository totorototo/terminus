import { rgba } from "polished";
import styled from "styled-components";

const style = (Component) => styled(Component)`
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  padding: 0 0.75rem;

  .pp-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 0.4rem;
    border-bottom: 1px solid
      ${({ theme }) =>
        rgba(theme.colors[theme.currentVariant]["--color-text"], 0.07)};
    margin-bottom: 0.5rem;
    flex-shrink: 0;
  }

  .pp-header-label {
    font-family: ${({ theme }) => theme.font.family["--font-family-mono"]};
    font-size: ${({ theme }) => theme.font.sizes["--font-size-tiny"]};
    font-weight: ${({ theme }) => theme.font.weights["--font-weight-bold"]};
    color: ${({ theme }) =>
      rgba(theme.colors[theme.currentVariant]["--color-text"], 0.35)};
    letter-spacing: 1.5px;
    text-transform: uppercase;
  }

  .pp-chart {
    position: relative;
    width: 100%;
  }

  svg {
    display: block;
    overflow: visible;
  }

  .pp-area {
    fill: ${({ theme }) =>
      rgba(theme.colors[theme.currentVariant]["--color-text"], 0.06)};
  }

  .pp-line {
    stroke: ${({ theme }) =>
      rgba(theme.colors[theme.currentVariant]["--color-text"], 0.4)};
  }

  .pp-section-line {
    stroke: ${({ theme }) =>
      rgba(theme.colors[theme.currentVariant]["--color-text"], 0.2)};
  }

  .pp-runner-line {
    stroke: ${({ theme }) =>
      theme.colors[theme.currentVariant]["--color-primary"]};
  }

  .pp-runner-dot {
    fill: ${({ theme }) =>
      theme.colors[theme.currentVariant]["--color-primary"]};
  }

  /* HTML overlay for axis labels — avoids SVG text distortion */
  .pp-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .pp-label {
    position: absolute;
    font-family: ${({ theme }) => theme.font.family["--font-family-mono"]};
    font-size: ${({ theme }) => theme.font.sizes["--font-size-xxsmall"]};
    color: ${({ theme }) =>
      rgba(theme.colors[theme.currentVariant]["--color-text"], 0.35)};
    text-transform: uppercase;
    letter-spacing: 0.04em;
    line-height: 1;
  }

  .pp-label--tl {
    top: 2px;
    left: 2px;
  }

  .pp-label--bl {
    bottom: 2px;
    left: 2px;
  }

  .pp-label--br {
    bottom: 2px;
    right: 2px;
  }

  /* Bottom labels row: section names + runner position */
  .pp-bottom-labels {
    position: relative;
    width: 100%;
    height: 14px;
    margin-top: 3px;
  }

  .pp-section-name {
    position: absolute;
    font-family: ${({ theme }) => theme.font.family["--font-family-mono"]};
    font-size: ${({ theme }) => theme.font.sizes["--font-size-xxsmall"]};
    color: ${({ theme }) =>
      rgba(theme.colors[theme.currentVariant]["--color-text"], 0.3)};
    letter-spacing: 0.03em;
    line-height: 1;
    white-space: nowrap;
  }

  .pp-runner-value {
    position: absolute;
    font-family: ${({ theme }) => theme.font.family["--font-family-mono"]};
    font-size: ${({ theme }) => theme.font.sizes["--font-size-xxsmall"]};
    color: ${({ theme }) =>
      theme.colors[theme.currentVariant]["--color-primary"]};
    letter-spacing: 0.04em;
    line-height: 1;
    white-space: nowrap;
  }

  .pp-divider {
    width: 100%;
    height: 1px;
    background: ${({ theme }) =>
      rgba(theme.colors[theme.currentVariant]["--color-text"], 0.07)};
    margin: 0.6rem 0;
    flex-shrink: 0;
  }

  .pp-stats {
    display: flex;
    align-items: flex-start;
    gap: 0;
    flex-shrink: 0;
  }

  .pp-stat {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .pp-stat-sep {
    width: 1px;
    align-self: stretch;
    background: ${({ theme }) =>
      rgba(theme.colors[theme.currentVariant]["--color-text"], 0.07)};
    margin: 0 0.75rem;
    flex-shrink: 0;
  }

  .pp-stat-value {
    font-family: ${({ theme }) => theme.font.family["--font-family-mono"]};
    font-size: ${({ theme }) => theme.font.sizes["--font-size-small"]};
    font-weight: ${({ theme }) => theme.font.weights["--font-weight-bold"]};
    color: ${({ theme }) =>
      rgba(theme.colors[theme.currentVariant]["--color-text"], 0.7)};
    line-height: 1;
    letter-spacing: -0.5px;

    &.pp-stat-value--tight {
      color: ${({ theme }) =>
        theme.colors[theme.currentVariant]["--color-secondary-text"]};
    }

    &.pp-stat-value--current {
      color: ${({ theme }) =>
        theme.colors[theme.currentVariant]["--color-primary"]};
    }
  }

  .pp-stat-unit {
    font-size: ${({ theme }) => theme.font.sizes["--font-size-xxsmall"]};
    font-weight: ${({ theme }) => theme.font.weights["--font-weight-medium"]};
    letter-spacing: 0.02em;
    opacity: 0.7;
  }

  .pp-stat-label {
    font-family: ${({ theme }) => theme.font.family["--font-family-mono"]};
    font-size: ${({ theme }) => theme.font.sizes["--font-size-tiny"]};
    font-weight: ${({ theme }) => theme.font.weights["--font-weight-bold"]};
    color: ${({ theme }) =>
      rgba(theme.colors[theme.currentVariant]["--color-text"], 0.3)};
    text-transform: uppercase;
    letter-spacing: 1px;
    line-height: 1;
  }

  .pp-stat-name {
    font-family: ${({ theme }) => theme.font.family["--font-family-mono"]};
    font-size: ${({ theme }) => theme.font.sizes["--font-size-tiny"]};
    color: ${({ theme }) =>
      rgba(theme.colors[theme.currentVariant]["--color-text"], 0.25)};
    letter-spacing: 0.03em;
    line-height: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

export default style;
