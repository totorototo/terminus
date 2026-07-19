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

  .bc-caption {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-width: 0;
    flex: 1;
    padding: 0.4rem 0;
  }

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

  /* ── Distance-scaled connector rail ─────────────────── */

  .bc-row {
    display: flex;
    align-items: center;
    gap: 1.2rem;
    padding-left: 0.05rem;

    /* Dim the caption only — parent opacity would wash out the rail fill,
       which must stay solid as the covered-distance record on past legs */
    .bc-caption {
      opacity: 0.75;
      transition: opacity
        ${(props) => props.theme.transitions["--transition-fast"]};
    }

    &.past .bc-caption {
      opacity: 0.4;
    }

    &.current .bc-caption {
      opacity: 1;
    }
  }

  .bc-rail {
    position: relative;
    width: 7px;
    flex-shrink: 0;
    align-self: stretch;

    /* base track — full leg height, faint */
    &::before {
      content: "";
      position: absolute;
      left: 50%;
      top: 0;
      bottom: 0;
      width: 1px;
      transform: translateX(-50%);
      background: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-text"],
          0.15,
        )};
    }
  }

  /* covered portion of the leg */
  .bc-rail-fill {
    position: absolute;
    left: 50%;
    top: 0;
    width: 2px;
    transform: translateX(-50%);
    border-radius: 1px;
    background: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-primary"],
        0.7,
      )};
  }

  /* runner's projected location within the current leg */
  .bc-bead {
    position: absolute;
    left: 50%;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    z-index: 2;
    background: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-primary"]};
    box-shadow: 0 0 7px
      ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-primary"],
          0.6,
        )};
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

  .cp-body {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    flex: 1;
    min-width: 0;
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

  .cp-line1 {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .cp-line2 {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .cp-name {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-medium"]};
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

  .cp-eta {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-medium"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text"]};
    letter-spacing: -0.5px;
    line-height: 1;
    flex-shrink: 0;
  }

  /* pre-race the ETA column is the planned schedule, not a live prediction —
     dimmed so the two read differently at a glance */
  .cp-eta.planned {
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.5,
      )};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-medium"]};
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
    letter-spacing: 0.8px;
    text-transform: uppercase;
    line-height: 1;
    white-space: nowrap;
  }

  .cp-line2-right {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    flex-shrink: 0;
    white-space: nowrap;
  }

  /* barrière horaire for this checkpoint; breached = predicted arrival later
     than the cutoff (icon + color so the signal isn't color-only) */
  .cp-cutoff {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.35,
      )};
    line-height: 1;
    letter-spacing: 0.2px;

    &.breached {
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-accent"]};
    }
  }

  /* live "in 2h 15m" to the next arrival */
  .cp-countdown {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-primary"]};
    line-height: 1;
    letter-spacing: 0.2px;
  }

  .cp-weather-line {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.625rem 0.875rem;
    border-radius: ${(props) => props.theme.borderRadius["--border-radius-md"]};
    background: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.04,
      )};
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
  }

  .cp-weather-main {
    display: flex;
    align-items: center;
    gap: 0.4rem;
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
