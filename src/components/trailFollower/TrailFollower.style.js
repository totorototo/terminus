import styled from "styled-components";

const style = (Component) => styled(Component)`
  .index-label {
    pointer-events: none;
    user-select: none;
    font-size: ${({ theme }) => theme.font.sizes["--font-size-tiny"]};
    font-weight: ${({ theme }) => theme.font.weights["--font-weight-bold"]};
    color: ${({ theme }) => theme.colors.dark["--color-text"]};
    background: ${({ theme }) => theme.colors.dark["--color-background"]};
    padding: 4px 8px;
    border-radius: 4px;
    text-align: center;
    min-width: 40px;
  }
`;

export default style;
