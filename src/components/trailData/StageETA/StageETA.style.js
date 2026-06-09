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

  .header-total {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-tiny"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.5,
      )};
    letter-spacing: 0.5px;
  }

  .section-list {
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    scrollbar-width: none;
    flex: 1;
    min-height: 0;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  /* ── Segment breadcrumb ─────────────────────────────── */

  .bc-row {
    display: flex;
    align-items: center;
    gap: 1.2rem;
    padding: 0.75rem 0;
    opacity: 0.35;
    transition: opacity
      ${(props) => props.theme.transitions["--transition-fast"]};

    &.past {
      opacity: 0.15;
    }

    &.current {
      opacity: 0.65;
    }
  }

  .bc-connector {
    width: 7px;
    flex-shrink: 0;
    align-self: stretch;
    display: flex;
    justify-content: center;

    &::before {
      content: "";
      display: block;
      width: 1px;
      height: 100%;
      background: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-text"],
          0.15,
        )};
    }
  }

  .bc-stats {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    flex-wrap: wrap;
    flex: 1;
    min-width: 0;
  }

  .bc-stat {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-tiny"]};
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.7,
      )};
    letter-spacing: 0.2px;
    line-height: 1;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .bc-dots {
    display: flex;
    gap: 3px;
    align-items: center;
    flex-shrink: 0;
  }

  .bc-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.12,
      )};
    flex-shrink: 0;
  }

  /* ── Checkpoint line ───────────────────────────────── */

  .cp-row {
    display: flex;
    align-items: center;
    gap: 1.2rem;
    padding: 0.75rem 0;
    opacity: 0.55;
    position: relative;
    transition: opacity
      ${(props) => props.theme.transitions["--transition-fast"]};

    &::before {
      content: "";
      position: absolute;
      left: 3px;
      top: 0;
      bottom: 0;
      width: 1px;
      background: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-text"],
          0.15,
        )};
    }

    &.past {
      opacity: 0.2;
    }

    &.current {
      opacity: 1;
    }
  }

  .cp-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
    position: relative;
    z-index: 1;
    background: transparent;
    border: 1.5px solid
      ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-text"],
          0.3,
        )};

    &.past {
      border-color: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-text"],
          0.2,
        )};
    }

    &.current {
      border-color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-primary"]};
      box-shadow: 0 0 6px
        ${(props) =>
          rgba(
            props.theme.colors[props.theme.currentVariant]["--color-primary"],
            0.55,
          )};
    }
  }

  .cp-body {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    flex: 1;
    min-width: 0;
  }

  .cp-line1 {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }

  .cp-line2 {
    display: flex;
  }

  .cp-name {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-large"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text"]};
    letter-spacing: -0.5px;
    line-height: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
    flex: 1;
  }

  .cp-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .cp-eta {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-medium"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text"]};
    letter-spacing: -0.5px;
    line-height: 1;
  }

  .cp-row.past .cp-eta {
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.5,
      )};
  }

  .cp-row.current .cp-eta {
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-primary"]};
  }

  .cp-row.over-cutoff .cp-eta {
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-accent"]};
  }

  .cp-km {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.35,
      )};
    letter-spacing: 0.3px;
    line-height: 1;
    white-space: nowrap;
  }

  .cp-weather {
    display: flex;
    align-items: center;
    gap: 0.2rem;
  }

  .cp-weather-temp {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-tiny"]};
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.5,
      )};
    line-height: 1;
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
