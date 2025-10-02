import styled from "styled-components";

const style = (Component) => styled(Component)`
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  position: absolute;
  pointer-events: none;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  max-width: 600px;
  padding: 80px;
  color: #a0a0a0;
  line-height: 1.2;
  font-size: 15px;
  letter-spacing: 1.5px;
  user-select: none;

  /* Mobile responsiveness */
  @media (max-width: 768px) {
    padding: 20px;
    max-width: calc(100vw - 40px);
    font-size: 13px;
    letter-spacing: 1px;
    top: 50%;
    right: 10px;
    left: auto;
    transform: translateY(-50%);
  }

  @media (max-width: 480px) {
    padding: 15px;
    font-size: 12px;
    letter-spacing: 0.5px;
    max-width: calc(100vw - 30px);
  }

  h1 {
    pointer-events: none;
    color: white;
    font-size: 2em;
    font-weight: 100;
    line-height: 1em;
    margin: 0;
    margin-bottom: 0.25em;

    @media (max-width: 768px) {
      font-size: 1.5em;
      margin-bottom: 0.2em;
    }

    @media (max-width: 480px) {
      font-size: 1.3em;
      margin-bottom: 0.15em;
    }
  }
`;

export default style;
