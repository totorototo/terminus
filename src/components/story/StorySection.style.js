import { rgba } from "polished";
import styled from "styled-components";

import { layout, space } from "../../theme/space.js";

const style = (Component) => styled(Component)`
  display: block;
  width: 100%;
  padding: ${layout("section-block")}
    ${(props) => props.theme.layout["--gutter"]};
  position: relative;

  .section-inner {
    max-width: ${(props) => props.theme.layout["--measure"]};
    margin: 0 auto;
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
    margin-bottom: ${space(3)};
  }

  .title {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: clamp(2.25rem, 6vw, 3.5rem);
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    letter-spacing: -0.03em;
    line-height: 1;
    text-wrap: balance;
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text"]};
    margin: 0 0 ${space(8)};
  }

  .body {
    font-family: ${(props) =>
      props.theme.font.family["--font-family-sansSerif"]};
  }
`;

export default style;
