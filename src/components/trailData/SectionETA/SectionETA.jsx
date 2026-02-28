import { memo, useMemo } from "react";

import { format } from "date-fns";

import { DIFFICULTY_COLORS, DIFFICULTY_LABELS } from "../../../constants.js";
import useStore, { useProjectedLocation } from "../../../store/store.js";

import style from "./SectionETA.style.js";

const SectionETA = memo(function SectionETA({ className }) {
  const projectedLocation = useProjectedLocation();
  const sections = useStore((state) => state.sections);
  const cumulativeDistances = useStore(
    (state) => state.gpx.cumulativeDistances || [],
  );

  const raceStart = useMemo(() => {
    if (!sections?.length || sections[0].startTime == null) return null;
    return sections[0].startTime * 1000;
  }, [sections]);

  // How fast is this runner relative to Naismith's flat baseline (5 km/h = 720 ms/m)?
  // speedFactor > 1 = slower than baseline, < 1 = faster.
  // Used to scale each section's terrain-adjusted estimatedDuration.
  const speedFactor = useMemo(() => {
    if (!raceStart || !projectedLocation?.index || !cumulativeDistances?.length)
      return 1.0;
    const distanceDone = cumulativeDistances[projectedLocation.index] || 0;
    const elapsedMs = (projectedLocation.timestamp || 0) - raceStart;
    if (distanceDone <= 0 || elapsedMs <= 0) return 1.0;
    const NAISMITH_FLAT_MS_PER_M = 720; // 5 km/h
    return elapsedMs / distanceDone / NAISMITH_FLAT_MS_PER_M;
  }, [
    raceStart,
    projectedLocation?.index,
    projectedLocation?.timestamp,
    cumulativeDistances,
  ]);

  const sectionRows = useMemo(() => {
    if (!sections?.length || !cumulativeDistances?.length) return [];

    const currentIndex = projectedLocation?.index || 0;
    const now = projectedLocation?.timestamp || Date.now();

    // Walk sections forward, accumulating ETA as we go.
    // Each section contributes its Naismith estimatedDuration × runner's speedFactor.
    let runningEtaMs = raceStart || now;

    return sections.map((section) => {
      const isPast = currentIndex >= section.endIndex;
      const isCurrent =
        !isPast &&
        currentIndex >= section.startIndex &&
        currentIndex < section.endIndex;

      let etaMs = null;

      if (isPast && section.endTime != null) {
        // Actual recorded checkpoint time — most accurate
        etaMs = section.endTime * 1000;
        runningEtaMs = etaMs;
      } else if (isPast) {
        // No timestamp — advance by Naismith estimate scaled to runner's pace
        runningEtaMs += section.estimatedDuration * 1000 * speedFactor;
        etaMs = runningEtaMs;
      } else if (isCurrent && raceStart) {
        // Remaining fraction of this section's Naismith estimate
        const remainingDist =
          (cumulativeDistances[section.endIndex] || 0) -
          (cumulativeDistances[currentIndex] || 0);
        const fractionRemaining =
          section.totalDistance > 0 ? remainingDist / section.totalDistance : 0;
        etaMs =
          now +
          section.estimatedDuration * 1000 * fractionRemaining * speedFactor;
        runningEtaMs = etaMs;
      } else if (raceStart) {
        // Future section: full Naismith estimate scaled to runner's pace
        runningEtaMs += section.estimatedDuration * 1000 * speedFactor;
        etaMs = runningEtaMs;
      }

      const etaStr = etaMs ? format(new Date(etaMs), "EEE HH:mm") : "--:--";

      return {
        id: section.segmentId,
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
    speedFactor,
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
      <div className="section-list">
        {sectionRows.map((section) => (
          <div
            key={section.id}
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
                  {section.difficulty > 0 && !section.isPast && (
                    <span
                      className="section-difficulty"
                      style={{
                        color: DIFFICULTY_COLORS[section.difficulty - 1],
                      }}
                    >
                      {DIFFICULTY_LABELS[section.difficulty - 1]}
                    </span>
                  )}
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

export default style(SectionETA);
