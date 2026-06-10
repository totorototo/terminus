import { useMemo, useState } from "react";

import { useShallow } from "zustand/react/shallow";

import { recalLookup } from "../helpers/recalLookup.js";
import useStore, { useProjectedLocation } from "../store/store.js";

/**
 * Returns per-stage ETA timestamps and display state. The stage counterpart of
 * `useCheckpointETAs`: stages are the coarser life-base intervals
 * (Start/LifeBase/Arrival), sections the finer checkpoint intervals.
 *
 * Returns:
 *   raceStart: number | null  — ms timestamp of race start
 *   isPreRace: boolean
 *   stageETAs: Array of {
 *     stageId, endLocation, endKm,
 *     etaMs: number | null,
 *     isPast, isCurrent, isOverCutoff,
 *     difficulty,
 *     lat, lon,
 *   }
 */
export function useStageETAs() {
  const projectedLocation = useProjectedLocation();
  const { stages, cumulativeDistances, coordinates, recalStage } = useStore(
    useShallow((state) => ({
      stages: state.stages,
      cumulativeDistances: state.gpx.cumulativeDistances || [],
      coordinates: state.gpx.data,
      recalStage: state.recalibration?.stage ?? null,
    })),
  );

  const raceStart = useMemo(() => {
    if (!stages?.length || stages[0].startTime == null) return null;
    return stages[0].startTime * 1000;
  }, [stages]);

  const [currentTime] = useState(() => Date.now());

  // Pace ratio: actual elapsed / Minetti estimate for distance covered so far.
  // Used as the pre-GPS-lock fallback, mirroring useCheckpointETAs.
  const paceRatio = useMemo(() => {
    if (!raceStart || !stages?.length || !cumulativeDistances?.length)
      return 1.0;
    const currentIndex = projectedLocation?.index || 0;
    const now = projectedLocation?.timestamp || currentTime;
    const actualElapsedSec = (now - raceStart) / 1000;
    if (actualElapsedSec <= 0) return 1.0;

    let minettiSoFar = 0;
    for (const stage of stages) {
      if (currentIndex >= stage.endIndex) {
        minettiSoFar += stage.estimatedDuration;
      } else if (currentIndex >= stage.startIndex) {
        const distDone =
          (cumulativeDistances[currentIndex] || 0) -
          (cumulativeDistances[stage.startIndex] || 0);
        const fractionDone =
          stage.totalDistance > 0 ? distDone / stage.totalDistance : 0;
        minettiSoFar += stage.estimatedDuration * fractionDone;
        break;
      }
    }

    return minettiSoFar > 0 ? actualElapsedSec / minettiSoFar : 1.0;
  }, [
    raceStart,
    stages,
    cumulativeDistances,
    projectedLocation?.index,
    projectedLocation?.timestamp,
    currentTime,
  ]);

  const stageETAs = useMemo(() => {
    if (!stages?.length || !cumulativeDistances?.length) return [];

    const currentIndex = projectedLocation?.index || 0;
    const now = projectedLocation?.timestamp || currentTime;
    const raceNotStarted = raceStart && now < raceStart;
    const hasGPSLock = (projectedLocation?.timestamp ?? 0) > 0;

    // Prefer the Zig live recalibration for forward ETAs when available; fall back
    // to the a-priori + paceRatio path below otherwise. Null map => no recal.
    const remainingByEndIndex = recalLookup(recalStage, {
      hasGPSLock,
      raceNotStarted,
    });

    let runningEtaMs = raceStart || now;
    let cutoffBreached = false;

    return stages.map((stage) => {
      const isPast = currentIndex >= stage.endIndex;
      const isCurrent =
        !isPast &&
        currentIndex >= stage.startIndex &&
        currentIndex < stage.endIndex;

      let etaMs = null;

      const zigCumulativeRemainingS = remainingByEndIndex?.get(stage.endIndex);

      if (!isPast && zigCumulativeRemainingS != null) {
        etaMs = now + zigCumulativeRemainingS * 1000;
        runningEtaMs = etaMs;
      } else if (raceNotStarted) {
        runningEtaMs += stage.estimatedDuration * 1000;
        etaMs = runningEtaMs;
      } else if (isPast) {
        runningEtaMs += stage.estimatedDuration * 1000 * paceRatio;
        etaMs = runningEtaMs;
      } else if (isCurrent && raceStart) {
        const remainingDist =
          (cumulativeDistances[stage.endIndex] || 0) -
          (cumulativeDistances[currentIndex] || 0);
        const fractionRemaining =
          stage.totalDistance > 0 ? remainingDist / stage.totalDistance : 0;
        const etaBase = hasGPSLock ? now : runningEtaMs;
        etaMs =
          etaBase +
          stage.estimatedDuration * 1000 * fractionRemaining * paceRatio;
        runningEtaMs = etaMs;
      } else if (raceStart) {
        runningEtaMs += stage.estimatedDuration * 1000 * paceRatio;
        etaMs = runningEtaMs;
      }

      const cutoffMs =
        stage.startTime != null && stage.maxCompletionTime != null
          ? (stage.startTime + stage.maxCompletionTime) * 1000
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

      const coord = coordinates?.[stage.endIndex];

      return {
        stageId: stage.stageId,
        endLocation: stage.endLocation,
        endKm: cumulativeDistances[stage.endIndex] / 1000,
        etaMs,
        isPast,
        isCurrent,
        isOverCutoff,
        difficulty: stage.difficulty || 0,
        lat: coord ? coord[0] : null,
        lon: coord ? coord[1] : null,
      };
    });
  }, [
    stages,
    cumulativeDistances,
    coordinates,
    projectedLocation?.index,
    projectedLocation?.timestamp,
    raceStart,
    paceRatio,
    currentTime,
    recalStage,
  ]);

  const isPreRace = useMemo(() => {
    if (!raceStart) return false;
    const now = projectedLocation?.timestamp || currentTime;
    return now < raceStart;
  }, [raceStart, projectedLocation?.timestamp, currentTime]);

  return { raceStart, stageETAs, isPreRace };
}
