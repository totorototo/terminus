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
  padding: 1rem;
  gap: 0.5rem;


  .section {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    gap: 0.5rem;
    height: 66px;
    width: 100%;
    padding-left: 0.4rem;
    position: relative;
    
    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      width: 40%;
      left: 50%;
      transform: translateX(-50%);
      height: 2px;
      background-color: rgba(255, 255, 255, 0.1);
    }
    padding-right: 0.4rem;
    // border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    
  }

  .location {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .distance-container {
    display: flex;
    align-items: center;
    min-width: 80px;
  }

  .elevation-container {
    display: flex;
    align-items: center;
    min-width: 80px;
    margin-left: 1rem;
    gap:0.4rem;
  }

  .distance {
    display: flex;
    align-items: center;
    gap: 4px;

    span {
      min-width: 40px;
      text-align: right;
    }

    .unit {
      opacity: 0.7;
      min-width: unset;
    }
  }
}`;

export default style;
