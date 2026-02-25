import { rgba } from "polished";
import { css } from "styled-components";

/**
 * Glass morphism panel effect — shared by all floating sheet panels.
 * Individual consumers are responsible for their own border declaration.
 */
export const glassMorphism = css`
  background: ${({ theme }) => rgba(theme.colors.dark["--color-surface"], 0.8)};
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px 0
    ${({ theme }) => rgba(theme.colors.dark["--color-background"], 0.1)};
`;
