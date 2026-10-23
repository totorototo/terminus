import styled from "styled-components";

import { layout, space } from "../../theme/space.js";

const color = (token) => (props) =>
  props.theme.colors[props.theme.currentVariant][token];
const mono = (props) => props.theme.font.family["--font-family-mono"];

const style = (Component) => styled(Component)`
  position: fixed;
  inset: 0;
  overflow-y: auto;
  background: ${color("--color-background")};
  color: ${color("--color-text")};
  font-family: ${(props) => props.theme.font.family["--font-family-sansSerif"]};

  /* The start page's column: the measure, centred, the gutter at the sides. */
  .content {
    display: flex;
    flex-direction: column;
    min-height: 100%;
    max-width: ${(props) => props.theme.layout["--measure"]};
    margin: 0 auto;
    padding: 0 ${(props) => props.theme.layout["--gutter"]};
    box-sizing: content-box;
  }

  /* As the start page's: level with the theme toggle. */
  .masthead {
    display: flex;
    align-items: center;
    min-height: 44px;
    gap: ${space(3)};
    margin: calc(env(safe-area-inset-top, 0px) + ${space(5)}) 0 ${space(4)};

    .mark {
      width: 44px;
      height: 44px;
      flex: none;
      margin-left: calc(-44px * 8 / 64);
    }

    .mark path {
      fill: ${color("--color-primary")};
    }

    h1 {
      font-family: ${mono};
      font-size: ${(props) => props.theme.font.sizes["--font-size-xlarge"]};
      font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
      letter-spacing: -0.04em;
      line-height: 1;
      margin: 0;
    }
  }

  /* The way out of the page, which an installed app has no browser button for. */
  .back {
    display: flex;
    align-items: center;
    gap: ${space(2)};
    align-self: flex-start;
    min-height: 44px;
    margin-bottom: calc(${layout("start-gap")} - 44px);
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    font-family: ${mono};
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    color: ${color("--color-text-muted")};
    -webkit-tap-highlight-color: transparent;

    &:hover {
      color: ${color("--color-text")};
    }
  }

  .eyebrow {
    display: block;
    font-family: ${mono};
    font-size: ${(props) => props.theme.font.sizes["--font-size-tiny"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: ${color("--color-text-muted")};
    margin-bottom: ${space(4)};
  }

  .title,
  .section-title {
    font-family: ${mono};
    font-size: clamp(2.25rem, 6vw, 3.5rem);
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    letter-spacing: -0.03em;
    line-height: 1;
    text-wrap: balance;
  }

  .title {
    max-width: 16ch;
    margin: 0 0 ${space(4)};
  }

  .lede {
    max-width: ${layout("measure-lede")};
    margin: 0 0 ${space(10)};
    color: ${color("--color-text-muted")};
  }

  /* The start page's file rows, as a table of contents. */
  .contents {
    display: flex;
    flex-direction: column;
    max-width: ${layout("measure-list")};
    border-top: 1px solid ${color("--color-hairline")};
  }

  .contents-row {
    display: flex;
    align-items: center;
    min-height: 44px;
    padding: ${space(3)} 0;
    border: none;
    border-bottom: 1px solid ${color("--color-hairline")};
    background: none;
    cursor: pointer;
    text-align: left;
    font-family: ${mono};
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${color("--color-text")};
    transition: color ${(props) => props.theme.transitions["--transition-base"]};
    -webkit-tap-highlight-color: transparent;

    &:hover {
      color: ${color("--color-primary-text")};
    }
  }

  /* A story section: eyebrow, title, then its text and rows. */
  .section {
    padding-top: ${layout("section-block")};
    scroll-margin-top: ${space(6)};
  }

  .section-title {
    margin: 0 0 ${space(8)};
  }

  .body {
    max-width: 60ch;
    margin: 0 0 ${space(6)};
    line-height: 1.6;
    color: ${color("--color-text-muted")};
  }

  .rows {
    margin: 0 0 ${space(6)};
    border-top: 1px solid ${color("--color-hairline")};
  }

  .row {
    display: grid;
    grid-template-columns: 12rem minmax(0, 1fr);
    gap: ${space(6)};
    padding: ${space(4)} 0;
    border-bottom: 1px solid ${color("--color-hairline")};

    /* breakpoint-sm: labels go above their rows. */
    @media (max-width: ${(props) => props.theme.breakpoints[0]}) {
      grid-template-columns: minmax(0, 1fr);
      gap: ${space(1)};
    }
  }

  dt {
    font-family: ${mono};
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    line-height: 1.6;
  }

  dd {
    margin: 0;
    max-width: 60ch;
    line-height: 1.6;
    color: ${color("--color-text-muted")};

    strong {
      color: ${color("--color-text")};
    }
  }

  .note {
    max-width: 60ch;
    margin: 0 0 ${space(6)};
    font-family: ${mono};
    font-size: 0.75rem;
    line-height: 1.5;
    color: ${color("--color-text-muted")};
  }

  /* Centred at the foot, as the start page's. */
  .footer {
    margin-top: auto;
    padding: ${space(16)} 0 ${space(10)};
    text-align: center;
    font-family: ${mono};
    font-size: 0.6875rem;
    letter-spacing: 0.04em;
    color: ${color("--color-text-muted")};
  }
`;

export default style;
