import { memo, useMemo } from "react";

import { DIFFICULTY_COLORS, DIFFICULTY_LABELS } from "../../../constants.js";
import useStore, { useProjectedLocation } from "../../../store/store.js";

import style from "./EffortBreakdown.style.js";

function formatDuration(sec) {
  if (!sec || !Number.isFinite(sec) || sec <= 0) return "--";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

// Five difficulty dots, filled up to the section's difficulty level.
// Color comes from DIFFICULTY_COLORS for the hardest dot reached.
function DifficultyDots({ difficulty }) {
  const color = difficulty > 0 ? DIFFICULTY_COLORS[difficulty - 1] : null;
  return (
    <div
      className="eb-dots"
      role="img"
      aria-label={DIFFICULTY_LABELS[difficulty - 1] ?? ""}
    >
      {[1, 2, 3, 4, 5].map((d) => (
        <span
          key={d}
          className={`eb-dot${d <= difficulty ? " filled" : ""}`}
          style={d <= difficulty ? { background: color } : undefined}
        />
      ))}
    </div>
  );
}

const EffortBreakdown = memo(function EffortBreakdown({ className }) {
  const sections = useStore((state) => state.sections);
  const projectedLocation = useProjectedLocation();
  const currentIndex = projectedLocation?.index ?? 0;

  const { totalEstSec, rows } = useMemo(() => {
    if (!sections?.length) return { totalEstSec: 0, rows: [] };

    let totalEstSec = 0;
    const rows = sections.map((section) => {
      const isPast = currentIndex >= section.endIndex;
      const isCurrent =
        !isPast &&
        currentIndex >= section.startIndex &&
        currentIndex < section.endIndex;

      const distKm = (section.totalDistance || 0) / 1000;
      const gainM = Math.round(section.totalElevation || 0);
      const lossM = Math.round(section.totalElevationLoss || 0);
      const estSec = section.estimatedDuration || 0;

      totalEstSec += estSec;

      return {
        id: section.sectionId,
        endLocation: section.endLocation || "—",
        distKm,
        gainM,
        lossM,
        estSec,
        difficulty: section.difficulty || 0,
        isPast,
        isCurrent,
      };
    });

    return { totalEstSec, rows };
  }, [sections, currentIndex]);

  if (!rows.length) {
    return (
      <div className={className}>
        <div className="eb-empty">No sections</div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="eb-header">
        <span className="eb-header-label">Effort Profile</span>
        <span className="eb-total">{formatDuration(totalEstSec)} total</span>
      </div>

      <div className="eb-list" role="list">
        {rows.map((row) => (
          <div
            key={row.id}
            role="listitem"
            className={`eb-row${row.isPast ? " past" : ""}${row.isCurrent ? " current" : ""}`}
          >
            <div
              className={`eb-status-dot${row.isPast ? " past" : row.isCurrent ? " current" : ""}`}
            />

            <div className="eb-info">
              <span className="eb-name">{row.endLocation}</span>
              <span className="eb-meta">
                {row.distKm.toFixed(1)} km
                {row.gainM > 0 && ` · +${row.gainM}m`}
                {row.lossM > 0 && ` · −${row.lossM}m`}
              </span>
            </div>

            <DifficultyDots difficulty={row.difficulty} />

            <span className="eb-duration">{formatDuration(row.estSec)}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

export default style(EffortBreakdown);
