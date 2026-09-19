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
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-text"],
          0.08,
        )};

    &:last-child {
      border-bottom: none;
    }

    &.past {
      opacity: 0.55;
    }

    &.current .checkpoint-name {
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-primary"]};
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
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.6,
      )};
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
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-text"],
          0.6,
        )};
    }

    .cp-weather-temp {
      color: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-text"],
          0.6,
        )};
    }

    /* keep the cold/wet/windy warning legible even after the base mute above */
    .flagged-stat {
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-accent-text"]};
    }
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
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.7,
      )};
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
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.7,
      )};
  }

  .cutoff-value {
    display: flex;
    flex-direction: column;

    &.over {
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-accent-text"]};
    }
  }

  .cutoff-time {
    font-weight: ${(props) => props.theme.font.weights["--font-weight-medium"]};
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.7,
      )};
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
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.6,
      )};
  }

  .checkpoint-badge {
    font-size: ${(props) => props.theme.font.sizes["--font-size-tiny"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.1875rem 0.5rem;
    border-radius: ${(props) => props.theme.borderRadius["--border-radius-lg"]};

    &.tier-ok {
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-success"]};
      background: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-success"],
          0.14,
        )};
    }

    &.tier-tight {
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-primary-text"]};
      background: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant][
            "--color-primary-text"
          ],
          0.14,
        )};
    }

    &.tier-over {
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-accent-text"]};
      background: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-accent-text"],
          0.14,
        )};
    }
  }

  .checkpoint-details-toggle {
    align-self: flex-start;
    margin-top: 0.5rem;
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
