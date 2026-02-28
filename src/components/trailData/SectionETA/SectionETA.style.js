import { rgba } from "polished";
import styled from "styled-components";

const style = (Component) => styled(Component)`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding: 0 0.75rem;
  overflow: hidden;

  .list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 0.4rem;
    border-bottom: 1px solid
      ${(props) => rgba(props.theme.colors.dark["--color-text"], 0.07)};
    margin-bottom: 0.25rem;
    flex-shrink: 0;
  }

  .header-label {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-tiny"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) => rgba(props.theme.colors.dark["--color-text"], 0.35)};
    letter-spacing: 1.5px;
    text-transform: uppercase;
  }

  .section-list {
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

  .section-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.3rem 0;
    gap: 0.5rem;
    opacity: 0.65;
    transition: opacity
      ${(props) => props.theme.transitions["--transition-fast"]};

    &.past {
      opacity: 0.4;
    }

    &.current {
      opacity: 1;
    }
  }

  .section-left {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    flex: 1;
    min-width: 0;
  }

  .section-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
    background: ${(props) =>
      rgba(props.theme.colors.dark["--color-text"], 0.2)};

    &.past {
      background: ${(props) =>
        rgba(props.theme.colors.dark["--color-text"], 0.3)};
    }

    &.current {
      background: ${(props) => props.theme.colors.dark["--color-primary"]};
      box-shadow: 0 0 6px
        ${(props) => rgba(props.theme.colors.dark["--color-primary"], 0.55)};
    }
  }

  .section-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
    gap: 1px;
  }

  .section-name {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-tiny"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) => props.theme.colors.dark["--color-text"]};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 150px;
  }

  .section-meta {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    justify-content: center;
  }

  .section-km {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-tiny"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-light"]};
    color: ${(props) => rgba(props.theme.colors.dark["--color-text"], 0.38)};
  }

  .section-difficulty {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-tiny"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .section-eta {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-tiny"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) => props.theme.colors.dark["--color-text"]};
    flex-shrink: 0;
    letter-spacing: 0.5px;
  }

  .section-row.past .section-eta {
    color: ${(props) => rgba(props.theme.colors.dark["--color-text"], 0.5)};
  }

  .section-row.current .section-eta {
    color: ${(props) => props.theme.colors.dark["--color-primary"]};
  }

  .empty-state {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-tiny"]};
    color: ${(props) => rgba(props.theme.colors.dark["--color-text"], 0.3)};
    text-align: center;
    padding: 1.5rem 0;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
`;

export default style;
