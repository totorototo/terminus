import styled from "styled-components";

const legendItemGap = (props) => `${props.theme.space["--space-1"]}`;
const legendGap = (props) =>
  `${props.theme.space["--space-2"]} ${props.theme.space["--space-4"]}`;
const legendMarginTop = (props) => `${props.theme.space["--space-2"]}`;
const dotSize = (props) => `${props.theme.space["--space-2"]}`;

const style = (Component) => styled(Component)`
  width: 100%;

  .ri-strip {
    display: block;
    border-radius: ${(props) => props.theme.borderRadius["--border-radius-sm"]};
    overflow: hidden;
  }

  .ri-done-mask {
    fill: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-background"]};
    opacity: 0.78;
  }

  .ri-legend {
    display: flex;
    flex-wrap: wrap;
    gap: ${legendGap};
    margin-top: ${legendMarginTop};
  }

  .ri-legend-item {
    display: flex;
    align-items: center;
    gap: ${legendItemGap};
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-xxsmall"]};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text-faint"]};
    letter-spacing: 0.04em;
  }

  .ri-legend-dot {
    display: inline-block;
    width: ${dotSize};
    height: ${dotSize};
    border-radius: ${(props) =>
      props.theme.borderRadius["--border-radius-full"]};
    flex-shrink: 0;
  }
`;

export default style;
