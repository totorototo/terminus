import { rgba } from "polished";
import styled from "styled-components";

const topFadeDistance = (props) => `${props.theme.spacing[5]}px`;

const style = (Component) => styled(Component)`
  background-color: var(--color-background);
  color: var(--color-text);
  width: 100%;
  height: 100%;
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
  padding-bottom: env(safe-area-inset-bottom, 0px);

  /* why: same Apple Music-style top fade as TrailerScreen/FollowerScreen —
     the wizard is just another full-bleed screen now, not a modal, so it
     shares their masking so the transition into either doesn't jump. */
  mask-image: linear-gradient(
    to bottom,
    transparent 0,
    transparent env(safe-area-inset-top, 0px),
    black calc(env(safe-area-inset-top, 0px) + ${topFadeDistance})
  );
  -webkit-mask-image: linear-gradient(
    to bottom,
    transparent 0,
    transparent env(safe-area-inset-top, 0px),
    black calc(env(safe-area-inset-top, 0px) + ${topFadeDistance})
  );

  .content {
    display: flex;
    flex-direction: column;
    min-height: 92vh;
    justify-content: center;
    padding: clamp(4rem, 14vh, 7rem) clamp(1.25rem, 6vw, 4rem);
  }

  .eyebrow {
    display: block;
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-tiny"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.85,
      )};
    margin-bottom: 1rem;
  }

  .title {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: clamp(2.75rem, 11vw, 5rem);
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    letter-spacing: -0.04em;
    line-height: 0.98;
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text"]};
    margin: 0 0 0.75rem;
  }

  .subtitle {
    font-size: ${(props) => props.theme.font.sizes["--font-size"]};
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.6,
      )};
    margin: 0 0 2.5rem;
    max-width: 32ch;
  }

  .choices {
    display: flex;
    flex-direction: column;
    max-width: 28rem;
    border-top: 1px solid
      ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-text"],
          0.1,
        )};
  }

  .choice-btn {
    display: flex;
    align-items: baseline;
    justify-content: flex-start;
    gap: 0.875rem;
    width: 100%;
    padding: 1rem 0;
    border: none;
    border-bottom: 1px solid
      ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-text"],
          0.1,
        )};
    background: none;
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text"]};
    cursor: pointer;
    transition: color ${(props) => props.theme.transitions["--transition-base"]};
    -webkit-tap-highlight-color: transparent;

    &:hover {
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-primary"]};
    }

    &:active {
      opacity: 0.7;
    }
  }

  .choice-index {
    font-size: ${(props) => props.theme.font.sizes["--font-size-xsmall"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-medium"]};
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.4,
      )};
  }

  .choice-label {
    letter-spacing: -0.01em;
  }

  .error-state {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.625rem;
  }

  .retry-btn {
    background: none;
    border: 1px solid
      ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-text"],
          0.15,
        )};
    border-radius: ${(props) =>
      props.theme.borderRadius["--border-radius-base"]};
    padding: 0.625rem 1.25rem;
    cursor: pointer;
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text"]};
    transition: all ${(props) => props.theme.transitions["--transition-base"]};
    -webkit-tap-highlight-color: transparent;

    &:hover {
      border-color: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-primary"],
          0.4,
        )};
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-primary"]};
    }
  }

  .help-link {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    align-self: flex-start;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: 0.75rem;
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.4,
      )};
    transition: color ${(props) => props.theme.transitions["--transition-fast"]};
    -webkit-tap-highlight-color: transparent;
    margin-top: 1.5rem;

    &:hover {
      color: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-text"],
          0.7,
        )};
    }
  }

  .footer {
    margin-top: 3rem;
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: 0.6875rem;
    letter-spacing: 0.04em;
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.4,
      )};
  }
`;

export default style;
