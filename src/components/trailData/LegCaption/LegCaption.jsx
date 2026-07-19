import { ArrowDown } from "@styled-icons/feather/ArrowDown";
import { ArrowUp } from "@styled-icons/feather/ArrowUp";

import { DIFFICULTY_COLORS, DIFFICULTY_LABELS } from "../../../constants.js";
import { formatDuration } from "../etaLegHelpers.js";

import style from "./LegCaption.style.js";

// Shared between SectionETA and StageETA: the in-rail caption describing the
// leg AHEAD of a block (Start or a checkpoint/life base). The parents' own
// SectionETA.style.js still dims this component via the literal "bc-caption"
// class (`.bc-row.past .bc-caption`) — that cross-component opacity rule
// can't move here since it depends on the row's own past/current state.

function DifficultyDots({ difficulty }) {
  const color = difficulty > 0 ? DIFFICULTY_COLORS[difficulty - 1] : null;
  return (
    <div
      className="bc-dots"
      role="img"
      aria-label={DIFFICULTY_LABELS[difficulty - 1] ?? ""}
    >
      {[1, 2, 3, 4, 5].map((d) => (
        <span
          key={d}
          className={`bc-dot${d <= difficulty ? " filled" : ""}`}
          style={d <= difficulty ? { background: color } : undefined}
        />
      ))}
    </div>
  );
}

// Horizontal gain/loss split — same read as the vertical rail's fill, but
// scannable at a glance instead of requiring the eye to compare two numbers.
function ProfileStrip({ gainM, lossM }) {
  const total = gainM + lossM;
  if (total <= 0) return null;
  const gainPct = Math.round((gainM / total) * 100);
  // Decorative — the gain/loss numbers below carry the same information
  return (
    <div className="bc-profile" aria-hidden="true">
      <div className="bc-profile-gain" style={{ width: `${gainPct}%` }} />
      <div className="bc-profile-loss" style={{ width: `${100 - gainPct}%` }} />
    </div>
  );
}

function ElevStat({ direction, value }) {
  const Icon = direction === "up" ? ArrowUp : ArrowDown;
  return (
    <span
      className={`bc-elev bc-elev-${direction}`}
      aria-label={`${value} m ${direction === "up" ? "gain" : "loss"}`}
    >
      <Icon size={11} />
      {value}m
    </span>
  );
}

function LegCaption({ className, distKm, gainM, lossM, estSec, difficulty }) {
  return (
    <div className={`${className ?? ""} bc-caption`}>
      <ProfileStrip gainM={gainM} lossM={lossM} />
      <div className="bc-caption-row">
        <span className="bc-stat">{distKm.toFixed(1)} km</span>
        <span className="bc-stat">{formatDuration(estSec)}</span>
      </div>
      <div className="bc-caption-row">
        {gainM > 0 && <ElevStat direction="up" value={gainM} />}
        {lossM > 0 && <ElevStat direction="down" value={lossM} />}
        <DifficultyDots difficulty={difficulty} />
      </div>
    </div>
  );
}

const StyledLegCaption = style(LegCaption);

export default StyledLegCaption;
