import { Fragment, memo, useMemo } from "react";

import { format } from "date-fns";
import { useShallow } from "zustand/react/shallow";

import { useScrollCurrentIntoView } from "../../../hooks/useScrollCurrentIntoView.js";
import { useStageETAs } from "../../../hooks/useStageETAs.js";
import useStore, { useProjectedLocation } from "../../../store/store.js";
import { formatDuration, legProgress, railHeightPx } from "../etaLegHelpers.js";
import { LegCaption } from "../LegCaption.jsx";

// Stages are the coarser life-base intervals (Start/LifeBase/Arrival); this is
// the stage-granularity twin of SectionETA (which renders the finer checkpoints).
// The breadcrumb timeline markup and classNames are shared, so reuse its style.
import style from "../SectionETA/SectionETA.style.js";

const StageETA = memo(function StageETA({ className }) {
  const { raceStart, stageETAs, isPreRace, hasGPSLock } = useStageETAs();
  const projectedLocation = useProjectedLocation();
  const { stages, cumulativeDistances } = useStore(
    useShallow((state) => ({
      stages: state.stages,
      cumulativeDistances: state.gpx.cumulativeDistances || [],
    })),
  );
  const projIndex = projectedLocation?.index || 0;

  const { totalEstSec, rows, startCaption } = useMemo(() => {
    if (!stageETAs.length)
      return { totalEstSec: 0, rows: [], startCaption: null };

    // Each block's caption describes the stage AHEAD of it (to the next life
    // base), not the stage just completed — Start's caption is stages[0],
    // life base i's caption is stages[i + 1]. Mirrors SectionETA/toCaption.
    const toCaption = (stage) => ({
      distKm: (stage?.totalDistance || 0) / 1000,
      gainM: Math.round(stage?.totalElevation || 0),
      lossM: Math.round(stage?.totalElevationLoss || 0),
      estSec: stage?.estimatedDuration || 0,
      difficulty: stage?.difficulty || 0,
    });

    const startCaption = stages?.length ? toCaption(stages[0]) : null;

    let totalEstSec = 0;
    const rows = stageETAs.map((st, i) => {
      const stage = stages?.[i];
      totalEstSec += stage?.estimatedDuration || 0;
      const aheadStage = stages?.[i + 1];
      const { distKm, gainM, lossM, estSec, difficulty } =
        toCaption(aheadStage);

      // A row's own past/current state now tracks the stage AHEAD of it (see
      // toCaption above), not the stage that ends here — so it's borrowed
      // from the next life base's arrival state. The last life base has no
      // next stage, so it keeps its own arrival state.
      const next = stageETAs[i + 1];
      const isPast = next ? next.isPast : st.isPast;
      const isCurrent = next ? next.isCurrent : st.isCurrent;

      const railPx = railHeightPx(distKm);
      const fillPct = legProgress(
        aheadStage,
        isPast,
        isCurrent,
        cumulativeDistances,
        projIndex,
      );
      const beadPct = isCurrent ? fillPct : null;

      return {
        id: st.stageId,
        endLocation: st.endLocation,
        endKm: st.endKm,
        isPast,
        isCurrent,
        isOverCutoff: st.isOverCutoff,
        // Pre-race the hook already computes the planned schedule (raceStart +
        // estimated durations) — show it instead of a wall of "--:--"; the
        // `planned` class dims it to distinguish plan from live ETA.
        etaStr:
          raceStart && st.etaMs
            ? format(new Date(st.etaMs), "EEE HH:mm")
            : "--:--",
        difficulty,
        hasNextLeg: aheadStage != null,
        distKm,
        gainM,
        lossM,
        estSec,
        railPx,
        fillPct,
        beadPct,
      };
    });

    return { totalEstSec, rows, startCaption };
  }, [stageETAs, stages, raceStart, cumulativeDistances, projIndex]);

  // Start's past/current mirrors stageETAs[0] (the stage Start→first life
  // base is Start's "stage ahead", same borrowing as the rows above). With a
  // GPS fix, trust the projected position outright — the rows do, and gating
  // on isPreRace here left the start rail empty while later rails filled
  // (shifted-clock debug data can be pre-race yet mid-course). Without a fix
  // the hook withholds isPast/isCurrent from every stage, so Start stays
  // "current" until hasGPSLock places the runner — only one row is current.
  const startIsPast = !!stageETAs[0]?.isPast;
  const startIsCurrent = hasGPSLock ? !!stageETAs[0]?.isCurrent : !isPreRace;
  const startEtaStr = raceStart
    ? format(new Date(raceStart), "EEE HH:mm")
    : "--:--";

  const currentRowKey = startIsCurrent
    ? "start"
    : (rows.find((r) => r.isCurrent)?.id ?? null);
  const listRef = useScrollCurrentIntoView(currentRowKey);

  const startRailPx = railHeightPx(startCaption?.distKm ?? 0);
  const startFillPct = legProgress(
    stages?.[0],
    startIsPast,
    startIsCurrent,
    cumulativeDistances,
    projIndex,
  );
  const startBeadPct = startIsCurrent ? startFillPct : null;

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
      <div className="section-list" role="list" tabIndex={0} ref={listRef}>
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
              <span className={`cp-eta${isPreRace ? " planned" : ""}`}>
                {startEtaStr}
              </span>
            </div>
            <div className="cp-line2">
              <span className="cp-km">0.0 km</span>
            </div>
          </div>
        </div>

        {startCaption && (
          <div
            className={`bc-row${startIsPast ? " past" : startIsCurrent ? " current" : ""}`}
            style={{ minHeight: startRailPx }}
            aria-hidden="true"
          >
            <div className="bc-rail">
              <div
                className="bc-rail-fill"
                style={{ height: `${startFillPct}%` }}
              />
              {startBeadPct != null && !isPreRace && (
                <div className="bc-bead" style={{ top: `${startBeadPct}%` }} />
              )}
            </div>
            <LegCaption {...startCaption} />
          </div>
        )}

        {rows.map((row) => {
          const stateClass = `${row.isPast ? " past" : ""}${row.isCurrent ? " current" : ""}`;

          return (
            <Fragment key={row.id}>
              {/* Life base card — name, distance, then the stage AHEAD
                  (distance/eta, elevation/difficulty to the next life base). */}
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
                    <span className={`cp-eta${isPreRace ? " planned" : ""}`}>
                      {row.etaStr}
                    </span>
                  </div>
                  {Number.isFinite(row.endKm) && (
                    <div className="cp-line2">
                      <span className="cp-km">{row.endKm.toFixed(1)} km</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Distance-scaled rail for the stage ahead of this life base,
                  with the stage's stats centered in the gap it spans */}
              {row.hasNextLeg && (
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
                  <LegCaption
                    distKm={row.distKm}
                    gainM={row.gainM}
                    lossM={row.lossM}
                    estSec={row.estSec}
                    difficulty={row.difficulty}
                  />
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
});

const StyledStageETA = style(StageETA);

export default StyledStageETA;
