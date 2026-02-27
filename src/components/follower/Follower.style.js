import styled from "styled-components";

const style = (Component) => styled(Component)`
  background-color: var(--color-background);
  color: var(--color-text);
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;

  .notify-btn {
    position: absolute;
    top: calc(0.1rem + env(safe-area-inset-top) + 140px + 0.6rem);
    left: 50%;
    transform: translateX(-50%);
    padding: 0.45rem 1.25rem;
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 9999px;
    background: rgba(255, 255, 255, 0.08);
    color: var(--color-text);
    font-size: 0.8rem;
    letter-spacing: 0.04em;
    cursor: pointer;
    backdrop-filter: blur(10px);
    white-space: nowrap;
    z-index: ${({ theme }) => theme.zIndex["--z-index-modal"]};
  }
`;

export default style;
