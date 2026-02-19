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
  padding-left: 1rem;
  padding-right: 1rem;
  gap: 0.5rem;

  .section {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.8rem;
    height: 116px;
    width: 100%;
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

  .distance-container {
    display: flex;
    flex-direction: column;
    width: 100%;
  }

  .distance {
    display: flex;
    align-items: baseline;
    font-size: ${(props) => props.theme.font.sizes["--font-size-xlarge"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) => props.theme.colors.dark["--color-text"]};

    .unit {
      min-width: unset;
      padding-left: 0.4rem;
      color: ${(props) => props.theme.colors.dark["--color-text"]};
      font-size: ${(props) => props.theme.font.sizes["--font-size-large"]};
      font-weight: ${(props) =>
        props.theme.font.weights["--font-weight-light"]};
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
