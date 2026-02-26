import { rgba } from "polished";
import styled from "styled-components";

const style = (Component) => styled(Component)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem 1rem;
  width: 100%;
  height: 100%;
  box-sizing: border-box;

  .freshness-left {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.3rem;
  }

  .freshness-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .freshness-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.3rem;
    opacity: 0.65;

    .freshness-value {
      font-size: ${(props) => props.theme.font.sizes["--font-size-medium"]};
    }
  }

  .freshness-dot {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: ${(props) =>
      props.theme.borderRadius["--border-radius-full"]};
    flex-shrink: 0;
    transition: background
      ${(props) => props.theme.transitions["--transition-xslow"]};
  }

  .freshness-value {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-large"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) => props.theme.colors.dark["--color-text"]};
    letter-spacing: -0.5px;
    line-height: 1.1;
  }

  .freshness-sublabel {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    color: ${(props) => rgba(props.theme.colors.dark["--color-text"], 0.4)};
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
`;

export default style;
