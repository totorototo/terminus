import styled from "styled-components";

const style = (Component) => styled(Component)`
  position: relative;
  width: 100%;
  height: 14px;
  margin-top: 4px;

  .strip-readout-value {
    position: absolute;
    left: clamp(28px, calc(var(--strip-readout-pct) * 1%), calc(100% - 28px));
    transform: translateX(-50%);
    font-family: ${(props) => props.theme.font.family["--font-family-mono"]};
    font-size: ${(props) => props.theme.font.sizes["--font-size-xxsmall"]};
    font-weight: ${(props) => props.theme.font.weights["--font-weight-bold"]};
    letter-spacing: 0.04em;
    line-height: 1;
    white-space: nowrap;
  }
`;

export default style;
