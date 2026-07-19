import { rgba } from "polished";
import styled from "styled-components";

const style = (Component) => styled(Component)`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
  flex: 1;
  padding: 0.4rem 0;

  .bc-caption-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
  }

  .bc-caption-row:last-child {
    justify-content: flex-start;
  }

  .bc-profile + .bc-caption-row {
    margin-top: 0.25rem;
  }

  .bc-profile {
    display: flex;
    height: 8px;
    width: 100%;
    border-radius: 4px;
    overflow: hidden;
    background: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.12,
      )};
    flex-shrink: 0;
  }

  .bc-profile-gain {
    background: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-primary"]};
  }

  .bc-profile-loss {
    background: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-secondary"]};
  }

  .bc-stat {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.6,
      )};
    letter-spacing: 0.2px;
    line-height: 1;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .bc-elev {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    line-height: 1;
    white-space: nowrap;
    margin-right: 1rem;
  }

  .bc-elev-up {
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-primary"]};
  }

  .bc-elev-down {
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-secondary"]};
  }

  .bc-dots {
    display: flex;
    gap: 5px;
    align-items: center;
    flex-shrink: 0;
  }

  .bc-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.12,
      )};
    flex-shrink: 0;
  }
`;

export default style;
