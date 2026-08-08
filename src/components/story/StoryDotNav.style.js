import { rgba } from "polished";
import styled from "styled-components";

const style = (Component) => styled(Component)`
  position: fixed;
  top: 50%;
  /* why: StorySection's own horizontal padding (clamp(1.25rem, 6vw, 4rem))
     leaves a ~20-29px gutter on phone widths — the whole reachable budget
     for this control. A 44px touch target doesn't fit that gutter without
     sitting on top of card borders and in-content color swatches (seen
     directly overlapping the Slope legend on a 390px viewport); staying
     narrow and tall trades some touch-target width for not fighting the
     content it floats over. */
  right: calc(env(safe-area-inset-right, 0px) + 2px);
  transform: translateY(-50%);
  z-index: ${(props) => props.theme.zIndex["--z-index-overlay"]};
  display: flex;
  flex-direction: column;
  align-items: center;
  /* why: dragging the strip is the primary interaction now (see
     StoryDotNav.jsx) — without this, a touch that starts here and moves
     more than a few px reads as an attempted page scroll/select on some
     browsers before our pointermove handler gets a chance to preventDefault. */
  touch-action: none;

  .callout {
    position: absolute;
    right: 100%;
    margin-right: 10px;
    transform: translateY(-50%);
    white-space: nowrap;
    padding: 0.4rem 0.7rem;
    border-radius: ${(props) =>
      props.theme.borderRadius["--border-radius-base"]};
    background: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.12,
      )};
    border: 1px solid
      ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-text"],
          0.4,
        )};
    backdrop-filter: blur(8px);
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text"]};
    pointer-events: none;
  }

  /* why: a faint spine through the dots' centers reads them as one control
     handled as a set, not a scatter of stray marks — a small echo of the
     route contour this nav is an alternative to. */
  &::before {
    content: "";
    position: absolute;
    top: 13px;
    bottom: 13px;
    left: 50%;
    width: 1px;
    transform: translateX(-50%);
    background: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-secondary"],
        0.2,
      )};
    z-index: -1;
  }

  .dot {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 26px;
    padding: 0;
    background: none;
    border: none;
    cursor: pointer;

    &::before {
      content: "";
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-text"],
          0.35,
        )};
      /* why: a soft halo of the page background keeps the dot legible when
         it drifts over busy in-content graphics (charts, colored legend
         swatches) it has no control over, without adding a visible chrome
         backdrop to the nav itself. */
      box-shadow: 0 0 0 3px
        ${(props) =>
          rgba(
            props.theme.colors[props.theme.currentVariant][
              "--color-background"
            ],
            0.65,
          )};
      transition: all ${(props) => props.theme.transitions["--transition-base"]};
    }

    &.active::before {
      width: 7px;
      height: 7px;
      background: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-accent"]};
      box-shadow:
        0 0 0 3px
          ${(props) =>
            rgba(
              props.theme.colors[props.theme.currentVariant][
                "--color-background"
              ],
              0.65,
            )},
        0 0 8px
          ${(props) =>
            rgba(
              props.theme.colors[props.theme.currentVariant]["--color-accent"],
              0.7,
            )};
    }

    &:hover::before {
      background: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-text"],
          0.7,
        )};
    }
  }
`;

export default style;
