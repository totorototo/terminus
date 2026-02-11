import styled from "styled-components";

const style = (Component) => styled(Component)`
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;

  pointer-events: none;

  color: ${(props) => props.theme.colors.dark["--color-text"]};
  line-height: 1.2;
  font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
  letter-spacing: 1.5px;
  user-select: none;
  padding: 1rem;
  gap: 0.5rem;

  .section {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.8rem;
    height: 66px;
    width: 100%;
    padding-left: 0.4rem;
    padding-right: 0.4rem;
    position: relative;
  }

  /* Apply opacity to children so inline animated styles on the root don't override it */
  .section:not(.current) > * {
    opacity: 0.8;
  }

  .section.current > * {
    opacity: 1;
  }

  .section > svg {
    flex-shrink: 0;
    stroke: ${({ theme }) => theme.colors.dark["--colors-secondary"]};
    stroke-width: 2;
  }

  .location-container {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    gap: 0.4rem;
    flex: 1;
    min-width: 0;
  }

  .location {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: ${(props) => props.theme.font.sizes["--font-size-medium"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-light"]};
    color: ${(props) => props.theme.colors.dark["--color-text"]};
    letter-spacing: 0.02em;
    opacity: 0.8;
    width: 100%;
  }

  .distance-container {
    display: flex;
    align-items: center;
    width: 100%;
  }

  .meta-container {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    justify-content: center;
    gap: 0.4rem;
    flex-shrink: 0;
  }

  .cutoff-time {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};

    svg {
      stroke: ${({ theme }) => theme.colors.dark["--colors-secondary"]};
      stroke-width: 2;
      flex-shrink: 0;
    }
  }

  .elevation-container {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    flex-direction: row;
  }

  .distance {
    display: flex;
    align-items: baseline;
    font-size: ${(props) => props.theme.font.sizes["--font-size-medium"]};
    color: ${(props) => props.theme.colors.dark["--color-text"]};

    .unit {
      min-width: unset;
      padding-left: 0.4rem;
      color: ${(props) => props.theme.colors.dark["--color-text"]};
      font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    }
  }

  .elevation {
    display: flex;
    align-items: baseline;
    font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    color: ${(props) => props.theme.colors.dark["--color-text"]};

    .unit {
      min-width: unset;
      padding-left: 0.3rem;
      color: ${(props) => props.theme.colors.dark["--color-text"]};
      font-size: ${(props) => props.theme.font.sizes["--font-size-small"]};
    }
  }
`;

export default style;
