import { rgba } from "polished";
import styled from "styled-components";

const style = (Component) => styled(Component)`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding: 0 1rem;
  overflow: hidden;

  .overview-header {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding-bottom: 0.6rem;
    border-bottom: 1px solid
      ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-text"],
          0.07,
        )};
    margin-bottom: 0.75rem;
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
    font-size: ${(props) => props.theme.font.sizes["--font-size"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text"]};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem 1rem;
    align-content: start;
    padding-top: 0.5rem;
  }

  .grid-tile {
    display: flex;
    flex-direction: column;
    gap: 5px;

    &.pace-tile,
    &.time-tile,
    &.room-tile {
      grid-column: 1 / -1;
    }
  }

  .tile-value {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-medium"]};
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
        props.theme.colors[props.theme.currentVariant][
          "--color-secondary-text"
        ]};
    }
  }

  .tile-label {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-tiny"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-light"]};
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.4,
      )};
    letter-spacing: 0.5px;
    text-transform: uppercase;
    line-height: 1;
  }
`;

export default style;
