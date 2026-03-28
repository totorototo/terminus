import styled from "styled-components";

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9000;
  background: var(--color-background);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 1.5rem;
  color: var(--color-text);
  text-align: center;
  padding: 2rem;
`;

export const Icon = styled.div`
  opacity: 0.7;
`;

export const Title = styled.p`
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary-text);
  margin: 0;
`;

export const Instructions = styled.p`
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  opacity: 0.8;
  margin: 0;
  max-width: 260px;
  line-height: 1.6;
`;

export const DismissButton = styled.button`
  margin-top: 0.5rem;
  background: none;
  border: 1px solid var(--color-text);
  border-radius: var(--border-radius-md);
  color: var(--color-text);
  font-size: var(--font-size-small);
  padding: 0.5rem 1.5rem;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity var(--transition-fast);

  &:active {
    opacity: 1;
  }
`;
