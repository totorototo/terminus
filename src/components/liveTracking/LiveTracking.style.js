import styled from "styled-components";

const style = (Component) => styled(Component)`
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;

  pointer-events: none;

  color: #a0a0a0;
  line-height: 1.2;
  font-size: 15px;
  letter-spacing: 1.5px;
  user-select: none;

  /* Default: show only first child (km left) when collapsed */
  > div:not(:first-child) {
    display: none;
  }

  /* When parent container is expanded (height > 150px), show all data */
  @container (min-height: 150px) {
    > div:not(:first-child) {
      display: block;
    }
  }

  h1 {
    pointer-events: none;
    color: white;
    font-size: 2em;
    font-weight: 100;
    line-height: 1em;
    margin: 0;
    margin-bottom: 0.25em;
  }
`;

export default style;
