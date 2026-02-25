import styled from "styled-components";

const style = (Component) => styled(Component)`
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  padding: 1.5rem 1.5rem 2rem;
  width: 100%;
  box-sizing: border-box;
  gap: 1rem;

  .freshness-col {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.4rem;
    flex: 1;
  }

  .freshness-col--right {
    align-items: flex-end;
  }

  .freshness-divider {
    width: 1px;
    background: rgba(244, 247, 245, 0.08);
    align-self: stretch;
    flex-shrink: 0;
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
    margin-bottom: 0.25rem;
  }

  .freshness-value {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: 20px;
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) => props.theme.colors.dark["--color-text"]};
    letter-spacing: -0.5px;
    line-height: 1.1;
  }

  .freshness-sublabel {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: 11px;
    color: rgba(244, 247, 245, 0.4);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
`;

export default style;
