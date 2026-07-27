import { rgba } from "polished";
import styled from "styled-components";

const style = (Component) => styled(Component)`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding: 0 0.75rem;
  overflow: hidden;

  .list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
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

  .header-count {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-tiny"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.25,
      )};
    letter-spacing: 0.5px;
  }

  .climb-list {
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    scrollbar-width: none;
    flex: 1;
    min-height: 0;
    gap: 1rem;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  .climb-row {
    display: flex;
    align-items: center;
    padding: 0.5rem 0;
    gap: 0.8rem;
    opacity: 0.65;
    transition: opacity
      ${(props) => props.theme.transitions["--transition-fast"]};

    &.past {
      opacity: 0.5;
    }

    &.current {
      opacity: 1;
    }
  }

  .climb-info {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    min-width: 0;
    flex: 1;
  }

  .climb-meta-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.5rem;
  }

  /* Difficulty label — plain colored text, no chip, in its own left column
     so it lines up down the list regardless of each row's text length.
     Only rendered for categorized climbs (Cat 4+); uncategorized climbs
     leave the column empty rather than filling it with a placeholder. */
  .climb-marker {
    width: 40px;
    flex-shrink: 0;
    white-space: nowrap;
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-large"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-primary"]};
    letter-spacing: 0.2px;
  }

  .climb-at {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-medium"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text"]};
    letter-spacing: -0.5px;
    line-height: 1;

    .current & {
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-primary"]};
    }
  }

  .climb-summit {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.5,
      )};
    flex-shrink: 0;
  }

  /* Matches LegCaption's .bc-profile strip (height/radius/track alpha) —
     same "proportion bar" language used elsewhere in the sidebar. */
  .climb-gain-bar {
    height: 8px;
    border-radius: ${(props) => props.theme.borderRadius["--border-radius-sm"]};
    overflow: hidden;
    background: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.12,
      )};
  }

  .climb-gain-bar-fill {
    height: 100%;
    background: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-primary"]};
    transition: width ${(props) => props.theme.transitions["--transition-base"]};
  }

  .climb-stats-row {
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }

  .climb-stat {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    font-weight: ${(props) =>
      props.theme.font.weights["--font-weight-regular"]};
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.65,
      )};
  }

  .climb-sep {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.3,
      )};
  }

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
`;

export default style;
