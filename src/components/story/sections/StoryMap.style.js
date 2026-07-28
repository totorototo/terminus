import { rgba } from "polished";
import styled from "styled-components";

const style = (Component) => styled(Component)`
  display: block;

  .lede {
    font-size: ${(props) => props.theme.font.sizes["--font-size-medium"]};
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.65,
      )};
    max-width: 34ch;
    margin: 0 0 2rem;
  }

  .map-frame {
    height: min(70vh, 32rem);
    border-radius: ${(props) => props.theme.borderRadius["--border-radius-lg"]};
    border: 1px solid
      ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-text"],
          0.08,
        )};
    overflow: hidden;
  }
`;

export default style;
