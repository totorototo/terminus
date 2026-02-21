import { memo, useMemo } from "react";
import { useSpring as useSpringWeb, animated } from "@react-spring/web";
import style from "./TrailData.style.js";
import useStore, { useProjectedLocation, useStats } from "../../store/store.js";
import { format, formatDuration, intervalToDuration } from "date-fns";

export const customLocale = {
  formatDistance: (token, count) => {
    const units = {
      xSeconds: `${count}sec`,
      xMinutes: `${count}m`,
      xHours: `${count}h`,
      xDays: `${count}d`,
      // include other units as needed
    };
    return units[token] || "";
  },
};

// Helper function to calculate ETA and remaining time
const calculateTimeMetrics = (location, cumulativeDistances, startingDate) => {
  const distanceDone = cumulativeDistances[location?.index || 0] || 0;
  const totalDistance =
    cumulativeDistances[cumulativeDistances.length - 1] || 1;
  const elapsedDuration = (location?.timestamp || 0) - startingDate;

  // Avoid division by zero
  const estimatedTotalDuration =
    distanceDone > 0 ? (elapsedDuration * totalDistance) / distanceDone : 0;

  const now = Date.now();
  const eta = startingDate + Math.round(estimatedTotalDuration);

  // Format ETA as a readable date string with validation
  const etaDateStr = Number.isFinite(eta)
    ? format(new Date(eta), "HH:mm")
    : "--:--";

  // Calculate remaining duration from now to ETA
  const remainingDuration = intervalToDuration({ start: now, end: eta });

  // Format remaining duration as a human-friendly string
  const remainingStr = remainingDuration
    ? formatDuration(remainingDuration, {
        format: ["days", "hours", "minutes", "seconds"],
        locale: customLocale,
      })
    : "--";

  return {
    etaDateStr,
    remainingStr,
    distanceDone: Math.max(0, distanceDone),
    totalDistance: Math.max(0, totalDistance),
  };
};

const TrailData = memo(function TrailData({ className }) {
  // Use optimized selectors for better performance
  const projectedLocation = useProjectedLocation();
  const flush = useStore((state) => state.flush);
  const toggleTrackingMode = useStore((state) => state.toggleTrackingMode);
  const trackingMode = useStore((state) => state.app.trackingMode);
  const stats = useStats();
  const cumulativeDistances = useStore(
    (state) => state.gpx.cumulativeDistances || [],
  );

  const sections = useStore((state) => state.sections);
  const startingDate =
    sections && sections.length > 0 && sections[0].startTime * 1000;

  // Memoize expensive time calculations
  const timeMetrics = useMemo(() => {
    if (
      !cumulativeDistances?.length ||
      !startingDate ||
      projectedLocation.timestamp < startingDate
    ) {
      return {
        etaDateStr: "--:--",
        remainingStr: "--",
        distanceDone: 0,
        totalDistance: 0,
      };
    }
    return calculateTimeMetrics(
      projectedLocation,
      cumulativeDistances,
      startingDate,
    );
  }, [
    projectedLocation.index,
    projectedLocation.timestamp,
    cumulativeDistances,
    startingDate,
  ]);

  // Memoize remaining values for spring animation
  const remainingValues = useMemo(
    () => ({
      totalKm: Math.max(0, (stats?.distance || 0) / 1000),
    }),
    [stats],
  );

  const { totalKm } = useSpringWeb({
    ...remainingValues,
    config: { tension: 170, friction: 26 },
  });

  return (
    <div className={className}>
      {/* Stats container */}
      <div className="stats-container">
        <div className="stat-item">
          <animated.div className="stat-value">
            {totalKm.to((n) => n.toFixed(1))}
          </animated.div>
          <div className="stat-label">km</div>
        </div>

        <div className="stat-divider" />

        <div className="stat-item">
          <div className="stat-value">{timeMetrics.etaDateStr}</div>
          <div className="stat-label">eta</div>
        </div>

        <div className="stat-divider" />

        <div className="stat-item">
          <div className="stat-value">{timeMetrics.remainingStr}</div>
          <div className="stat-label">remaining</div>
        </div>
      </div>

      {/* Divider line */}
      <div className="content-divider" />

      {/* Button container */}
      <div className="button-container">
        <button
          className={`action-button ${trackingMode ? "active" : ""}`}
          onClick={toggleTrackingMode}
        >
          Fly-by
        </button>
        <button className="action-button" onClick={flush}>
          Flush Data
        </button>
      </div>
      <div className="build-number">
        <span>Build Number: {import.meta.env.VITE_NUMBER || "dev"}</span>
      </div>
    </div>
  );
});

export default style(TrailData);
