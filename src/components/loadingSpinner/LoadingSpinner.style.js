import styled from "styled-components";
import { rgba } from "polished";

const style = (Component) => styled(Component)`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: ${(props) => props.theme.colors.dark["--color-background"]};
  gap: 1rem;

  .spinner {
    width: 48px;
    height: 48px;
    border: 3px solid
      ${(props) => rgba(props.theme.colors.dark["--color-primary"], 0.2)};
    border-top-color: ${(props) => props.theme.colors.dark["--color-primary"]};
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  p {
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    color: ${(props) => props.theme.colors.dark["--color-text"]};
    opacity: 0.7;
    letter-spacing: 1.5px;
    margin: 0;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .spinner {
      animation: none;
      border-top-color: ${(props) => props.theme.colors.dark["--color-text"]};
    }
  }
`;

export default style;
