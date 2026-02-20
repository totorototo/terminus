import styled from "styled-components";

const style = (Component) => styled(Component)`
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 1rem;
  pointer-events: none;
  width: 100%;
  border: 1px solid rgba(244, 247, 245, 0.12);
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.1);
  /* Glassmorphism effect */
  background: rgba(61, 59, 59, 0.8);
  backdrop-filter: blur(10px);
  overflow: hidden;

  .section {
    position: relative;
    display: flex;
    flex-direction: row;
    align-items: center;
    width: 100%;
    height: 100%;
    pointer-events: auto;
    gap: 0.75rem;
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
      rgba(242, 175, 41, 0.4)
    );
    box-shadow: 0 0 8px rgba(242, 175, 41, 0.8);
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
      width: 22px;
      height: 22px;
      stroke: ${(props) => props.theme.colors.dark["--color-primary"]};
      stroke-width: 2;
      color: ${(props) => props.theme.colors.dark["--color-primary"]};

      /* Circle background behind arrow */
      &::before {
        content: "";
        position: absolute;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: rgba(242, 175, 41, 0.1);
        border: 1.5px solid rgba(242, 175, 41, 0.28);
        z-index: -1;
      }
    }

    /* Create circle effect another way */
    position: relative;

    &::before {
      content: "";
      position: absolute;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: rgba(242, 175, 41, 0.1);
      border: 1.5px solid rgba(242, 175, 41, 0.28);
      z-index: -1;
    }
  }

  /* Vertical separator */
  .separator {
    width: 1px;
    height: 56px;
    background: rgba(244, 247, 245, 0.07);
    flex-shrink: 0;
  }

  /* Large distance display */
  .distance-section {
    width: 120px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
  }

  .distance-value {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: 3.3rem;
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: ${(props) => props.theme.colors.dark["--color-text"]};
    letter-spacing: -2px;
    line-height: 1;
    display: flex;
    flex-direction: row;
    gap: 0.4rem;
  }

  .distance-unit {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: 0.8rem;
    font-weight: ${(props) => props.theme.font.weights["--font-weight-light"]};
    color: rgba(244, 247, 245, 0.3);
    letter-spacing: 2px;
    text-transform: uppercase;
    align-self: flex-end;
  }

  /* Waypoint and time info */
  .info-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 0 1rem;
    min-width: 0;
    gap: 6px;
  }

  .waypoint {
    font-family: ${(props) =>
      props.theme.font.family["--font-family-sansSerif"]};
    font-size: 18px;
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    color: rgba(244, 247, 245, 0.95);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1;
  }

  .time-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .time-value {
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: 14px;
    font-weight: ${(props) => props.theme.font.weights["--font-weight-medium"]};
    color: rgba(242, 175, 41, 0.85);
    line-height: 1;
  }

  /* Elevation indicators - moved inside section */
  .elevation-section {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-right: 1rem;
  }

  .elevation-item {
    display: flex;
    align-items: center;
    gap: 3px;
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: 13px;
    font-weight: ${(props) => props.theme.font.weights["--font-weight-medium"]};
    letter-spacing: -0.3px;

    svg {
      width: 11px;
      height: 11px;
      flex-shrink: 0;
    }

    &.gain {
      color: ${(props) => props.theme.colors.dark["--color-primary"]};
    }

    &.loss {
      color: ${(props) => props.theme.colors.dark["--color-secondary"]};
    }
  }

  .elevation-item .unit {
    font-size: 10px;
  }

  /* Non-current sections styling */
  .section:not(.current) > * {
    opacity: 0.8;
  }

  .section.current {
    /* Enhance current section */
    border-color: rgba(242, 175, 41, 0.3);
  }

  .section.current > * {
    opacity: 1;
  }
`;

export default style;
