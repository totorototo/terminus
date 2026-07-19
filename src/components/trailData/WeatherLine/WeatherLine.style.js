import { rgba } from "polished";
import styled from "styled-components";

const style = (Component) => styled(Component)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.625rem 0.875rem;
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
    gap: 0.4rem;
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
    gap: 0.7rem;
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.8,
      )};
    white-space: nowrap;
  }

  .cp-weather-wind {
    display: inline-flex;
    align-items: center;
    gap: 3px;
  }
`;

export default style;
