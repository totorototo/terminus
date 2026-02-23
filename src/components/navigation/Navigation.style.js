import styled from "styled-components";
import { rgba } from "polished";

const style = (Component) => styled(Component)`
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0);
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.1);
  /* Glassmorphism effect */
  background: rgba(61, 59, 59, 0.8);
  backdrop-filter: blur(10px);
  overflow: hidden;

  .section {
    position: relative;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    height: 100%;
    pointer-events: auto;
    gap: 0.75rem;
    padding: 1rem;
  }

  .section::before {
    content: "";
    position: absolute;
    bottom: 0;
    left: 0;
    height: 2px;
    background: linear-gradient(
      90deg,
      ${(props) => props.theme.colors.dark["--color-primary"]},
      ${(props) => rgba(props.theme.colors.dark["--color-primary"], 0.4)}
    );
    box-shadow: 0 0 0.5rem
      ${(props) => rgba(props.theme.colors.dark["--color-primary"], 0.8)};
    width: var(--progress-width, 0%);
    transition: width 0.3s ease;
    z-index: 2;
  }

  /* Arrow icon in circle */
  .arrow-container {
    width: 3rem;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;

    svg {
      width: 2rem;
      height: 2rem;
      stroke: ${(props) => props.theme.colors.dark["--color-primary"]};
      stroke-width: 2;
      color: ${(props) => props.theme.colors.dark["--color-primary"]};

      /* Circle background behind arrow */
      &::before {
        content: "";
        position: absolute;
        width: 3.125rem;
        height: 3.125rem;
        border-radius: 50%;
        background: ${(props) =>
          rgba(props.theme.colors.dark["--color-primary"], 0.1)};
        border: 0.09375rem solid
          ${(props) => rgba(props.theme.colors.dark["--color-primary"], 0.28)};
        z-index: -1;
      }
    }

    /* Create circle effect another way */
    // position: relative;

    &::before {
      content: "";
      position: absolute;
      width: 3.125rem;
      height: 3.125rem;
      border-radius: 50%;
      background: ${(props) =>
        rgba(props.theme.colors.dark["--color-primary"], 0.1)};
      border: 0.09375rem solid
        ${(props) => rgba(props.theme.colors.dark["--color-primary"], 0.28)};
      z-index: -1;
    }
  }

  /* Large distance display */
  .distance-section {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    gap: 0.325rem;
  }

  .distance-value {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-xxlarge"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) => props.theme.colors.dark["--color-text"]};
    letter-spacing: -0.225rem;
    line-height: 1;
    display: flex;
    flex-direction: row;
    gap: 0.4rem;
  }

  .distance-unit {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-medium"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) => props.theme.colors.dark["--color-text"]};
    letter-spacing: 0.125rem;
    text-transform: uppercase;
    align-self: flex-end;
    opacity: 0.8;
  }

  /* Waypoint and time info */
  .info-section {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    padding: 0 1rem;
    min-width: 0;
    gap: 0.1rem;
    transform: rotate(90deg);
  }

  .waypoint {
    font-family: ${(props) =>
      props.theme.font.family["--font-family-sansSerif"]};
    font-size: 1.7rem;
    font-weight: 500;
    color: ${(props) => props.theme.colors.dark["--color-text"]};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 0.8;
  }

  .time-row {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    align-items: flex-start;
    justify-content: center;
  }

  .time-value {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-large"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) => props.theme.colors.dark["--color-text"]};
    line-height: 1;
  }

  .duration-row {
    .duration-value {
      font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
      font-size: ${(props) => props.theme.font.sizes["--font-size-medium"]};
      font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
      color: ${(props) => props.theme.colors.dark["--color-secondary"]};
      line-height: 1;
    }
  }

  .pace-row {
    .pace-value {
      font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
      font-size: ${(props) => props.theme.font.sizes["--font-size-medium"]};
      font-weight: ${(props) =>
        props.theme.font.weights["--font-weight-medium"]};
      color: ${(props) => props.theme.colors.dark["--color-primary"]};
      line-height: 1;
    }
  }

  /* Elevation indicators - moved inside section */
  .elevation-section {
    display: flex;
    align-items: center;
    gap: 0.425rem;
  }

  .elevation-item {
    display: flex;
    align-items: center;
    gap: 0.1875rem;
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-medium"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-medium"]};
    letter-spacing: -0.01875rem;

    svg {
      width: 0.6875rem;
      height: 0.6875rem;
      flex-shrink: 0;
    }

    &.gain {
      color: ${(props) => props.theme.colors.dark["--color-primary"]};
    }

    &.loss {
      color: ${(props) => props.theme.colors.dark["--color-primary"]};
    }
  }

  .elevation-item .unit {
    font-size: ${(props) => props.theme.font.sizes["--font-size"]};
  }

  /* Non-current sections styling */
  .section:not(.current) > * {
    opacity: 0.4;
  }

  .section.current {
    /* Enhance current section */
    border-color: ${(props) =>
      rgba(props.theme.colors.dark["--color-primary"], 0.3)};
  }

  .section.current > * {
    opacity: 1;
  }
`;

export default style;
