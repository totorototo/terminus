import { rgba } from "polished";
import styled from "styled-components";

const style = (Component) => styled(Component)`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing[2]}px;
  margin-top: ${(props) => props.theme.spacing[4]}px;

  .rb-title {
    display: block;
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-xxsmall"]};
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.5,
      )};
    margin-bottom: ${(props) => props.theme.spacing[2]}px;
  }

  .rb-row {
    display: grid;
    grid-template-columns: minmax(4.5rem, max-content) 1fr minmax(
        3.5rem,
        max-content
      );
    align-items: center;
    gap: ${(props) => props.theme.spacing[3]}px;
  }

  .rb-label,
  .rb-value {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-xsmall"]};
    color: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.65,
      )};
    white-space: nowrap;
  }

  .rb-value {
    text-align: right;
  }

  .rb-track {
    display: block;
    height: ${(props) => props.theme.spacing[3]}px;
    border-radius: ${(props) => props.theme.borderRadius["--border-radius-sm"]};
    background: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.08,
      )};
    overflow: hidden;
  }

  .rb-fill {
    display: block;
    height: 100%;
  }
`;

export default style;
