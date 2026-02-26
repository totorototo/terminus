import { memo, useMemo } from "react";

import { format } from "date-fns";

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

  // ms/m pace based on current position and elapsed time since race start
  const pace = useMemo(() => {
    if (!raceStart || !projectedLocation?.index || !cumulativeDistances?.length)
      return 0;
    const distanceDone = cumulativeDistances[projectedLocation.index] || 0;
    const elapsedMs = (projectedLocation.timestamp || 0) - raceStart;
    if (distanceDone <= 0 || elapsedMs <= 0) return 0;
    return elapsedMs / distanceDone;
  }, [
    raceStart,
    projectedLocation?.index,
    projectedLocation?.timestamp,
    cumulativeDistances,
  ]);

  const sectionRows = useMemo(() => {
    if (!sections?.length || !cumulativeDistances?.length) return [];

    const currentIndex = projectedLocation?.index || 0;

    return sections.map((section) => {
      const isPast = currentIndex >= section.endIndex;
      const isCurrent =
        !isPast &&
        currentIndex >= section.startIndex &&
        currentIndex < section.endIndex;

      let etaStr = "--:--";
      // Past sections: use actual recorded end time if available
      if (isPast && section.endTime != null) {
        etaStr = format(new Date(section.endTime * 1000), "EEE HH:mm");
      } else if (raceStart && pace > 0) {
        const sectionEndDist = cumulativeDistances[section.endIndex] || 0;
        const etaMs = raceStart + sectionEndDist * pace;
        etaStr = format(new Date(etaMs), "EEE HH:mm");
      }

      return {
        id: section.segmentId,
        endLocation: section.endLocation,
        endKm: cumulativeDistances[section.endIndex] / 1000,
        isPast,
        isCurrent,
        etaStr,
      };
    });
  }, [
    sections,
    cumulativeDistances,
    projectedLocation?.index,
    raceStart,
    pace,
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
                <span className="section-km">
                  {Number.isFinite(section.endKm)
                    ? `${section.endKm.toFixed(1)} km`
                    : ""}
                </span>
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
