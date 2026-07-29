import styled from "styled-components";

const topFadeDistance = (props) => `${props.theme.spacing[5]}px`;

const style = (Component) => styled(Component)`
  background-color: var(--color-background);
  color: var(--color-text);
  width: 100%;
  height: 100%;
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
  padding-bottom: env(safe-area-inset-bottom, 0px);

  /* Apple Music-style top fade: instead of reserving fixed space under the
     notch/Dynamic Island, scrolled content fades to transparent as it
     passes beneath the system UI. The mask is pinned to this element's own
     box (not to scrolled content), so it stays put as a top "viewport"
     effect regardless of scroll position. */
  mask-image: linear-gradient(
    to bottom,
    transparent 0,
    transparent env(safe-area-inset-top, 0px),
    black calc(env(safe-area-inset-top, 0px) + ${topFadeDistance})
  );
  -webkit-mask-image: linear-gradient(
    to bottom,
    transparent 0,
    transparent env(safe-area-inset-top, 0px),
    black calc(env(safe-area-inset-top, 0px) + ${topFadeDistance})
  );
`;

export default style;
