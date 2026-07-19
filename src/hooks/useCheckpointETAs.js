import { useMemo, useState } from "react";

import { useShallow } from "zustand/react/shallow";

import { recalLookup } from "../helpers/recalLookup.js";
import useStore, { useProjectedLocation } from "../store/store.js";

/**
 * Returns per-section ETA timestamps, coordinates, and display state.
 * Shared between SectionETA (display) and CheckpointPin (scene).
 *
 * Returns:
 *   raceStart: number | null  — ms timestamp of race start
 *   isPreRace: boolean
 *   hasGPSLock: boolean  — true once a real projected location exists
 *   checkpointETAs: Array of {
 *     sectionId, endLocation, endKm,
 *     etaMs: number | null,
 *     cutoffMs: number | null,
 *     isPast, isCurrent, isOverCutoff,
 *     difficulty,
 *     lat, lon,
 *   }
 */
export function useCheckpointETAs() {
  const projectedLocation = useProjectedLocation();
  const { sections, cumulativeDistances, coordinates, recalSection } = useStore(
    useShallow((state) => ({
      sections: state.sections,
      cumulativeDistances: state.gpx.cumulativeDistances || [],
      coordinates: state.gpx.data,
      recalSection: state.recalibration?.section ?? null,
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
    const hasGPSLock = (projectedLocation?.timestamp ?? 0) > 0;

    // Prefer the Zig live recalibration for forward ETAs when available; fall back
    // to the a-priori + paceRatio path below otherwise. Null map => no recal.
    const remainingByEndIndex = recalLookup(recalSection, {
      hasGPSLock,
      raceNotStarted,
    });

    let runningEtaMs = raceStart || now;
    let cutoffBreached = false;

    return sections.map((section) => {
      // Without a GPS fix, currentIndex defaults to 0 — indistinguishable from
      // "confirmed at the start". Gate on hasGPSLock so no leg claims past/current
      // before the runner actually has a position; Start owns "current" until then.
      const isPast = hasGPSLock && currentIndex >= section.endIndex;
      const isCurrent =
        hasGPSLock &&
        !isPast &&
        currentIndex >= section.startIndex &&
        currentIndex < section.endIndex;

      let etaMs = null;

      const zigCumulativeRemainingS = remainingByEndIndex?.get(
        section.endIndex,
      );

      if (!isPast && zigCumulativeRemainingS != null) {
        // Fix time + Zig's cumulative remaining (running sum already baked in).
        etaMs = now + zigCumulativeRemainingS * 1000;
        runningEtaMs = etaMs;
      } else if (raceNotStarted) {
        // Pre-race: pure Minetti estimate, paceRatio = 1
        runningEtaMs += section.estimatedDuration * 1000;
        etaMs = runningEtaMs;
      } else if (isPast) {
        runningEtaMs += section.estimatedDuration * 1000 * paceRatio;
        etaMs = runningEtaMs;
      } else if (isCurrent && raceStart) {
        const remainingDist =
          (cumulativeDistances[section.endIndex] || 0) -
          (cumulativeDistances[currentIndex] || 0);
        const fractionRemaining =
          section.totalDistance > 0 ? remainingDist / section.totalDistance : 0;
        // Without a GPS lock (timestamp=0) use runningEtaMs (raceStart) as base
        // so the initial display matches Minetti estimates from race start.
        const etaBase = hasGPSLock ? now : runningEtaMs;
        etaMs =
          etaBase +
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
      const isOverCutoff =
        !cutoffBreached &&
        !isPast &&
        cutoffMs != null &&
        etaMs != null &&
        etaMs > cutoffMs;
      if (isOverCutoff) {
        cutoffBreached = true;
        etaMs = cutoffMs;
        runningEtaMs = cutoffMs;
      }

      const coord = coordinates?.[section.endIndex];

      return {
        sectionId: section.sectionId,
        endLocation: section.endLocation,
        endKm: cumulativeDistances[section.endIndex] / 1000,
        etaMs,
        cutoffMs,
        isPast,
        isCurrent,
        isOverCutoff,
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
    recalSection,
  ]);

  const isPreRace = useMemo(() => {
    if (!raceStart) return false;
    const now = projectedLocation?.timestamp || currentTime;
    return now < raceStart;
  }, [raceStart, projectedLocation?.timestamp, currentTime]);

  const hasGPSLock = (projectedLocation?.timestamp ?? 0) > 0;

  return { raceStart, checkpointETAs, isPreRace, hasGPSLock };
}
