import { Fragment, memo, useMemo } from "react";

import { ArrowDown } from "@styled-icons/feather/ArrowDown";
import { ArrowUp } from "@styled-icons/feather/ArrowUp";
import { Radio } from "@styled-icons/feather/Radio";
import { format } from "date-fns";
import { useShallow } from "zustand/react/shallow";

import { DIFFICULTY_COLORS, DIFFICULTY_LABELS } from "../../../constants.js";
import { useStageETAs } from "../../../hooks/useStageETAs.js";
import useStore, { useProjectedLocation } from "../../../store/store.js";

// Stages are the coarser life-base intervals (Start/LifeBase/Arrival); this is
// the stage-granularity twin of SectionETA (which renders the finer checkpoints).
// The breadcrumb timeline markup and classNames are shared, so reuse its style.
import style from "../SectionETA/SectionETA.style.js";

// Mirrors SectionETA's rail constants/helper — distance-scaled connector
// whose height grows with the leg's real distance, floored/capped, with a
// fill + bead tracking the runner's projected progress within it.
const RAIL_MIN_PX = 64;
const RAIL_PER_KM = 7;
const RAIL_MAX_PX = 220;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function legProgress(stage, isPast, isCurrent, cumulativeDistances, projIndex) {
  if (isPast) return 100;
  if (!isCurrent || !stage || !cumulativeDistances.length) return 0;
  const segStart = cumulativeDistances[stage.startIndex] || 0;
  const segEnd = cumulativeDistances[stage.endIndex] || 0;
  const here = cumulativeDistances[projIndex] || 0;
  const span = segEnd - segStart;
  return span > 0 ? clamp((here - segStart) / span, 0, 1) * 100 : 0;
}

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

// Mirrors SectionETA's ProfileStrip/ElevStat — kept as separate copies since
// DifficultyDots above is already duplicated between the two twins.
function ProfileStrip({ gainM, lossM }) {
  const total = gainM + lossM;
  if (total <= 0) return null;
  const gainPct = Math.round((gainM / total) * 100);
  return (
    <div className="bc-profile">
      <div className="bc-profile-gain" style={{ width: `${gainPct}%` }} />
      <div className="bc-profile-loss" style={{ width: `${100 - gainPct}%` }} />
    </div>
  );
}

function ElevStat({ direction, value }) {
  const Icon = direction === "up" ? ArrowUp : ArrowDown;
  return (
    <span className={`bc-elev bc-elev-${direction}`}>
      <Icon size={11} />
      {value}m
    </span>
  );
}

// Mirrors SectionETA's LegCaption — distance/eta and elevation/difficulty for
// the stage AHEAD of a block (Start or a life base).
function LegCaption({ distKm, gainM, lossM, estSec, difficulty }) {
  return (
    <div className="bc-caption">
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

      const railPx = Math.round(
        clamp(RAIL_MIN_PX + distKm * RAIL_PER_KM, RAIL_MIN_PX, RAIL_MAX_PX),
      );
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
        etaStr:
          raceStart && st.etaMs && !isPreRace
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
  }, [stageETAs, stages, raceStart, isPreRace, cumulativeDistances, projIndex]);

  // Start's past/current mirrors stageETAs[0] (the stage Start→first life
  // base is Start's "stage ahead", same borrowing as the rows above).
  // Without a GPS fix the hook withholds isPast/isCurrent from every stage,
  // so Start stays "current" (not past) until hasGPSLock actually places the
  // runner on course — only one row is ever current.
  const startIsPast = !isPreRace && hasGPSLock && !!stageETAs[0]?.isPast;
  const startIsCurrent =
    !isPreRace && (!hasGPSLock || !!stageETAs[0]?.isCurrent);
  const startEtaStr =
    raceStart && !isPreRace
      ? format(new Date(raceStart), "EEE HH:mm")
      : "--:--";

  const startRailPx = startCaption
    ? Math.round(
        clamp(
          RAIL_MIN_PX + startCaption.distKm * RAIL_PER_KM,
          RAIL_MIN_PX,
          RAIL_MAX_PX,
        ),
      )
    : RAIL_MIN_PX;
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
              <span className="cp-eta">{startEtaStr}</span>
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
                    <span className="cp-eta">{row.etaStr}</span>
                  </div>
                  {row.isCurrent && (
                    <span className="cp-badge">
                      <Radio size={10} />
                      NEXT
                    </span>
                  )}
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
