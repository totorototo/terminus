import { rgba } from "polished";
import styled from "styled-components";

const style = (Component) => styled(Component)`
  display: block;

  .empty {
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.5,
      )};
  }

  .climb-legend-note {
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.6,
      )};
    margin: 0 0 1.5rem;
    max-width: 40ch;
  }

  .climb-list {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .climb-row {
    display: flex;
    gap: 1rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid
      ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-text"],
          0.08,
        )};

    &:last-child {
      border-bottom: none;
    }

    &.past {
      opacity: 0.4;
    }
  }

  .climb-marker {
    flex-shrink: 0;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: ${(props) =>
      props.theme.borderRadius["--border-radius-full"]};
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    border: 1px solid
      ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-primary"],
          0.4,
        )};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-primary"]};
  }

  .climb-row.current .climb-marker {
    background: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-primary"]};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-background"]};
  }

  .climb-info {
    flex: 1;
    min-width: 0;
  }

  .climb-meta-row {
    display: flex;
    justify-content: space-between;
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    margin-bottom: 0.5rem;
  }

  .climb-summit {
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.5,
      )};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-medium"]};
  }

  .climb-gain-bar {
    height: 4px;
    background: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.08,
      )};
    overflow: hidden;
    margin-bottom: 0.5rem;
  }

  .climb-gain-bar-fill {
    height: 100%;
    background: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-primary"]};
  }

  .climb-stats-row {
    display: flex;
    gap: 0.5rem;
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.6,
      )};

    .sep {
      opacity: 0.4;
    }
  }
`;

export default style;
