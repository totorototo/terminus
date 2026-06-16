import { format } from "date-fns";

// Helper function to calculate ETA and remaining time using Minetti terrain-adjusted estimates.
// paceRatio = actual elapsed / Minetti prediction so far — corrects for this runner's fitness.
// totalMinettiSec = sum of all sections' estimatedDuration — terrain-adjusted total prediction.
export const calculateTimeMetrics = (
  location,
  cumulativeDistances,
  startingDate,
  sections,
) => {
  const distanceDone = cumulativeDistances[location?.index || 0] || 0;
  const totalDistance =
    cumulativeDistances[cumulativeDistances.length - 1] || 1;

  // Compute paceRatio: actual elapsed vs Minetti prediction for the same terrain covered so far
  const currentIndex = location?.index || 0;
  const actualElapsedSec = ((location?.timestamp || 0) - startingDate) / 1000;
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
  const paceRatio =
    minettiSoFar > 0 && actualElapsedSec > 0
      ? actualElapsedSec / minettiSoFar
      : 1.0;

  // Total Minetti prediction for the full route, scaled by this runner's pace ratio
  const totalMinettiSec = sections.reduce(
    (s, sec) => s + sec.estimatedDuration,
    0,
  );

  // Use now + remaining*paceRatio so the fallback paceRatio=1 case (runner at 0 km)
  // still accounts for any already-elapsed time.
  const now = Date.now();
  const minettiRemaining = totalMinettiSec - minettiSoFar;
  const eta = now + Math.round(minettiRemaining * paceRatio * 1000);

  const etaDateStr = Number.isFinite(eta)
    ? format(new Date(eta), "EEE HH:mm")
    : "--:--";

  const remainingMs = Math.max(0, eta - now);
  const totalMinutes = Math.floor(remainingMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const remainingStr = remainingMs > 0 ? `${hours}h ${minutes}m` : "--";

  return {
    etaDateStr,
    remainingStr,
    distanceDone: Math.max(0, distanceDone),
    totalDistance: Math.max(0, totalDistance),
  };
};
