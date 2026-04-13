import { memo, useMemo, useState } from "react";

import { format } from "date-fns";

import useStore, { useProjectedLocation } from "../../../store/store.js";

import style from "./StageETA.style.js";

const StageETA = memo(function StageETA({ className }) {
  const projectedLocation = useProjectedLocation();
  const sections = useStore((state) => state.sections);
  const cumulativeDistances = useStore(
    (state) => state.gpx.cumulativeDistances || [],
  );

  const raceStart = useMemo(() => {
    if (!sections?.length || sections[0].startTime == null) return null;
    return sections[0].startTime * 1000;
  }, [sections]);

  const [currentTime] = useState(() => Date.now());

  // Pace ratio: how fast is this runner relative to what Minetti predicted?
  // Computed as actual elapsed time / Minetti terrain-adjusted estimate for the same distance.
  // ratio > 1 = slower than model, < 1 = faster. Applied to future section estimates.
  const paceRatio = useMemo(() => {
    if (!raceStart || !sections?.length || !cumulativeDistances?.length)
      return 1.0;
    const currentIndex = projectedLocation?.index || 0;
    const now = projectedLocation?.timestamp || currentTime;
    const actualElapsedSec = (now - raceStart) / 1000;
    if (actualElapsedSec <= 0) return 1.0;

    let minettiSoFar = 0;
    for (const section of sections) {
      if (currentIndex >= section.endIndex) {
        // Fully completed section
        minettiSoFar += section.estimatedDuration;
      } else if (currentIndex >= section.startIndex) {
        // Current in-progress section — add the fraction done
        const distDone =
          (cumulativeDistances[currentIndex] || 0) -
          (cumulativeDistances[section.startIndex] || 0);
        const fractionDone =
          section.totalDistance > 0 ? distDone / section.totalDistance : 0;
        minettiSoFar += section.estimatedDuration * fractionDone;
        break;
      }
    }

    return minettiSoFar > 0 ? actualElapsedSec / minettiSoFar : 1.0;
  }, [
    raceStart,
    sections,
    cumulativeDistances,
    projectedLocation?.index,
    projectedLocation?.timestamp,
    currentTime,
  ]);

  const sectionRows = useMemo(() => {
    if (!sections?.length || !cumulativeDistances?.length) return [];

    const currentIndex = projectedLocation?.index || 0;
    const now = projectedLocation?.timestamp || currentTime;

    // Race hasn't started yet — no ETAs to show
    if (raceStart && now < raceStart) {
      return sections.map((section) => ({
        id: section.sectionId,
        endLocation: section.endLocation,
        endKm: cumulativeDistances[section.endIndex] / 1000,
        isPast: false,
        isCurrent: false,
        etaStr: "--:--",
        difficulty: section.difficulty || 0,
      }));
    }

    // Walk sections forward, accumulating ETA as we go.
    // Minetti estimatedDuration handles terrain; paceRatio corrects for this runner's actual speed.
    let runningEtaMs = raceStart || now;

    return sections.map((section) => {
      const isPast = currentIndex >= section.endIndex;
      const isCurrent =
        !isPast &&
        currentIndex >= section.startIndex &&
        currentIndex < section.endIndex;

      let etaMs = null;

      if (isPast && section.endTime != null) {
        // Actual recorded checkpoint time — most accurate, no model correction needed
        etaMs = section.endTime * 1000;
        runningEtaMs = etaMs;
      } else if (isPast) {
        // No timestamp — Minetti estimate scaled by runner's observed pace ratio
        runningEtaMs += section.estimatedDuration * 1000 * paceRatio;
        etaMs = runningEtaMs;
      } else if (isCurrent && raceStart) {
        // Remaining fraction of this section's Minetti estimate, scaled by pace ratio
        const remainingDist =
          (cumulativeDistances[section.endIndex] || 0) -
          (cumulativeDistances[currentIndex] || 0);
        const fractionRemaining =
          section.totalDistance > 0 ? remainingDist / section.totalDistance : 0;
        etaMs =
          now +
          section.estimatedDuration * 1000 * fractionRemaining * paceRatio;
        runningEtaMs = etaMs;
      } else if (raceStart) {
        // Future section: Minetti estimate scaled by runner's observed pace ratio
        runningEtaMs += section.estimatedDuration * 1000 * paceRatio;
        etaMs = runningEtaMs;
      }

      // Cap estimated ETAs at the section's cutoff time.
      // Actual recorded times (isPast + endTime) are exempt — they are real data.
      const cutoffMs =
        section.startTime != null && section.maxCompletionTime != null
          ? (section.startTime + section.maxCompletionTime) * 1000
          : null;

      const isRecorded = isPast && section.endTime != null;
      if (
        !isRecorded &&
        cutoffMs != null &&
        etaMs != null &&
        etaMs > cutoffMs
      ) {
        etaMs = cutoffMs;
        runningEtaMs = cutoffMs;
      }

      const etaStr = etaMs ? format(new Date(etaMs), "EEE HH:mm") : "--:--";

      return {
        id: section.sectionId,
        endLocation: section.endLocation,
        endKm: cumulativeDistances[section.endIndex] / 1000,
        isPast,
        isCurrent,
        etaStr,
        difficulty: section.difficulty || 0,
      };
    });
  }, [
    sections,
    cumulativeDistances,
    projectedLocation?.index,
    projectedLocation?.timestamp,
    raceStart,
    paceRatio,
    currentTime,
  ]);

  if (!sectionRows.length) {
    return (
      <div className={className}>
        <div className="empty-state">No sections</div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="list-header">
        <span className="header-label">Checkpoint</span>
        <span className="header-label">ETA</span>
      </div>
      <div className="section-list" role="list">
        {sectionRows.map((section) => (
          <div
            key={section.id}
            role="listitem"
            className={`section-row${section.isPast ? " past" : ""}${section.isCurrent ? " current" : ""}`}
          >
            <div className="section-left">
              <div
                className={`section-dot${section.isPast ? " past" : section.isCurrent ? " current" : ""}`}
              />
              <div className="section-info">
                <span className="section-name">{section.endLocation}</span>
                <div className="section-meta">
                  <span className="section-km">
                    {Number.isFinite(section.endKm)
                      ? `${section.endKm.toFixed(1)} km`
                      : ""}
                  </span>
                </div>
              </div>
            </div>
            <span className="section-eta">{section.etaStr}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

export default style(StageETA);
