import { rgba } from "polished";
import styled from "styled-components";

const style = (Component) => styled(Component)`
  width: 100%;

  .rs-stat-row {
    display: flex;
    flex-wrap: wrap;
    gap: ${(props) => props.theme.spacing[4]}px
      ${(props) => props.theme.spacing[5]}px;
    margin-bottom: ${(props) => props.theme.spacing[5]}px;
  }

  .rs-stat {
    display: flex;
    flex-direction: column;
  }

  .rs-stat-value {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-large"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    letter-spacing: -0.02em;
    line-height: 1;
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-primary-text"]};
  }

  .rs-stat-label {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-xsmall"]};
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-top: ${(props) => props.theme.spacing[2]}px;
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.65,
      )};
  }

  .rs-terrain-breakdown {
    margin-bottom: ${(props) => props.theme.spacing[5]}px;
  }

  .rs-tb-bar {
    display: flex;
    width: 100%;
    /* why: matches the 14px strip height SlopeIntensity/RunnabilityIndex
       settled on above this component, in the same Terrain section. */
    height: 14px;
    border-radius: ${(props) => props.theme.borderRadius["--border-radius-sm"]};
    overflow: hidden;
  }

  .rs-tb-seg {
    height: 100%;
  }

  /* why: matches SlopeProfile's own climb/descent pairing (primary =
     uphill, secondary = downhill) directly above this chart in the same
     Terrain section — accent is RunnabilityIndex/SlopeIntensity's severity
     ramp, not a direction color. */
  .rs-tb-uphill {
    background: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-primary"]};
  }

  .rs-tb-flat {
    background: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.2,
      )};
  }

  .rs-tb-downhill {
    background: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-secondary"]};
  }

  .rs-tb-legend {
    display: flex;
    flex-wrap: wrap;
    gap: ${(props) => props.theme.spacing[3]}px
      ${(props) => props.theme.spacing[4]}px;
    margin-top: ${(props) => props.theme.spacing[3]}px;
  }

  .rs-tb-legend-item {
    display: flex;
    align-items: center;
    gap: ${(props) => props.theme.spacing[2]}px;
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-xxsmall"]};
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.5,
      )};
    letter-spacing: 0.04em;
  }

  .rs-tb-legend-dot {
    display: inline-block;
    width: ${(props) => props.theme.spacing[3]}px;
    height: ${(props) => props.theme.spacing[3]}px;
    border-radius: ${(props) =>
      props.theme.borderRadius["--border-radius-full"]};
    flex-shrink: 0;
  }

  .rs-grade-distribution {
    display: flex;
    flex-direction: column;
    gap: ${(props) => props.theme.spacing[2]}px;
  }

  .rs-grade-distribution + .rs-grade-distribution {
    margin-top: ${(props) => props.theme.spacing[5]}px;
  }

  .rs-gd-title {
    display: block;
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-xxsmall"]};
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.5,
      )};
    margin-bottom: ${(props) => props.theme.spacing[2]}px;
  }

  .rs-gd-row {
    display: grid;
    grid-template-columns: 4.5rem 1fr 3.5rem;
    align-items: center;
    gap: ${(props) => props.theme.spacing[3]}px;
  }

  .rs-gd-label,
  .rs-gd-value {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-xsmall"]};
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.65,
      )};
  }

  .rs-gd-value {
    text-align: right;
  }

  .rs-gd-track {
    display: block;
    /* why: shorter than the single terrain-breakdown bar above — this one
       repeats 5x in a list, so the full 14px strip height reads too heavy
       stacked. */
    height: ${(props) => props.theme.spacing[3]}px;
    border-radius: ${(props) => props.theme.borderRadius["--border-radius-sm"]};
    background: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.08,
      )};
    overflow: hidden;
  }

  .rs-gd-fill {
    display: block;
    height: 100%;
  }
`;

export default style;
