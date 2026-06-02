import { rgba } from "polished";
import styled from "styled-components";

const text = (props) =>
  props.theme.colors[props.theme.currentVariant]["--color-text"];
const background = (props) =>
  props.theme.colors[props.theme.currentVariant]["--color-background"];
const primary = (props) =>
  props.theme.colors[props.theme.currentVariant]["--color-primary"];

const style = (Component) => styled(Component)`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding: 0 0.75rem;
  overflow: hidden;

  .settings-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 0.4rem;
    border-bottom: 1px solid ${(props) => rgba(text(props), 0.07)};
    margin-bottom: 0.75rem;
    flex-shrink: 0;
  }

  .header-label {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-tiny"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) => rgba(text(props), 0.35)};
    letter-spacing: 1.5px;
    text-transform: uppercase;
  }

  .reset-btn {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    border: none;
    background: transparent;
    cursor: pointer;
    color: ${(props) => rgba(text(props), 0.5)};
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-tiny"]};
    text-transform: uppercase;
    letter-spacing: 1px;
    transition: color ${(props) => props.theme.transitions["--transition-fast"]};

    &:hover {
      color: ${(props) => text(props)};
    }
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    margin-bottom: 1rem;
  }

  .field-label {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    color: ${(props) => rgba(text(props), 0.85)};

    strong {
      font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
      font-variant-numeric: tabular-nums;
      color: ${(props) => primary(props)};
    }
  }

  .field-hint {
    font-size: ${(props) => props.theme.font.sizes["--font-size-tiny"]};
    color: ${(props) => rgba(text(props), 0.45)};
  }

  input[type="range"] {
    width: 100%;
    appearance: none;
    -webkit-appearance: none;
    height: 4px;
    border-radius: 999px;
    background: ${(props) => rgba(text(props), 0.18)};
    cursor: pointer;
    outline: none;

    &::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: ${(props) => primary(props)};
      border: 2px solid ${(props) => background(props)};
      cursor: pointer;
    }

    &::-moz-range-thumb {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: ${(props) => primary(props)};
      border: 2px solid ${(props) => background(props)};
      cursor: pointer;
    }

    &:focus-visible {
      box-shadow: 0 0 0 3px ${(props) => rgba(primary(props), 0.4)};
    }
  }
`;

export default style;
