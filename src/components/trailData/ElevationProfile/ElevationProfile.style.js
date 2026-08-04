import { rgba } from "polished";
import styled from "styled-components";

const legendItemGap = (props) => `${props.theme.spacing[2]}px`;
const legendGap = (props) =>
  `${props.theme.spacing[2]}px ${props.theme.spacing[4]}px`;
const legendMarginTop = (props) => `${props.theme.spacing[3]}px`;
const dotSize = (props) => `${props.theme.spacing[3]}px`;

const style = (Component) => styled(Component)`
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;

  .ep-chart {
    position: relative;
    width: 100%;
  }

  svg {
    display: block;
    overflow: visible;
  }

  .ep-area {
    fill: ${({ theme }) =>
      rgba(theme.colors[theme.currentVariant]["--color-text"], 0.06)};
  }

  .ep-line {
    stroke: ${({ theme }) =>
      rgba(theme.colors[theme.currentVariant]["--color-text"], 0.4)};
  }

  .ep-section-line {
    stroke: ${({ theme }) =>
      rgba(theme.colors[theme.currentVariant]["--color-text"], 0.2)};
  }

  .ep-runner-line {
    stroke: ${({ theme }) =>
      theme.colors[theme.currentVariant]["--color-primary"]};
  }

  .ep-runner-dot {
    fill: ${({ theme }) =>
      theme.colors[theme.currentVariant]["--color-primary"]};
  }

  /* HTML overlay for axis labels — avoids SVG text distortion */
  .ep-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .ep-label {
    position: absolute;
    font-family: ${({ theme }) => theme.font.family["--font-family-mono"]};
    font-size: ${({ theme }) => theme.font.sizes["--font-size-xxsmall"]};
    color: ${({ theme }) =>
      rgba(theme.colors[theme.currentVariant]["--color-text"], 0.7)};
    text-transform: uppercase;
    letter-spacing: 0.04em;
    line-height: 1;
  }

  .ep-label--tl {
    top: 2px;
    left: 2px;
  }

  .ep-label--tr {
    top: 2px;
    right: 2px;
  }

  .ep-daynight-peak {
    color: ${({ theme }) =>
      theme.colors[theme.currentVariant]["--color-primary-text"]};
  }

  .ep-daynight-low {
    color: ${({ theme }) =>
      theme.colors[theme.currentVariant]["--color-secondary-text"]};
  }

  /* Bottom labels row: section names + runner position */
  .ep-bottom-labels {
    position: relative;
    width: 100%;
    height: 14px;
    margin-top: 3px;
  }

  .ep-section-name {
    position: absolute;
    /* max-width is intentionally less than MIN_GAP_PCT (15%) in
       ElevationProfile.jsx — capping at the full gap lets two max-length
       labels touch edge-to-edge with zero space, reading as merged text.
       12% leaves a visible gap regardless of container pixel width. */
    max-width: 12%;
    overflow: hidden;
    text-overflow: ellipsis;
    font-family: ${({ theme }) => theme.font.family["--font-family-mono"]};
    font-size: ${({ theme }) => theme.font.sizes["--font-size-xxsmall"]};
    color: ${({ theme }) =>
      rgba(theme.colors[theme.currentVariant]["--color-text"], 0.3)};
    letter-spacing: 0.03em;
    line-height: 1;
    white-space: nowrap;
  }

  .ep-runner-value {
    position: absolute;
    font-family: ${({ theme }) => theme.font.family["--font-family-mono"]};
    font-size: ${({ theme }) => theme.font.sizes["--font-size-xxsmall"]};
    color: ${({ theme }) =>
      theme.colors[theme.currentVariant]["--color-primary"]};
    letter-spacing: 0.04em;
    line-height: 1;
    white-space: nowrap;
  }

  .ep-legend {
    display: flex;
    flex-wrap: wrap;
    gap: ${legendGap};
    margin-top: ${legendMarginTop};
  }

  .ep-legend-item {
    display: flex;
    align-items: center;
    gap: ${legendItemGap};
    font-family: ${({ theme }) => theme.font.family["--font-family-mono"]};
    font-size: ${({ theme }) => theme.font.sizes["--font-size-xxsmall"]};
    color: ${({ theme }) =>
      rgba(theme.colors[theme.currentVariant]["--color-text"], 0.5)};
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .ep-legend-dot {
    display: inline-block;
    width: ${dotSize};
    height: ${dotSize};
    border-radius: ${({ theme }) => theme.borderRadius["--border-radius-full"]};
    border: 1px solid
      ${({ theme }) =>
        rgba(theme.colors[theme.currentVariant]["--color-text"], 0.25)};
    box-sizing: border-box;
    flex-shrink: 0;
  }
`;

export default style;
