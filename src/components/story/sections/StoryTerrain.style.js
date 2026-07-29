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
    margin: 0 0 3rem;
  }

  .chart-frame {
    padding: 2rem 1.5rem;
    border-radius: ${(props) => props.theme.borderRadius["--border-radius-lg"]};
    border: 1px solid
      ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-text"],
          0.08,
        )};
  }

  .slope-frame {
    margin-top: 1rem;
    padding: 1rem 1.5rem;
  }
`;

export default style;
