import { useMemo, useState } from "react";

import { useShallow } from "zustand/react/shallow";

import useStore, { useProjectedLocation } from "../store/store.js";

/**
 * Returns per-section ETA timestamps, coordinates, and display state.
 * Shared between StageETA (display) and CheckpointPin (scene).
 *
 * Returns:
 *   raceStart: number | null  — ms timestamp of race start
 *   isPreRace: boolean
 *   checkpointETAs: Array of {
 *     sectionId, endLocation, endKm,
 *     etaMs: number | null,
 *     isPast, isCurrent,
 *     difficulty,
 *     lat, lon,
 *   }
 */
export function useCheckpointETAs() {
  const projectedLocation = useProjectedLocation();
  const { sections, cumulativeDistances, coordinates } = useStore(
    useShallow((state) => ({
      sections: state.sections,
      cumulativeDistances: state.gpx.cumulativeDistances || [],
      coordinates: state.gpx.data,
    })),
  );

  const raceStart = useMemo(() => {
    if (!sections?.length || sections[0].startTime == null) return null;
    return sections[0].startTime * 1000;
  }, [sections]);

  const [currentTime] = useState(() => Date.now());

  // Pace ratio: actual elapsed / Minetti estimate for distance covered so far.
  // ratio > 1 = slower than model, < 1 = faster.
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
        minettiSoFar += section.estimatedDuration;
      } else if (currentIndex >= section.startIndex) {
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

  const checkpointETAs = useMemo(() => {
    if (!sections?.length || !cumulativeDistances?.length) return [];

    const currentIndex = projectedLocation?.index || 0;
    const now = projectedLocation?.timestamp || currentTime;
    const raceNotStarted = raceStart && now < raceStart;

    let runningEtaMs = raceStart || now;

    return sections.map((section) => {
      const isPast = currentIndex >= section.endIndex;
      const isCurrent =
        !isPast &&
        currentIndex >= section.startIndex &&
        currentIndex < section.endIndex;

      let etaMs = null;

      if (raceNotStarted) {
        // Pre-race: pure Minetti estimate, paceRatio = 1
        runningEtaMs += section.estimatedDuration * 1000;
        etaMs = runningEtaMs;
      } else if (isPast && section.endTime != null) {
        etaMs = section.endTime * 1000;
        runningEtaMs = etaMs;
      } else if (isPast) {
        runningEtaMs += section.estimatedDuration * 1000 * paceRatio;
        etaMs = runningEtaMs;
      } else if (isCurrent && raceStart) {
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
        runningEtaMs += section.estimatedDuration * 1000 * paceRatio;
        etaMs = runningEtaMs;
      }

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

      const coord = coordinates?.[section.endIndex];

      return {
        sectionId: section.sectionId,
        endLocation: section.endLocation,
        endKm: cumulativeDistances[section.endIndex] / 1000,
        etaMs,
        isPast,
        isCurrent,
        difficulty: section.difficulty || 0,
        lat: coord ? coord[0] : null,
        lon: coord ? coord[1] : null,
      };
    });
  }, [
    sections,
    cumulativeDistances,
    coordinates,
    projectedLocation?.index,
    projectedLocation?.timestamp,
    raceStart,
    paceRatio,
    currentTime,
  ]);

  const isPreRace = useMemo(() => {
    if (!raceStart) return false;
    const now = projectedLocation?.timestamp || currentTime;
    return now < raceStart;
  }, [raceStart, projectedLocation?.timestamp, currentTime]);

  return { raceStart, checkpointETAs, isPreRace };
}
