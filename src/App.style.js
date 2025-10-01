import styled from "styled-components";

export const StyledButton = styled.button`
  position: absolute;
  z-index: 1000;
  background-color: rgba(0, 0, 0, 0.2);
  color: #a0a0a0;
  border: 1px solid #404040;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 100;
  line-height: 1.2;
  user-select: none;
  pointer-events: auto;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  backdrop-filter: blur(8px);

  /* Mobile first - base styles for 0-480px with safe area support */
  top: max(15px, env(safe-area-inset-top, 0px) + 15px);
  right: max(15px, env(safe-area-inset-right, 0px) + 15px);
  padding: 10px 16px;
  font-size: 13px;
  letter-spacing: 0.5px;
  gap: 6px;
  min-height: 44px;
  min-width: 44px;

  &:hover {
    color: white;
    border-color: #606060;
    background-color: rgba(0, 0, 0, 0.4);
  }

  /* Tablet portrait: 481px and up */
  @media (min-width: 481px) {
    top: max(20px, env(safe-area-inset-top, 0px) + 20px);
    right: max(20px, env(safe-area-inset-right, 0px) + 20px);
    padding: 12px 20px;
    font-size: 14px;
    letter-spacing: 1px;
    gap: 8px;
  }

  /* Tablet landscape: 769px and up */
  @media (min-width: 769px) {
    top: max(60px, env(safe-area-inset-top, 0px) + 60px);
    right: max(60px, env(safe-area-inset-right, 0px) + 60px);
    padding: 14px 22px;
    font-size: 14px;
    letter-spacing: 1.2px;
    gap: 10px;
  }

  /* Desktop: 1200px and up */
  @media (min-width: 1200px) {
    top: max(80px, env(safe-area-inset-top, 0px) + 80px);
    right: max(80px, env(safe-area-inset-right, 0px) + 80px);
    padding: 16px 24px;
    font-size: 15px;
    letter-spacing: 1.5px;
    gap: 12px;
    min-height: auto;
    min-width: auto;
  }
`;

const style = (Component) => styled(Component)`
  background-color: #262424ff;
  color: #eee;
  width: 100%;
  min-height: 100%;
  position: relative;
`;

export default style;
