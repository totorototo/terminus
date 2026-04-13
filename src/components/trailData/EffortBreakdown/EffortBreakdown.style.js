import { rgba } from "polished";
import styled from "styled-components";

const style = (Component) => styled(Component)`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding: 0 0.75rem;
  overflow: hidden;

  .eb-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 0.4rem;
    border-bottom: 1px solid
      ${({ theme }) =>
        rgba(theme.colors[theme.currentVariant]["--color-text"], 0.07)};
    margin-bottom: 0.5rem;
    flex-shrink: 0;
  }

  .eb-header-label {
    font-family: ${({ theme }) => theme.font.family["--font-family-mono"]};
    font-size: ${({ theme }) => theme.font.sizes["--font-size-tiny"]};
    font-weight: ${({ theme }) => theme.font.weights["--font-weight-bold"]};
    color: ${({ theme }) =>
      rgba(theme.colors[theme.currentVariant]["--color-text"], 0.35)};
    letter-spacing: 1.5px;
    text-transform: uppercase;
  }

  .eb-total {
    font-family: ${({ theme }) => theme.font.family["--font-family-mono"]};
    font-size: ${({ theme }) => theme.font.sizes["--font-size-tiny"]};
    font-weight: ${({ theme }) => theme.font.weights["--font-weight-bold"]};
    color: ${({ theme }) =>
      rgba(theme.colors[theme.currentVariant]["--color-text"], 0.5)};
    letter-spacing: 0.5px;
  }

  .eb-list {
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    scrollbar-width: none;
    flex: 1;
    min-height: 0;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  .eb-row {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0.45rem 0;
    opacity: 0.55;
    transition: opacity ${({ theme }) => theme.transitions["--transition-fast"]};

    &.past {
      opacity: 0.2;
    }

    &.current {
      opacity: 1;
    }
  }

  /* Status dot on the left (past / current / future) */
  .eb-status-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
    background: ${({ theme }) =>
      rgba(theme.colors[theme.currentVariant]["--color-text"], 0.2)};

    &.past {
      background: ${({ theme }) =>
        rgba(theme.colors[theme.currentVariant]["--color-text"], 0.25)};
    }

    &.current {
      background: ${({ theme }) =>
        theme.colors[theme.currentVariant]["--color-primary"]};
      box-shadow: 0 0 6px
        ${({ theme }) =>
          rgba(theme.colors[theme.currentVariant]["--color-primary"], 0.55)};
    }
  }

  /* Section name + meta */
  .eb-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
    gap: 3px;
    flex: 1;
  }

  .eb-name {
    font-family: ${({ theme }) => theme.font.family["--font-family-mono"]};
    font-size: ${({ theme }) => theme.font.sizes["--font-size-medium"]};
    font-weight: ${({ theme }) => theme.font.weights["--font-weight-bold"]};
    color: ${({ theme }) => theme.colors[theme.currentVariant]["--color-text"]};
    letter-spacing: -0.5px;
    line-height: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .eb-meta {
    font-family: ${({ theme }) => theme.font.family["--font-family-mono"]};
    font-size: ${({ theme }) => theme.font.sizes["--font-size-tiny"]};
    color: ${({ theme }) =>
      rgba(theme.colors[theme.currentVariant]["--color-text"], 0.35)};
    letter-spacing: 0.3px;
    line-height: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Difficulty dots */
  .eb-dots {
    display: flex;
    gap: 3px;
    align-items: center;
    flex-shrink: 0;
  }

  .eb-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${({ theme }) =>
      rgba(theme.colors[theme.currentVariant]["--color-text"], 0.12)};
    flex-shrink: 0;

    &.filled {
      /* color is set inline via DIFFICULTY_COLORS */
    }
  }

  /* Estimated duration on the right */
  .eb-duration {
    font-family: ${({ theme }) => theme.font.family["--font-family-mono"]};
    font-size: ${({ theme }) => theme.font.sizes["--font-size"]};
    font-weight: ${({ theme }) => theme.font.weights["--font-weight-bold"]};
    color: ${({ theme }) => theme.colors[theme.currentVariant]["--color-text"]};
    flex-shrink: 0;
    letter-spacing: -0.5px;
    line-height: 1;
    min-width: 3.5rem;
    text-align: right;
  }

  .eb-row.past .eb-duration {
    color: ${({ theme }) =>
      rgba(theme.colors[theme.currentVariant]["--color-text"], 0.5)};
  }

  .eb-row.current .eb-duration {
    color: ${({ theme }) =>
      theme.colors[theme.currentVariant]["--color-primary"]};
  }

  .eb-empty {
    font-family: ${({ theme }) => theme.font.family["--font-family-mono"]};
    font-size: ${({ theme }) => theme.font.sizes["--font-size-tiny"]};
    color: ${({ theme }) =>
      rgba(theme.colors[theme.currentVariant]["--color-text"], 0.3)};
    text-align: center;
    padding: 1.5rem 0;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
`;

export default style;
