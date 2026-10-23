import { rgba } from "polished";
import styled from "styled-components";

import { space } from "../../../theme/space.js";

const style = (Component) => styled(Component)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${space(3)};
  padding: ${space(3)} ${space(4)};
  border-radius: ${(props) => props.theme.borderRadius["--border-radius-md"]};
  background: ${(props) =>
    rgba(props.theme.colors[props.theme.currentVariant]["--color-text"], 0.04)};
  border: 1px solid
    ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.08,
      )};

  &.flagged {
    background: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.08,
      )};
    border-color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.3,
      )};
  }

  .cp-weather-main {
    display: flex;
    align-items: center;
    gap: ${space(2)};
  }

  .cp-weather-alert {
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-accent-text"]};
    flex-shrink: 0;
  }

  /* the stat that tripped the flag (cold → temp, wet → precip, windy → wind) */
  .flagged-stat {
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-accent-text"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
  }

  .cp-weather-temp {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text"]};
    line-height: 1;
  }

  .cp-weather-detail {
    display: flex;
    align-items: center;
    gap: ${space(3)};
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text-muted"]};
    white-space: nowrap;
  }

  .cp-weather-wind {
    display: inline-flex;
    align-items: center;
    gap: ${space(1)};
  }
`;

export default style;
