import { memo, useMemo } from "react";

import { useShallow } from "zustand/react/shallow";

import { useCheckpointETAs } from "../../../hooks/useCheckpointETAs.js";
import { useCollapsibleList } from "../../../hooks/useCollapsibleList.js";
import { carryText, fuelingRows, SUPPLY_LABELS } from "../../../lib/fueling.js";
import useStore from "../../../store/store.js";
import { formatDuration } from "../../trailData/etaLegHelpers.js";
import CollapseToggle from "../CollapseToggle.jsx";
import StorySection from "../StorySection.jsx";

import style from "./StoryFueling.style.js";

// A plan time as the race clock reads it: "+3h31", "+0h00" at the start.
function planClock(seconds) {
  const minutes = Math.round(seconds / 60);
  return `+${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, "0")}`;
}

// The whole plan's fueling, entry by entry: what to leave each point with,
// what the targets come to on the way there, and the race's totals. All of it
// at the plan's times, as Regimen sized it: live ETAs don't re-size it.
const StoryFueling = memo(function StoryFueling({ className }) {
  const { checkpointETAs, hasGPSLock } = useCheckpointETAs();
  const { sections, cumulativeDistances, fueling, isFollower } = useStore(
    useShallow((state) => ({
      sections: state.sections,
      cumulativeDistances: state.gpx.cumulativeDistances || [],
      fueling: state.app?.fueling ?? null,
      isFollower: state.gps?.followerConnectionStatus === "connected",
    })),
  );

  const plan = useMemo(
    () => fuelingRows(fueling, sections),
    [fueling, sections],
  );

  // Entry 0 is the start, left once there is a fix; entry i + 1 is reached
  // with checkpoint i.
  const isPastEntry = (entry) =>
    entry === 0 ? hasGPSLock : Boolean(checkpointETAs?.[entry - 1]?.isPast);
  const activeIndex =
    plan?.rows.findIndex((row) => !isPastEntry(row.entry)) ?? -1;
  const { visibleCount, hiddenCount, expand } = useCollapsibleList(
    plan?.rows.length ?? 0,
    { threshold: 5, activeIndex },
  );

  if (!sections?.length) return null;

  if (!plan) {
    return (
      <div className={className}>
        <StorySection eyebrow="The plan" title="Fueling">
          <p className="lede">
            {isFollower
              ? "The runner's plan has no fueling."
              : "This race's plan.json has no fueling. Plan it in Regimen, then open the new plan.json in Pace."}
          </p>
        </StorySection>
      </div>
    );
  }

  const { rows, totals } = plan;

  return (
    <div className={className}>
      <StorySection eyebrow="The plan" title="Fueling">
        <p className="lede">
          What to leave each point with, at the plan&apos;s times. Running
          behind doesn&apos;t re-size it.
        </p>
        {totals && (
          <dl className="fueling-totals" data-testid="fueling-totals">
            <div>
              <dt>Carbs</dt>
              <dd>{totals.carbsG} g</dd>
            </div>
            <div>
              <dt>Fluid</dt>
              <dd>{(totals.fluidMl / 1000).toFixed(1)} L</dd>
            </div>
            <div>
              <dt>Sodium</dt>
              <dd>{(totals.sodiumMg / 1000).toFixed(1)} g</dd>
            </div>
            <div>
              <dt>Plan time</dt>
              <dd>{formatDuration(totals.durationS)}</dd>
            </div>
          </dl>
        )}
        <ol className="fueling-list">
          {rows.slice(0, visibleCount).map((row) => {
            const isPast = isPastEntry(row.entry);
            const isFinish = row.entry === rows.length - 1;
            const endIndex =
              row.entry === 0 ? 0 : sections[row.entry - 1].endIndex;
            const km = (cumulativeDistances[endIndex] || 0) / 1000;
            const refills = row.supply !== "none" && row.carry != null;
            let kind = "No refill";
            if (isFinish) kind = "Finish";
            else if (refills) kind = SUPPLY_LABELS[row.supply];

            return (
              <li
                key={row.entry}
                className={`fueling-row${isPast ? " past" : ""}${
                  row.entry === activeIndex ? " current" : ""
                }`}
                data-testid="fueling-row"
              >
                <div className="fueling-top">
                  <div className="fueling-main">
                    <span className="fueling-name">
                      {row.name || "Checkpoint"}
                    </span>
                    <span className="fueling-km">{km.toFixed(1)} km</span>
                  </div>
                  <div className="fueling-eta">
                    <span className="fueling-eta-time">
                      {isPast
                        ? "Reached"
                        : row.arrivalS != null
                          ? planClock(row.arrivalS)
                          : "--:--"}
                    </span>
                    <span
                      className={`fueling-badge${refills ? " refills" : ""}`}
                    >
                      {kind}
                    </span>
                  </div>
                </div>
                {(row.intake || refills || row.stopS > 0) && (
                  <dl className="fueling-figures">
                    {row.intake && (
                      <div className="wide">
                        <dt>On the way</dt>
                        <dd>{carryText(row.intake)}</dd>
                      </div>
                    )}
                    {refills && (
                      <div className="wide">
                        <dt>
                          {row.supply === "water"
                            ? "Leave with · water only, keep your food"
                            : "Leave with"}
                        </dt>
                        <dd>{carryText(row.carry)}</dd>
                      </div>
                    )}
                    {row.stopS > 0 && (
                      <div>
                        <dt>Stop</dt>
                        <dd>{formatDuration(row.stopS)}</dd>
                      </div>
                    )}
                  </dl>
                )}
              </li>
            );
          })}
        </ol>
        <CollapseToggle hiddenCount={hiddenCount} onExpand={expand} />
      </StorySection>
    </div>
  );
});

const StyledStoryFueling = style(StoryFueling);

export default StyledStoryFueling;
