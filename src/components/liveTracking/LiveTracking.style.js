import styled from "styled-components";

const style = (Component) => styled(Component)`
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;

  pointer-events: none;

  color: ${({ theme }) => theme.colors.dark["--color-text"]};
  opacity: 0.8;
  line-height: 1.2;
  font-size: ${({ theme }) => theme.font.sizes["--font-size-small"]};
  letter-spacing: 1.5px;
  user-select: none;
  padding: 1rem;

  .live-tracking-header {
    width: 100%;
    display: flex;
  }

  .distance {
    display: flex;
    align-items: center;
    gap: 1rem;
    height: 66px;
    // background-color: rgba(255, 255, 255, 0.1);
    width: 100%;
    padding-left: 0.4rem;
    font-size: ${({ theme }) => theme.font.sizes["--font-size-large"]};
    font-weight: ${({ theme }) => theme.font.weights["--font-weight-thin"]};
  }

  .distance svg {
    color: ${({ theme }) => theme.colors.dark["--color-primary"]};
    stroke-width: 1.5px;
    fill: ${({ theme }) => theme.colors.dark["--color-primary"]};
  }

  // // todo: draw line  below the icon and text
  // .distance::after {
  //   content: "";
  //   position: absolute;
  //   bottom: 0.6rem;
  //   left: 50%;
  //   width: 20%;
  //   height: 2px;
  //   transform: translateX(-50%);
  //   border-radius: 1rem;
  //   background-color: rgba(255, 255, 255, 0.2);
  // }

  //Todo: use useChain to stagger the animation of the items
  /* Default: show only first child (km left) when collapsed */
  > div:not(:first-child) {
    display: none;
  }

  /* When parent container is expanded (height > 150px), show all data */
  @container (min-height: 150px) {
    > div:not(:first-child) {
      display: block;
    }
  }
`;

export default style;
