import { rgba } from "polished";
import styled from "styled-components";

import { space } from "../../../theme/space.js";

const legendItemGap = (props) => `${props.theme.space["--space-1"]}`;
const legendGap = (props) =>
  `${props.theme.space["--space-1"]} ${props.theme.space["--space-4"]}`;
const legendMarginTop = (props) => `${props.theme.space["--space-2"]}`;
const dotSize = (props) => `${props.theme.space["--space-2"]}`;

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

  /* why: one line in color-text over the day/night fills, so the terrain
     shape reads first and the mauve shades sit under it. */
  .ep-line {
    stroke: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text"]};
  }

  .ep-section-line {
    stroke: ${({ theme }) =>
      rgba(theme.colors[theme.currentVariant]["--color-text"], 0.2)};
  }

  /* why: the runner's position is neutral on every terrain chart — gold
     (plan) and pink (behind/live) both clash with the mauve fills, and
     color-text holds on every mauve step in both themes. */
  .ep-runner-line {
    stroke: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text"]};
  }

  .ep-runner-dot {
    fill: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text"]};
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
    top: ${space("hair")};
    left: ${space("hair")};
  }

  .ep-label--tr {
    top: ${space("hair")};
    right: ${space("hair")};
  }

  .ep-daynight-peak {
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text"]};
  }

  .ep-daynight-low {
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text-muted"]};
  }

  /* Bottom labels row: section names + runner position */
  .ep-bottom-labels {
    position: relative;
    width: 100%;
    height: 14px;
    margin-top: ${space(1)};
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
      rgba(theme.colors[theme.currentVariant]["--color-text"], 0.65)};
    letter-spacing: 0.03em;
    line-height: 1;
    white-space: nowrap;
  }

  .ep-runner-value {
    position: absolute;
    font-family: ${({ theme }) => theme.font.family["--font-family-mono"]};
    font-size: ${({ theme }) => theme.font.sizes["--font-size-xxsmall"]};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text"]};
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
      rgba(theme.colors[theme.currentVariant]["--color-text"], 0.65)};
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
