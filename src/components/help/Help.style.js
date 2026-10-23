import { rgba } from "polished";
import styled, { keyframes } from "styled-components";

import { space } from "../../theme/space.js";

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const style = (Component) => styled(Component)`
  position: fixed;
  inset: 0;
  overflow-y: auto;
  background: ${(props) =>
    props.theme.colors[props.theme.currentVariant]["--color-background"]};
  color: ${(props) =>
    props.theme.colors[props.theme.currentVariant]["--color-text"]};
  font-family: ${(props) => props.theme.font.family["--font-family-base"]};

  /* ── HEADER ── */
  .help-header {
    position: sticky;
    top: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    gap: ${space(4)};
    padding: calc(env(safe-area-inset-top) + ${space(3)}) ${space(6)}
      ${space(3)};
    background: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-background"],
        0.88,
      )};
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-bottom: 1px solid
      ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-text"],
          0.07,
        )};
  }

  .back-btn {
    flex-shrink: 0;
    background: none;
    border: none;
    cursor: pointer;
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: 0.8125rem;
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.85,
      )};
    padding: 0;
    transition: color ${(props) => props.theme.transitions["--transition-fast"]};
    -webkit-tap-highlight-color: transparent;

    &:hover {
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-text"]};
    }
  }

  .help-title {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: 0.8125rem;
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text-muted"]};
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .section-nav {
    margin-left: auto;
    display: flex;
    gap: ${space("hair")};
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  .nav-btn {
    flex-shrink: 0;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.75rem;
    font-weight: 500;
    padding: ${space(2)} ${space(3)};
    border-radius: 100px;
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.85,
      )};
    transition: all ${(props) => props.theme.transitions["--transition-fast"]};
    -webkit-tap-highlight-color: transparent;

    &:hover {
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-text"]};
      background: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-text"],
          0.06,
        )};
    }
  }

  /* ── MAIN ── */
  .help-main {
    max-width: 800px;
    margin: 0 auto;
    padding: 0 ${space(6)} ${space(16)};
  }

  /* ── HERO ── */
  .hero {
    text-align: center;
    padding: ${space(20)} 0 ${space(16)};
    animation: ${fadeUp} 0.45s ease both;

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  }

  .hero-eyebrow {
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-secondary-text"]};
    margin-bottom: ${space(4)};
  }

  .hero-title {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: clamp(3rem, 12vw, 6rem);
    font-weight: 900;
    letter-spacing: -0.05em;
    line-height: 1;
    margin: 0 0 ${space(5)};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text"]};
  }

  .hero-sub {
    font-size: 1rem;
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.85,
      )};
    max-width: 400px;
    margin: 0 auto;
  }

  /* ── SECTIONS ── */
  .section {
    margin-bottom: ${space(20)};
    animation: ${fadeUp} 0.45s ease both;

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  }

  .sec-label {
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-primary-text"]};
    margin-bottom: ${space(2)};

    &.secondary {
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant][
          "--color-secondary-text"
        ]};
    }
  }

  .sec-title {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: clamp(1.5rem, 4vw, 2.25rem);
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1.1;
    margin: 0 0 ${space(4)};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text"]};
  }

  .sec-body {
    font-size: 0.9375rem;
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.85,
      )};
    line-height: 1.72;
    max-width: 640px;

    &.pace-intro {
      margin-top: ${space(7)};
    }
  }

  .divider {
    border: none;
    height: 1px;
    background: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.07,
      )};
    margin: 0 0 ${space(20)};
  }

  /* ── ROLE CARDS ── */
  .role-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: ${space(4)};
    margin-top: ${space(7)};

    @media (max-width: 540px) {
      grid-template-columns: 1fr;
    }
  }

  .role-card {
    background: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-surface"],
        0.6,
      )};
    border: 1px solid
      ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-text"],
          0.08,
        )};
    border-radius: ${(props) => props.theme.borderRadius["--border-radius-lg"]};
    padding: ${space(7)} ${space(6)};
    position: relative;
    overflow: hidden;
    transition: all ${(props) => props.theme.transitions["--transition-base"]};

    &::after {
      content: "";
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 2px;
      opacity: 0;
      transition: opacity 0.3s;
    }

    &.rn::after {
      background: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-primary"]};
    }
    &.fo::after {
      background: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-secondary"]};
    }

    &:hover {
      transform: translateY(-3px);
      border-color: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-text"],
          0.16,
        )};

      &::after {
        opacity: 1;
      }
    }

    &.rn:hover {
      box-shadow: 0 16px 40px
        ${(props) =>
          rgba(
            props.theme.colors[props.theme.currentVariant]["--color-primary"],
            0.18,
          )};
    }

    &.fo:hover {
      box-shadow: 0 16px 40px
        ${(props) =>
          rgba(
            props.theme.colors[props.theme.currentVariant]["--color-secondary"],
            0.2,
          )};
    }

    h3 {
      font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
      font-size: 1.0625rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-bottom: ${space(2)};
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-text"]};
    }

    p {
      font-size: 0.8125rem;
      color: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-text"],
          0.85,
        )};
      line-height: 1.6;
    }
  }

  .role-icon {
    width: 44px;
    height: 44px;
    border-radius: 11px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: ${space(5)};

    .role-card.rn & {
      background: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-primary"],
          0.12,
        )};
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-primary-text"]};
    }

    .role-card.fo & {
      background: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-secondary"],
          0.12,
        )};
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant][
          "--color-secondary-text"
        ]};
    }
  }

  /* ── FEAT GRID ── */
  .feat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: ${space(3)};
    margin-top: ${space(6)};
  }

  .feat {
    background: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-surface"],
        0.5,
      )};
    border: 1px solid
      ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-text"],
          0.07,
        )};
    border-radius: ${(props) =>
      props.theme.borderRadius["--border-radius-base"]};
    padding: ${space(4)} ${space(5)};
    transition: all ${(props) => props.theme.transitions["--transition-fast"]};

    &:hover {
      border-color: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-text"],
          0.14,
        )};
      transform: translateY(-1px);
    }

    h4 {
      font-size: 0.8125rem;
      font-weight: 700;
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-text"]};
      margin-bottom: ${space(2)};
      display: flex;
      align-items: center;
      gap: ${space(2)};
    }

    p {
      font-size: 0.75rem;
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-text-muted"]};
      line-height: 1.55;
    }
  }

  .dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    flex-shrink: 0;
    background: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-primary"]};

    &.t {
      background: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-secondary"]};
    }

    &.g {
      background: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-success"]};
    }
  }

  /* ── PANEL LIST ── */
  .panel-list {
    display: flex;
    flex-direction: column;
    gap: ${space(2)};
    margin-top: ${space(6)};
  }

  .pi {
    display: flex;
    align-items: flex-start;
    gap: ${space(4)};
    padding: ${space(4)} ${space(4)};
    background: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-surface"],
        0.5,
      )};
    border: 1px solid
      ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-text"],
          0.07,
        )};
    border-radius: ${(props) =>
      props.theme.borderRadius["--border-radius-base"]};
    transition: all ${(props) => props.theme.transitions["--transition-fast"]};

    &:hover {
      border-color: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-text"],
          0.14,
        )};
      background: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-surface"],
          0.7,
        )};
    }
  }

  .pi-icon {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 1px;

    &.primary {
      background: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-primary"],
          0.12,
        )};
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-primary-text"]};
    }

    &.secondary {
      background: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-secondary"],
          0.12,
        )};
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant][
          "--color-secondary-text"
        ]};
    }
  }

  .pi-name {
    font-size: 0.8125rem;
    font-weight: 700;
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text"]};
    margin-bottom: ${space(1)};
  }

  .pi-desc {
    font-size: 0.75rem;
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text-muted"]};
    line-height: 1.5;
  }

  /* ── TABLE ── */
  .gtable {
    width: 100%;
    border-collapse: collapse;
    margin-top: ${space(5)};
    font-size: 0.875rem;

    thead th {
      text-align: left;
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-text-faint"]};
      padding: ${space(2)} ${space(4)};
      border-bottom: 1px solid
        ${(props) =>
          rgba(
            props.theme.colors[props.theme.currentVariant]["--color-text"],
            0.08,
          )};
    }

    td {
      padding: ${space(3)} ${space(4)};
      border-bottom: 1px solid
        ${(props) =>
          rgba(
            props.theme.colors[props.theme.currentVariant]["--color-text"],
            0.05,
          )};
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-text-muted"]};
      vertical-align: top;
    }

    td:first-child {
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-text"]};
      font-weight: 600;
      white-space: nowrap;
    }

    tr:last-child td {
      border-bottom: none;
    }

    tr:hover td {
      background: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-surface"],
          0.4,
        )};
    }
  }

  /* ── INFO BOX ── */
  .info-box {
    margin-top: ${space(5)};
    padding: ${space(4)} ${space(5)};
    background: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-secondary"],
        0.08,
      )};
    border: 1px solid
      ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-secondary"],
          0.2,
        )};
    border-radius: ${(props) =>
      props.theme.borderRadius["--border-radius-base"]};
    font-size: 0.8125rem;
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text-muted"]};
    line-height: 1.6;

    strong {
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant][
          "--color-secondary-text"
        ]};
    }
  }

  /* ── FOOTER ── */
  .help-footer {
    text-align: center;
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: 0.6875rem;
    letter-spacing: 0.04em;
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text-faint"]};
    padding-top: ${space(8)};
    border-top: 1px solid
      ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-text"],
          0.06,
        )};
  }
`;

export default style;
