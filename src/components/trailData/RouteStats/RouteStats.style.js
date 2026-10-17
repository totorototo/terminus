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
      props.theme.colors[props.theme.currentVariant]["--color-text-muted"]};
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

  /* why: direction is neutral in the design system — text at 85 / 30 / 55%,
     never the brand gold or the ahead sage, which carry plan and status.
     Flat (and downhill in light) sit under 3:1, so a 2px ground-coloured
     gap separates every segment and the legend names each one. */
  .rs-tb-seg + .rs-tb-seg {
    box-shadow: inset 2px 0 0
      ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-background"]};
  }

  .rs-tb-uphill {
    background: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-direction-up"]};
  }

  .rs-tb-flat {
    background: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-direction-flat"]};
  }

  .rs-tb-downhill {
    background: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-direction-down"]};
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
      props.theme.colors[props.theme.currentVariant]["--color-text-faint"]};
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
`;

export default style;
