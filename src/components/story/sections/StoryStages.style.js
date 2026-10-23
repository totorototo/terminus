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

  .stage-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
  }

  .stage-row {
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

    &.current .stage-name {
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-primary-text"]};
    }
  }

  .stage-top {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: ${space(4)};
  }

  .stage-main {
    display: flex;
    flex-direction: column;
  }

  .stage-name {
    font-size: ${(props) => props.theme.font.sizes["--font-size-medium"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
  }

  .stage-km {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text-muted"]};
    margin-top: ${space(1)};
  }

  /* why: the details stay mounted so they can animate — a grid row going
     0fr → 1fr opens to the content's own height with no JS measuring. The
     negative margin cancels the row's flex gap while closed. Reduced motion
     is covered by the global rule in ThemedApp; inert keeps the closed
     details out of the tab order and the accessibility tree. */
  .stage-details {
    display: grid;
    grid-template-rows: 0fr;
    margin-top: calc(-1 * ${space(3)});
    opacity: 0;
    transition:
      grid-template-rows
        ${(props) => props.theme.transitions["--transition-standard"]},
      margin-top ${(props) => props.theme.transitions["--transition-standard"]},
      opacity ${(props) => props.theme.transitions["--transition-standard"]};

    &.open {
      grid-template-rows: 1fr;
      margin-top: 0;
      opacity: 1;
    }
  }

  .stage-details-inner {
    min-height: 0;
    overflow: hidden;
  }

  .stage-stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: ${space(3)} ${space(6)};
    padding: ${space(3)};
    border-radius: ${(props) => props.theme.borderRadius["--border-radius-md"]};
    background: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.03,
      )};
  }

  .stat-cell {
    display: flex;
    flex-direction: column;
    gap: ${space("hair")};

    &.wide {
      grid-column: span 2;
    }
  }

  .stat-label {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-tiny"]};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text-muted"]};
  }

  .stat-value {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text"]};
  }

  .stacked-value {
    display: flex;
    flex-direction: column;
  }

  .stat-sub {
    font-weight: ${(props) => props.theme.font.weights["--font-weight-medium"]};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text-muted"]};
  }

  .difficulty-value {
    display: flex;
    align-items: center;
    gap: ${space(2)};
  }

  .difficulty-dot {
    flex-shrink: 0;
    width: 0.5rem;
    height: 0.5rem;
    border-radius: ${(props) =>
      props.theme.borderRadius["--border-radius-full"]};
  }

  .stage-eta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: ${space(2)};
    text-align: right;
    white-space: nowrap;
  }

  .stage-eta-time {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-medium"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text"]};
  }

  /* why: outlined, no tint fill — the 14% fill dropped the label under
     4.5:1 (light OK 1.7:1). The word carries the state; colour repeats it. */
  .stage-badge {
    display: inline-flex;
    align-items: center;
    padding: ${space(1)} ${space(2)};
    border: 1px solid currentColor;
    border-radius: ${(props) => props.theme.borderRadius["--border-radius-lg"]};
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-tiny"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    letter-spacing: 0.05em;
    text-transform: uppercase;
    white-space: nowrap;

    &.tier-ok {
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-success-text"]};
    }

    &.tier-tight {
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-primary-text"]};
    }

    &.tier-over {
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-behind-text"]};
    }
  }

  /* Cutoff and Margin: the row's two figures, value over label. */
  .stage-figures {
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
      font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
      font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};

      &.is-over {
        color: ${(props) =>
          props.theme.colors[props.theme.currentVariant][
            "--color-behind-text"
          ]};
      }
    }
  }

  .stage-details-toggle {
    align-self: flex-start;
    min-height: 44px;
    padding: 0;
    border: none;
    background: none;
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    font-weight: ${(props) =>
      props.theme.font.weights["--font-weight-semibold"]};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-primary-text"]};
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  }
`;

export default style;
