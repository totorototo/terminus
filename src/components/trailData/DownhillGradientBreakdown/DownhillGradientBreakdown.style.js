import { rgba } from "polished";
import styled from "styled-components";

const style = (Component) => styled(Component)`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.space["--space-1"]};
  margin-top: ${(props) => props.theme.space["--space-4"]};

  .dd-title {
    display: block;
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-xxsmall"]};
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text-muted"]};
    margin-bottom: ${(props) => props.theme.space["--space-1"]};
  }

  .dd-row {
    display: grid;
    grid-template-columns: minmax(4.5rem, max-content) 1fr minmax(
        3.5rem,
        max-content
      );
    align-items: center;
    gap: ${(props) => props.theme.space["--space-2"]};
  }

  .dd-label,
  .dd-value {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-xsmall"]};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text-muted"]};
    white-space: nowrap;
  }

  .dd-value {
    text-align: right;
  }

  .dd-track {
    display: block;
    height: ${(props) => props.theme.space["--space-2"]};
    border-radius: ${(props) => props.theme.borderRadius["--border-radius-sm"]};
    background: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.08,
      )};
    overflow: hidden;
  }

  .dd-fill {
    display: block;
    height: 100%;
  }
`;

export default style;
