import { rgba } from "polished";
import styled from "styled-components";

const style = (Component) => styled(Component)`
  display: block;

  .empty {
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text-muted"]};
  }

  .checkpoint-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
  }

  .checkpoint-row {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem 0;
    border-bottom: 1px solid
      ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-hairline"]};

    &:last-child {
      border-bottom: none;
    }

    &.past {
      opacity: 0.55;
    }

    &.current .checkpoint-name {
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-primary-text"]};
    }
  }

  .checkpoint-top {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 1rem;
  }

  .checkpoint-main {
    display: flex;
    flex-direction: column;
  }

  .checkpoint-name {
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
  }

  .checkpoint-km {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text-muted"]};
    margin-top: 0.25rem;
  }

  /* why: WeatherLine's own styling is a bordered/backgrounded card, built for
     the old nav-app's denser panel — here it's one more line in an already
     plain-text row, so strip the frame and let it sit flush like
     checkpoint-km/checkpoint-cutoff do. Chained classes (not !important) win
     on specificity over WeatherLine's own single-class rules regardless of
     stylesheet injection order. */
  .checkpoint-weather.cp-weather-line {
    padding: 0;
    background: none;
    border: none;
    /* WeatherLine's own space-between spreads icon/temp and precip/wind to
       the row's full width — fine in its native bordered-card context, but
       this row now spans the whole list width, leaving a wide empty gap.
       Match the gap to cp-weather-detail's own internal spacing (below) so
       temp-to-precip and precip-to-wind read as one consistent rhythm
       instead of a wide gap followed by a tight one. */
    justify-content: flex-start;
    gap: 0.7rem;

    &.flagged {
      background: none;
      border: none;
    }

    .cp-weather-detail {
      gap: 0.7rem;
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-text-muted"]};
    }

    .cp-weather-temp {
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-text-muted"]};
    }

    /* keep the cold/wet/windy warning legible even after the base mute above */
    .flagged-stat {
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-accent-text"]};
    }
  }

  /* why: the details stay mounted so they can animate — a grid row going
     0fr → 1fr opens to the content's own height with no JS measuring. The
     negative margin cancels the row's flex gap while closed. Reduced motion
     is covered by the global rule in ThemedApp; inert keeps the closed
     details out of the tab order and the accessibility tree. */
  .checkpoint-details {
    display: grid;
    grid-template-rows: 0fr;
    margin-top: -0.75rem;
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

  .checkpoint-details-inner {
    min-height: 0;
    overflow: hidden;
  }

  .checkpoint-stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.625rem 1.5rem;
    padding: 0.75rem;
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
    gap: 0.125rem;

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
    gap: 0.375rem;
  }

  .difficulty-dot {
    flex-shrink: 0;
    width: 0.5rem;
    height: 0.5rem;
    border-radius: ${(props) =>
      props.theme.borderRadius["--border-radius-full"]};
  }

  .checkpoint-eta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.375rem;
    text-align: right;
    white-space: nowrap;
  }

  .checkpoint-eta-time {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-medium"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text"]};
  }

  .checkpoint-remaining {
    font-weight: ${(props) => props.theme.font.weights["--font-weight-medium"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text-muted"]};
  }

  /* why: outlined, no tint fill — the 14% fill dropped the label under
     4.5:1 (light OK 1.7:1). The word carries the state; colour repeats it. */
  .checkpoint-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.1875rem 0.5rem;
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
  .checkpoint-figures {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.625rem 1.5rem;
    margin: 0;
    padding: 0.75rem;
    border-radius: ${(props) => props.theme.borderRadius["--border-radius-md"]};
    background: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.03,
      )};

    > div {
      display: flex;
      flex-direction: column-reverse;
      gap: 0.125rem;
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

  .checkpoint-details-toggle {
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
