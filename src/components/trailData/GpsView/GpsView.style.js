import styled from "styled-components";

const style = (Component) => styled(Component)`
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: ${(props) => props.theme.borderRadius["--border-radius-md"]};
  overflow: hidden;
  background: ${(props) =>
    props.theme.colors[props.theme.currentVariant]["--color-background"]};

  .gps-view-canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
    pointer-events: none;
  }

  .gps-view-scroll {
    position: absolute;
    inset: 0;
    overflow-x: hidden;
    overflow-y: scroll;
    touch-action: pan-y;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  .gps-view-spacer {
    width: 100%;
  }

  .gps-view-message {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    padding: 1rem;
    text-align: center;
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-text"]};
  }

  .gps-view-reset {
    position: absolute;
    bottom: 0.5rem;
    left: 50%;
    transform: translateX(-50%);
    padding: 0.25rem 0.6rem;
    border: none;
    border-radius: ${(props) => props.theme.borderRadius["--border-radius-sm"]};
    background: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-accent"]};
    color: ${(props) =>
      props.theme.colors[props.theme.currentVariant]["--color-background"]};
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    cursor: pointer;
    white-space: nowrap;
  }
`;

export default style;
