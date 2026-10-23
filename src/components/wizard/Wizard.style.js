import { rgba } from "polished";
import styled from "styled-components";

import { layout, space } from "../../theme/space.js";

const topFadeDistance = (props) => `${props.theme.space["--space-8"]}`;

const style = (Component) => styled(Component)`
  background-color: var(--color-background);
  color: var(--color-text);
  width: 100%;
  height: 100%;
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
  padding-bottom: env(safe-area-inset-bottom, 0px);

  /* why: same Apple Music-style top fade as TrailerScreen —
     the wizard is just another full-bleed screen now, not a modal, so it
     shares its masking so the transition into it doesn't jump. */
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

  /* The suite's start page: the masthead, then the eyebrow and title, on the measure,
     centred (Retrace's setup, Waymark's and Regimen's start). */
  .content {
    display: flex;
    flex-direction: column;
    max-width: ${(props) => props.theme.layout["--measure"]};
    /* At least the screen's height, so the footer sits at its foot, as the other apps'. */
    min-height: 100%;
    margin: 0 auto;
    padding: 0 ${(props) => props.theme.layout["--gutter"]};
    box-sizing: content-box;
  }

  /* Level with the theme toggle: same top offset, same 44px height. */
  .masthead {
    display: flex;
    align-items: center;
    min-height: 44px;
    gap: ${space(3)};
    margin: calc(env(safe-area-inset-top, 0px) + ${space(5)}) 0
      ${layout("start-gap")};

    /* The first panel starts 8 of the mark's 64 in: pulled back to line up with the text
       below. */
    .mark {
      width: 44px;
      height: 44px;
      flex: none;
      margin-left: calc(-44px * 8 / 64);
    }

    /* One ink, as the favicon's: dark's primary is its gold, light's its blue. */
    .mark path {
      fill: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-primary"]};
    }

    h1 {
      font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
      font-size: ${(props) => props.theme.font.sizes["--font-size-xlarge"]};
      font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
      letter-spacing: -0.04em;
      line-height: 1;
      margin: 0;
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-text"]};
    }
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
    margin-bottom: ${space(4)};
  }

  .title {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: clamp(2.25rem, 6vw, 3.5rem);
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    letter-spacing: -0.03em;
    line-height: 1;
    max-width: 16ch;
    text-wrap: balance;
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text"]};
    margin: 0 0 ${space(4)};
  }

  .subtitle {
    font-size: ${(props) => props.theme.font.sizes["--font-size"]};
    /* why: this text sits directly on the flat --color-background (no
       glassMorphism card behind it anymore) — 0.85 is the app's existing
       floor for that context (see StoryHero's eyebrow/stat-label/
       build-number), the lowest opacity that still clears WCAG AA 4.5:1
       against the light-theme background. */
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.85,
      )};
    margin: 0 0 ${space(10)};
    max-width: ${layout("measure-lede")};
  }

  .choices {
    display: flex;
    flex-direction: column;
    max-width: ${layout("measure-list")};
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
    gap: ${space(4)};
    width: 100%;
    padding: ${space(4)} 0;
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
        props.theme.colors[props.theme.currentVariant]["--color-primary-text"]};
    }

    &:active {
      opacity: 0.7;
    }
  }

  .choice-label {
    letter-spacing: -0.01em;
  }

  .choice-btn {
    align-items: center;

    &:disabled {
      cursor: progress;
      opacity: 0.7;
    }

    /* Waiting for the GPX, not working: plain unavailable. */
    &:disabled:not([aria-busy="true"]) {
      cursor: not-allowed;
      opacity: 0.5;
    }
  }

  &.dragging .choices {
    outline: 2px dashed
      ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-primary"]};
    outline-offset: 0.75rem;
  }

  .drop-hint,
  .note {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: 0.75rem;
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.85,
      )};
  }

  .drop-hint {
    margin: ${space(3)} 0 0;
  }

  .error {
    margin: ${space(3)} 0 0;
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-accent-text"]};
  }

  .note {
    margin: ${space(8)} 0 0;
    max-width: 40ch;
    line-height: 1.5;
  }

  .help-link {
    display: flex;
    align-items: center;
    gap: ${space(2)};
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
        0.85,
      )};
    transition: color ${(props) => props.theme.transitions["--transition-fast"]};
    -webkit-tap-highlight-color: transparent;
    margin-top: ${space(6)};

    &:hover {
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-text"]};
    }
  }

  /* Centred and at the foot, as the other apps' footer (the column is centred, so its middle
     is the page's). */
  .footer {
    margin-top: auto;
    padding: ${space(12)} 0 ${space(10)};
    text-align: center;
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: 0.6875rem;
    letter-spacing: 0.04em;
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.85,
      )};
  }
`;

export default style;
