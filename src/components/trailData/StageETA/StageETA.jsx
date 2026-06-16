import { Fragment, memo, useMemo } from "react";

import { format } from "date-fns";
import { useShallow } from "zustand/react/shallow";

import { DIFFICULTY_COLORS, DIFFICULTY_LABELS } from "../../../constants.js";
import { useStageETAs } from "../../../hooks/useStageETAs.js";
import useStore, { useProjectedLocation } from "../../../store/store.js";

// Stages are the coarser life-base intervals (Start/LifeBase/Arrival); this is
// the stage-granularity twin of SectionETA (which renders the finer checkpoints).
// The breadcrumb timeline markup and classNames are shared, so reuse its style.
import style from "../SectionETA/SectionETA.style.js";

// Distance-scaled connector rail: each segment's height grows with its real
// distance (px), floored so the caption stays legible and capped so a single
// long stage can't dominate the scroll.
const RAIL_MIN_PX = 46;
const RAIL_PER_KM = 7;
const RAIL_MAX_PX = 220;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function formatDuration(sec) {
  if (!sec || !Number.isFinite(sec) || sec <= 0) return "--";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

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

const StageETA = memo(function StageETA({ className }) {
  const { raceStart, stageETAs, isPreRace } = useStageETAs();
  const projectedLocation = useProjectedLocation();
  const { stages, cumulativeDistances } = useStore(
    useShallow((state) => ({
      stages: state.stages,
      cumulativeDistances: state.gpx.cumulativeDistances || [],
    })),
  );

  const { totalEstSec, rows } = useMemo(() => {
    if (!stageETAs.length) return { totalEstSec: 0, rows: [] };

    const projIndex = projectedLocation?.index || 0;

    let totalEstSec = 0;
    const rows = stageETAs.map((st, i) => {
      const stage = stages?.[i];
      const distKm = (stage?.totalDistance || 0) / 1000;
      const gainM = Math.round(stage?.totalElevation || 0);
      const lossM = Math.round(stage?.totalElevationLoss || 0);
      const estSec = stage?.estimatedDuration || 0;
      totalEstSec += estSec;

      // Connector height scales with real stage distance (non-linear list).
      const railPx = Math.round(
        clamp(RAIL_MIN_PX + distKm * RAIL_PER_KM, RAIL_MIN_PX, RAIL_MAX_PX),
      );

      // Progress within this stage: full when passed, fractional when current,
      // empty ahead. Drives both the rail fill and the runner bead position.
      let fillPct = 0;
      let beadPct = null;
      if (st.isPast) {
        fillPct = 100;
      } else if (st.isCurrent && stage && cumulativeDistances.length) {
        const segStart = cumulativeDistances[stage.startIndex] || 0;
        const segEnd = cumulativeDistances[stage.endIndex] || 0;
        const here = cumulativeDistances[projIndex] || 0;
        const span = segEnd - segStart;
        const f = span > 0 ? clamp((here - segStart) / span, 0, 1) : 0;
        fillPct = f * 100;
        beadPct = f * 100;
      }

      return {
        id: st.stageId,
        endLocation: st.endLocation,
        endKm: st.endKm,
        isPast: st.isPast,
        isCurrent: st.isCurrent,
        isOverCutoff: st.isOverCutoff,
        etaStr:
          raceStart && st.etaMs && !isPreRace
            ? format(new Date(st.etaMs), "EEE HH:mm")
            : "--:--",
        difficulty: st.difficulty,
        distKm,
        gainM,
        lossM,
        estSec,
        railPx,
        fillPct,
        beadPct,
      };
    });

    return { totalEstSec, rows };
  }, [
    stageETAs,
    stages,
    cumulativeDistances,
    projectedLocation?.index,
    raceStart,
    isPreRace,
  ]);

  const startIsPast = !isPreRace && (projectedLocation?.index || 0) > 0;
  const startIsCurrent = !isPreRace && (projectedLocation?.index || 0) === 0;
  const startEtaStr =
    raceStart && !isPreRace
      ? format(new Date(raceStart), "EEE HH:mm")
      : "--:--";

  if (!rows.length) {
    return (
      <div className={className}>
        <div className="empty-state">No stages</div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="list-header">
        <span className="header-label">Life bases</span>
        <span className="header-total">
          {formatDuration(totalEstSec)} total
        </span>
      </div>
      <div className="section-list" role="list" tabIndex={0}>
        {/* Race start */}
        <div
          role="listitem"
          className={`cp-row${startIsPast ? " past" : startIsCurrent ? " current" : ""}`}
        >
          <div
            className={`cp-dot${startIsPast ? " past" : startIsCurrent ? " current" : ""}`}
          />
          <div className="cp-body">
            <div className="cp-line1">
              <span className="cp-name">
                {stages?.[0]?.startLocation || "Start"}
              </span>
              <div className="cp-right">
                <span className="cp-eta">{startEtaStr}</span>
              </div>
            </div>
            <div className="cp-line2">
              <span className="cp-km">0.0 km</span>
            </div>
          </div>
        </div>

        {rows.map((row) => {
          const stateClass = `${row.isPast ? " past" : ""}${row.isCurrent ? " current" : ""}`;

          return (
            <Fragment key={row.id}>
              {/* Distance-scaled segment rail */}
              <div
                className={`bc-row${stateClass}`}
                style={{ minHeight: row.railPx }}
                aria-hidden="true"
              >
                <div className="bc-rail">
                  <div
                    className="bc-rail-fill"
                    style={{ height: `${row.fillPct}%` }}
                  />
                  {row.beadPct != null && !isPreRace && (
                    <div
                      className="bc-bead"
                      style={{ top: `${row.beadPct}%` }}
                    />
                  )}
                </div>
                <div className="bc-caption">
                  <span className="bc-stat">{row.distKm.toFixed(1)} km</span>
                  {row.gainM > 0 && (
                    <span className="bc-stat">+{row.gainM}m</span>
                  )}
                  {row.lossM > 0 && (
                    <span className="bc-stat">−{row.lossM}m</span>
                  )}
                  <span className="bc-stat">{formatDuration(row.estSec)}</span>
                  <DifficultyDots difficulty={row.difficulty} />
                </div>
              </div>

              {/* Life base line */}
              <div
                role="listitem"
                className={`cp-row${stateClass}${row.isOverCutoff ? " over-cutoff" : ""}`}
              >
                <div
                  className={`cp-dot${row.isPast ? " past" : row.isCurrent ? " current" : ""}`}
                />
                <div className="cp-body">
                  <div className="cp-line1">
                    <span className="cp-name">{row.endLocation}</span>
                    <div className="cp-right">
                      <span className="cp-eta">{row.etaStr}</span>
                    </div>
                  </div>
                  {Number.isFinite(row.endKm) && (
                    <div className="cp-line2">
                      <span className="cp-km">{row.endKm.toFixed(1)} km</span>
                    </div>
                  )}
                </div>
              </div>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
});

const StyledStageETA = style(StageETA);

export default StyledStageETA;
