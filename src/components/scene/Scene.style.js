import { rgba } from "polished";
import styled from "styled-components";

const style = (Component) => styled(Component)`
  .checkpoint-label {
    background: ${({ theme }) =>
      rgba(theme.colors.dark["--color-background"], 0.4)};
    color: ${({ theme }) => theme.colors.dark["--color-text"]};
    padding: 6px;
    border-radius: 4px;
    font-size: ${({ theme }) => theme.font.sizes["--font-size-xsmall"]};
    font-weight: ${({ theme }) => theme.font.weights["--font-weight-light"]};
    line-height: 1.2;
    letter-spacing: 1.5px;
    white-space: nowrap;
    user-select: none;
    pointer-events: none;
    opacity: 1;
  }
`;

export default style;
