import styled from "styled-components";

const style = (Component) => styled(Component)`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  height: 100%;
  padding: 1.5rem 1rem;

  .progression-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }

  .progression-label {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: 12px;
    font-weight: ${(props) => props.theme.font.weights["--font-weight-light"]};
    color: rgba(244, 247, 245, 0.5);
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  .progression-value {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: 24px;
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) => props.theme.colors.dark["--color-primary"]};
  }

  .progress-bar {
    width: 100%;
    height: 8px;
    background: rgba(244, 247, 245, 0.1);
    border-radius: 4px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(
      90deg,
      ${(props) => props.theme.colors.dark["--color-primary"]},
      ${(props) => props.theme.colors.dark["--color-primary"]}cc
    );
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  .elevation-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding-top: 0.5rem;
    border-top: 1px solid rgba(244, 247, 245, 0.07);
  }

  .elevation-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1;
    gap: 0.25rem;
  }

  .elevation-label {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: 12px;
    font-weight: ${(props) => props.theme.font.weights["--font-weight-light"]};
    color: rgba(244, 247, 245, 0.3);
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .elevation-value {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: 24px;
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) => props.theme.colors.dark["--color-text"]};
  }

  .elevation-divider {
    width: 1px;
    height: 40px;
    background: rgba(244, 247, 245, 0.07);
  }
`;

export default style;
