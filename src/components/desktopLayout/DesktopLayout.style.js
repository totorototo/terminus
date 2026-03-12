import { rgba } from "polished";
import styled from "styled-components";

import { glassMorphism } from "../../theme/mixins.js";

const PANEL_WIDTH = "300px";
const SCROLLABLE_TILE_HEIGHT = "260px";
const GAP = "0.5rem";
const EDGE = "0.75rem";

const style = (Component) => styled(Component)`
  /* Transparent full-screen overlay — scene click-through by default */
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: ${({ theme }) => theme.zIndex["--z-index-modal"]};

  /* ── Panels ─────────────────────────────────────────────────── */
  .panel {
    position: absolute;
    pointer-events: auto;
    display: flex;
    gap: ${GAP};
  }

  .panel-left {
    flex-direction: column;
    top: calc(env(safe-area-inset-top) + ${EDGE});
    left: calc(env(safe-area-inset-left) + ${EDGE});
    bottom: calc(env(safe-area-inset-bottom) + ${EDGE});
    width: ${PANEL_WIDTH};
    justify-content: space-between;
  }

  /* Bottom-left row: each tile keeps its own full width */
  .panel-bottom {
    flex-direction: column;
    align-items: flex-end;
    bottom: calc(env(safe-area-inset-bottom) + ${EDGE});
    right: calc(env(safe-area-inset-left) + ${EDGE});

    .tile {
      width: ${PANEL_WIDTH};
    }
  }

  /* ── Tiles ───────────────────────────────────────────────────── */
  .tile {
    ${glassMorphism}
    border: 1px solid
      ${({ theme }) =>
      rgba(theme.colors[theme.currentVariant]["--color-text"], 0.1)};
    border-radius: ${({ theme }) => theme.borderRadius["--border-radius-lg"]};
    overflow: hidden;
    color: ${({ theme }) => theme.colors[theme.currentVariant]["--color-text"]};
    user-select: none;

    /*
     * Sub-components use height:100% + overflow:hidden, designed for a
     * fixed-height BottomSheetPanel.  Override so tiles size to content.
     */
    > * {
      height: auto;
      overflow: visible;
      padding-top: 0.75rem;
      padding-bottom: 0.75rem;
    }
  }

  /* Scrollable tiles (Checkpoints, Climbs): fixed height with internal scroll */
  .tile-scrollable {
    padding-top: 0.75rem;
    padding-bottom: 0.75rem;
  }

  .tile-scrollable > * {
    height: ${SCROLLABLE_TILE_HEIGHT};
    overflow: hidden;
    padding-top: 0;
    padding-bottom: 0;

    .section-list,
    .climb-list {
      scrollbar-width: thin;
      scrollbar-color: ${({ theme }) =>
          rgba(theme.colors[theme.currentVariant]["--color-text"], 0.2)}
        transparent;

      &::-webkit-scrollbar {
        display: block;
        width: 4px;
      }
      &::-webkit-scrollbar-track {
        background: transparent;
      }
      &::-webkit-scrollbar-thumb {
        background: ${({ theme }) =>
          rgba(theme.colors[theme.currentVariant]["--color-text"], 0.2)};
        border-radius: 2px;
      }
    }
  }
`;

export default style;
