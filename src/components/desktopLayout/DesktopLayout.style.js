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

  .panel-top {
    flex-direction: row;
    flex-wrap: wrap;
    align-content: flex-start;
    justify-content: flex-start;
    top: calc(env(safe-area-inset-top) + ${EDGE});
    left: calc(env(safe-area-inset-left) + ${EDGE});
    right: calc(env(safe-area-inset-right) + ${EDGE});
    gap: 1rem;

    > .tile {
      width: ${PANEL_WIDTH};
    }
  }

  /* Right panel: PeakSummary (top) + StageETA (below), anchored top-right */
  .panel-right {
    flex-direction: column;
    gap: 1rem;
    top: calc(env(safe-area-inset-top) + ${EDGE});
    right: calc(env(safe-area-inset-right) + ${EDGE});

    > .tile {
      width: ${PANEL_WIDTH};
    }

    /* First tile (PeakSummary) gets the tall fixed height */
    > .tile:first-child > * {
      overflow: hidden;
      padding-top: 1rem;
      padding-bottom: 1rem;
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
