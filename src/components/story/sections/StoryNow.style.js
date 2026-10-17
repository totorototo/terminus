import { rgba } from "polished";
import styled, { keyframes } from "styled-components";

const blink = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.25; }
`;

const style = (Component) => styled(Component)`
  display: block;

  .live-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-xsmall"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-accent-text"]};
    margin-bottom: 1.5rem;
  }

  .live-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-accent"]};
    animation: ${blink} 1.6s ease-in-out infinite;

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  }

  .now-row {
    display: flex;
    flex-wrap: wrap;
    gap: clamp(1.5rem, 5vw, 3rem);
  }

  .now-stat {
    display: flex;
    flex-direction: column;
  }

  .now-value {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: clamp(1.75rem, 4vw, 2.5rem);
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    letter-spacing: -0.02em;
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text"]};

    &[data-tone="behind"] {
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-behind-text"]};
    }

    &[data-tone="ahead"] {
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-ahead-text"]};
    }
  }

  .now-label {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-top: 0.375rem;
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text-muted"]};
  }

  .now-note {
    margin: 1.75rem 0 0.75rem;
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text-muted"]};
  }

  .track-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 44px;
    background: none;
    border: 1px solid
      ${(props) =>
        props.theme.colors[props.theme.currentVariant][
          "--color-control-border"
        ]};
    border-radius: ${(props) =>
      props.theme.borderRadius["--border-radius-base"]};
    padding: 0.625rem 1.125rem;
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-accent-text"]};
    cursor: pointer;
    transition: all ${(props) => props.theme.transitions["--transition-base"]};

    &:hover {
      background: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-accent"],
          0.1,
        )};
    }

    &.on {
      background: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-accent"],
          0.12,
        )};
    }
  }
`;

export default style;
