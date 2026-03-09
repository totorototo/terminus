import { rgba } from "polished";
import styled from "styled-components";

const style = (Component) => styled(Component)`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding: 0 0.75rem;
  overflow: hidden;

  .empty-state {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-tiny"]};
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.3,
      )};
    text-align: center;
    padding: 1.5rem 0;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .analytics-header {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding-bottom: 0.4rem;
    border-bottom: 1px solid
      ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-text"],
          0.07,
        )};
    margin-bottom: 0.5rem;
    flex-shrink: 0;
  }

  .header-label {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-tiny"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.35,
      )};
    letter-spacing: 1.5px;
    text-transform: uppercase;
  }

  .header-route {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-tiny"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text"]};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .route-arrow {
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.35,
      )};
  }

  .analytics-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.95rem 0.25rem;
    flex: 1;
    align-content: start;
    padding-top: 1rem;
  }

  .grid-tile {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .tile-value {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text"]};
    letter-spacing: -0.5px;
    line-height: 1;

    &.gain {
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-primary"]};
    }

    &.loss {
      color: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-secondary"],
          0.65,
        )};
    }

    &.difficulty {
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  }

  .tile-label {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-xxsmall"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-light"]};
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.35,
      )};
    letter-spacing: 0.5px;
    text-transform: uppercase;
    line-height: 1;
  }
`;

export default style;
