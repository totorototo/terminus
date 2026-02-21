import styled from "styled-components";

const style = (Component) => styled(Component)`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  height: 100%;

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
