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
  height: 22rem;
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
    font-size: 16px;
    font-size: ${(props) => props.theme.font.sizes["--font-size-medium"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) => props.theme.colors.dark["--color-text"]};
    letter-spacing: -1px;
    line-height: 1;
    word-wrap: break-word;
    white-space: normal;
    overflow-wrap: break-word;
    max-width: 100%;
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

  .component-container {
    display: flex;
    width: 100%;
    scrollbar-width: none;
    ::-webkit-scrollbar {
      display: none; /* Safari and Chrome */
    }
    scroll-snap-type: x mandatory;
    overflow-x: auto;
    overflow-y: hidden;
    flex: 1;
    flex-flow: row nowrap;
    -webkit-overflow-scrolling: touch;
    margin-bottom: 1.5rem;
  }

  .component-children {
    display: flex;
    width: 100%;
    height: 100%;
    align-items: center;
    justify-content: center;
    scroll-snap-align: center;
    flex-shrink: 0;
    padding-left: 0.2rem;
    padding-right: 0.2rem;
  }
`;

export default style;
