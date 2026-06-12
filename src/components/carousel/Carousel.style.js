import { rgba } from "polished";
import styled from "styled-components";

const style = (Component) => styled(Component)`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;

  .carousel-track {
    display: flex;
    flex: 1;
    width: 100%;
    height: 100%;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;

    ::-webkit-scrollbar {
      display: none; /* Safari and Chrome */
    }

    ${(props) =>
      props.direction === "vertical"
        ? `
          flex-flow: column nowrap;
          scroll-snap-type: y mandatory;
          overflow-y: auto;
          overflow-x: hidden;
        `
        : `
          flex-flow: row nowrap;
          scroll-snap-type: x mandatory;
          overflow-x: auto;
          overflow-y: hidden;
        `}
  }

  .carousel-item {
    display: flex;
    width: 100%;
    height: 100%;
    align-items: center;
    justify-content: center;
    scroll-snap-align: center;
    flex-shrink: 0;
  }

  .carousel-nav {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding-top: 0.75rem;
    flex-shrink: 0;
  }

  .carousel-label {
    position: relative;
    height: 1em;
    display: flex;
    align-items: center;
    justify-content: center;

    span {
      position: absolute;
      font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
      font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
      font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
      color: ${(props) =>
        rgba(
          props.theme.colors[props.theme.currentVariant]["--color-text"],
          0.4,
        )};
      letter-spacing: 1.5px;
      text-transform: uppercase;
      line-height: 1;
      white-space: nowrap;
    }
  }

  .carousel-dots {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .carousel-dot {
    width: 1px;
    height: 1px;
    border-radius: 50%;
    border: none;
    padding: 5px;
    box-sizing: content-box;
    cursor: pointer;
    background: ${(props) =>
      rgba(
        props.theme.colors[props.theme.currentVariant]["--color-text"],
        0.2,
      )};
    transition:
      background ${(props) => props.theme.transitions["--transition-fast"]},
      transform ${(props) => props.theme.transitions["--transition-fast"]};

    &.active {
      background: ${(props) =>
        props.theme.colors[props.theme.currentVariant]["--color-text"]};
      transform: scale(1.2);
    }
  }
`;

export default style;
