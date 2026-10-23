import { rgba } from "polished";
import styled from "styled-components";

import { space } from "../../../theme/space.js";

const style = (Component) => styled(Component)`
  display: block;

  .lede {
    font-size: ${(props) => props.theme.font.sizes["--font-size-medium"]};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text-muted"]};
    max-width: 34ch;
    margin: 0 0 ${space(8)};
  }

  /* The race's totals: value over label, as the stage figures. */
  .fueling-totals {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: ${space(3)} ${space(6)};
    margin: 0 0 ${space(6)};
    padding: ${space(3)};
    border-radius: ${(props) => props.theme.borderRadius["--border-radius-md"]};
    background: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.03,
      )};

    > div {
      display: flex;
      flex-direction: column-reverse;
      gap: ${space("hair")};
    }

    dt {
      font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
      font-size: ${(props) => props.theme.font.sizes["--font-size-tiny"]};
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-text-muted"]};
    }

    dd {
      margin: 0;
      font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
      font-size: ${(props) => props.theme.font.sizes["--font-size-medium"]};
      font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    }
  }

  .fueling-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
  }

  /* Rows, ETA column, badge and figures mirror StoryCheckpoints
     (and StoryStages), so the three lists read as one. */
  .fueling-row {
    display: flex;
    flex-direction: column;
    gap: ${space(3)};
    padding: ${space(4)} 0;
    border-bottom: 1px solid
      ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-hairline"]};

    &:last-child {
      border-bottom: none;
    }

    &.past {
      opacity: 0.55;
    }

    &.current .fueling-name {
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-primary-text"]};
    }
  }

  .fueling-top {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: ${space(4)};
  }

  .fueling-main {
    display: flex;
    flex-direction: column;
  }

  .fueling-name {
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
  }

  .fueling-km {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text-muted"]};
    margin-top: ${space(1)};
  }

  .fueling-eta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: ${space(2)};
    text-align: right;
    white-space: nowrap;
  }

  .fueling-eta-time {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-medium"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text"]};
  }

  /* why: outlined like the cutoff badges; only a refill takes the accent, so
     the points to plan around stand out. */
  .fueling-badge {
    display: inline-flex;
    align-items: center;
    padding: ${space(1)} ${space(2)};
    border: 1px solid currentColor;
    border-radius: ${(props) => props.theme.borderRadius["--border-radius-lg"]};
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    /* why: outdoor mode's 1.35x makes the tiny step 16px, too heavy for a
       pill beside the ETA on a phone; one step down still reads 14px. */
    font-size: ${(props) =>
      props.theme.font.sizes[
        props.theme.outdoorMode ? "--font-size-xsmall" : "--font-size-tiny"
      ]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    letter-spacing: 0.05em;
    text-transform: uppercase;
    white-space: nowrap;
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text-muted"]};

    &.refills {
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-primary-text"]};
    }
  }

  /* On the way, Leave with, Stop: value over label, as the stage figures. */
  .fueling-figures {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: ${space(3)} ${space(6)};
    margin: 0;
    padding: ${space(3)};
    border-radius: ${(props) => props.theme.borderRadius["--border-radius-md"]};
    background: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.03,
      )};

    > div {
      display: flex;
      flex-direction: column-reverse;
      gap: ${space("hair")};

      &.wide {
        grid-column: span 2;
      }
    }

    dt {
      font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
      font-size: ${(props) => props.theme.font.sizes["--font-size-tiny"]};
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-text-muted"]};
    }

    dd {
      margin: 0;
      font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
      /* why: the carry is a long mono line; outdoors one step down (16px)
         keeps it to a line or two at phone width. */
      font-size: ${(props) =>
        props.theme.font.sizes[
          props.theme.outdoorMode ? "--font-size-tiny" : "--font-size-small"
        ]};
      font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    }
  }
`;

export default style;
