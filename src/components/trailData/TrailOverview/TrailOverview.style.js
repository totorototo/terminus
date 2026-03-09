import { rgba } from "polished";
import styled from "styled-components";

const style = (Component) => styled(Component)`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding: 0 0.75rem;
  overflow: hidden;

  .overview-header {
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

  .header-name {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text"]};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.95rem 0.25rem;
    align-content: start;
    padding-top: 0.6rem;
  }

  .grid-tile {
    display: flex;
    flex-direction: column;
    gap: 3px;

    &.time-tile {
      grid-column: 1 / 3;
    }
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
  }

  .tile-label {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-xsmall"]};
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
