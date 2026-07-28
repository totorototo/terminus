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

  .stage-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
  }

  .stage-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 1rem;
    padding: 0.875rem 0;
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
      opacity: 0.4;
    }

    &.current .stage-name {
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-primary"]};
    }
  }

  .stage-main {
    display: flex;
    flex-direction: column;
  }

  .stage-name {
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
  }

  .stage-km {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.45,
      )};
    margin-top: 0.25rem;
  }

  .stage-eta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    text-align: right;
    white-space: nowrap;
  }

  .stage-cutoff {
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.35,
      )};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-size: ${(props) => props.theme.font.sizes["--font-size-xsmall"]};
    margin-top: 0.25rem;

    &.over {
      color: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-accent"]};
      font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    }
  }
`;

export default style;
