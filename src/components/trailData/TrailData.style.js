import styled from "styled-components";

const style = (Component) => styled(Component)`
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 380px;
  padding: 2rem 1.25rem 1.25rem;
  border-radius: 1.75rem;
  pointer-events: auto;
  height: 25rem;
  // background-color:pink;

  /* Stats container */
  .stats-container {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    width: 100%;
    margin-bottom: 1.5rem;
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1;

    &:first-child {
      align-items: flex-start;
    }

    &:last-child {
      align-items: flex-end;
    }
  }

  .build-number {
    margin-top: auto;
    align-self: flex-end;
  }

  .stat-value {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: 36px;
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) => props.theme.colors.dark["--color-text"]};
    letter-spacing: -1px;
    line-height: 1;
  }

  .stat-label {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: 11px;
    font-weight: ${(props) => props.theme.font.weights["--font-weight-light"]};
    color: rgba(244, 247, 245, 0.3);
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin-top: 4px;
    line-height: 1;
  }

  .stat-divider {
    width: 1px;
    height: 48px;
    background: rgba(244, 247, 245, 0.07);
    align-self: center;
  }

  /* Content divider */
  .content-divider {
    width: 100%;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(244, 247, 245, 0.07) 20%,
      rgba(244, 247, 245, 0.07) 80%,
      transparent
    );
    margin-bottom: 1rem;
  }

  /* Button container */
  .button-container {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
  }

  .action-button {
    width: 100%;
    height: 52px;
    border-radius: 1rem;
    font-family: ${(props) =>
      props.theme.font.family["--font-family-sansSerif"]};
    font-size: 15px;
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    letter-spacing: 0.2px;
    cursor: pointer;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(242, 175, 41, 0.25);
    background: rgba(242, 175, 41, 0.12);
    color: ${(props) => props.theme.colors.dark["--color-primary"]};

    &:hover {
      border-color: rgba(242, 175, 41, 0.35);
      background: rgba(242, 175, 41, 0.15);
    }

    &:active,
    &.active {
      border-color: rgba(242, 175, 41, 0.5);
      background: ${(props) => props.theme.colors.dark["--color-primary"]};
      color: ${(props) => props.theme.colors.dark["--color-background"]};
    }
  }
`;

export default style;
