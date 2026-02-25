import { rgba } from "polished";
import styled from "styled-components";

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
    color: ${({ theme }) => rgba(theme.colors.dark["--color-text"], 0.35)};
    text-transform: uppercase;
    letter-spacing: 0.04em;
    line-height: 1;
  }

  .ep-label--tl {
    top: 2px;
    left: 2px;
  }

  .ep-label--bl {
    bottom: 2px;
    left: 2px;
  }

  .ep-label--br {
    bottom: 2px;
    right: 2px;
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
    font-family: ${({ theme }) => theme.font.family["--font-family-mono"]};
    font-size: ${({ theme }) => theme.font.sizes["--font-size-xxsmall"]};
    color: ${({ theme }) => rgba(theme.colors.dark["--color-text"], 0.3)};
    letter-spacing: 0.03em;
    line-height: 1;
    white-space: nowrap;
  }

  .ep-runner-value {
    position: absolute;
    font-family: ${({ theme }) => theme.font.family["--font-family-mono"]};
    font-size: ${({ theme }) => theme.font.sizes["--font-size-xxsmall"]};
    color: ${({ theme }) => theme.colors.dark["--color-primary"]};
    letter-spacing: 0.04em;
    line-height: 1;
    white-space: nowrap;
  }
`;

export default style;
