import styled from "styled-components";

const style = (Component) => styled(Component)`
  z-index: 10;
  display: flex;
  padding-top: 2rem;
  padding-left: 1rem;
  padding-right: 1rem;
  flex-direction: row;
  align-items: flex-start;
  justify-content: flex-start;
  flex-direction: column;
  width: 100%;
  height: 27rem;
  pointer-events: auto;

  color: ${(props) => props.theme.colors.dark["--color-text"]};
  line-height: 1.2;
  font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
  letter-spacing: 1.5px;
  user-select: none;

  .data-container {
    display: flex;
    width: 100%;
    justify-content: space-around;
    flex: 1;
  }

  .command-container {
    display: flex;
    width: 100%;
    justify-content: center;
    align-items: flex-start;
    margin-top: 1rem;
    background: rgba(255, 255, 255, 0.1);
    padding: 1.6rem;
    margin-top: 2rem;
    height: 100%;
    border-radius: 1rem;

    .command-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      width: 100%;

      button {
        padding: 0.8rem 1.6rem;
        font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
        color: ${(props) => props.theme.colors.dark["--color-text"]};
        background: ${(props) => props.theme.colors.dark["--color-primary"]};
        border: none;
        border-radius: 0.5rem;
        cursor: pointer;
        transition: background 0.3s ease;
        width: 100%;

        &:hover {
          background: ${(props) =>
            props.theme.colors.dark["--color-secondary"]};
        }
      }
    }
  }

  .build-number {
    width: 100%;
    height: 4rem;
    display: flex;
    align-items: flex-end;
    justify-content: flex-end;

    span {
      margin-left: auto;
    }
  }

  .item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .value {
    font-size: ${(props) => props.theme.font.sizes["--font-size-medium"]};
    color: ${(props) => props.theme.colors.dark["--color-text"]};
  }

  .label {
  }
`;

export default style;
