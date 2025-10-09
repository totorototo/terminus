import styled from "styled-components";

const style = (Component) => styled(Component)`
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;

  pointer-events: none;

  color: ${(props) => props.theme.colors.dark["--color-text"]};
  line-height: 1.2;
  font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
  letter-spacing: 1.5px;
  user-select: none;
  padding: 1rem;
  gap: 0.5rem;

  .section {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    gap: 0.5rem;
    height: 66px;
    width: 100%;
    padding-left: 0.4rem;
    position: relative;

    // &::after {
    //   content: "";
    //   position: absolute;
    //   bottom: 0;
    //   left: 50%;
    //   transform: translateX(-50%);
    //   width: 40%;
    //   height: 2px;
    //   background-color: ${(props) =>
      props.theme.colors.dark["--color-text"]}20;
    // }
    padding-right: 0.4rem;
  }

  .section > svg {
    stroke: ${({ theme }) => theme.colors.dark["--colors-secondary"]};
    stroke-width: 2;
  }

  .location-container {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    margin-left: 1rem;
  }

  .location {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: ${(props) => props.theme.font.sizes["--font-size"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-light"]};
    color: ${(props) => props.theme.colors.dark["--color-text"]};
    letter-spacing: 0.02em;
    opacity: 0.8;
  }

  .distance-container {
    display: flex;
    flex: 1;
    align-items: center;
    width: 100%;
  }

  .elevation-container {
    display: flex;
    align-items: center;
    min-width: 80px;
    gap: 0.8rem;
    margin-left: auto;
    flex-direction: column;
  }

  .distance {
    display: flex;
    align-items: flex-start;
    font-size: ${(props) => props.theme.font.sizes["--font-size-medium"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) => props.theme.colors.dark["--color-text"]};

    .unit {
      opacity: 0.7;
      min-width: unset;
      color: ${(props) => props.theme.colors.dark["--color-text"]};
    }
  }
`;

export default style;
