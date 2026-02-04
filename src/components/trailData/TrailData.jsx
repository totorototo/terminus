import { memo, useMemo, useState } from "react";
import { useSpring as useSpringWeb, animated } from "@react-spring/web";
import style from "./TrailData.style.js";
import useStore, { useProjectedLocation, useStats } from "../../store/store.js";
import { format, formatDuration, intervalToDuration } from "date-fns";

const customLocale = {
  formatDistance: (token, count) => {
    const units = {
      xSeconds: `${count} sec`,
      xMinutes: `${count} min`,
      xHours: `${count} h`,
      xDays: `${count} d`,
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

  // Format ETA as a readable date string
  const etaDateStr = format(new Date(eta), "HH:mm");

  // Calculate remaining duration from now to ETA
  const remainingDuration = intervalToDuration({ start: now, end: eta });

  // Format remaining duration as a human-friendly string
  const remainingStr = formatDuration(remainingDuration, {
    format: ["days", "hours", "minutes", "seconds"],
    locale: customLocale,
  });

  return { etaDateStr, remainingStr, distanceDone, totalDistance };
};

const TrailData = memo(function TrailData({ className }) {
  // Use optimized selectors for better performance
  const projectedLocation = useProjectedLocation();
  const flush = useStore((state) => state.flush);
  const stats = useStats();
  const cumulativeDistances = useStore(
    (state) => state.gpx.cumulativeDistances || [],
  );
  const cumulativeElevations = useStore(
    (state) => state.gpx.cumulativeElevations || [],
  );
  const cumulativeElevationLosses = useStore(
    (state) => state.gpx.cumulativeElevationLosses || [],
  );
  const sections = useStore((state) => state.sections);
  const startingDate =
    sections && sections.length > 0 && sections[0].startTime * 1000;

  // const [startingDate] = useState(Date.now());

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
      remainingDistance: Math.max(
        0,
        (stats?.distance || 0) -
          (cumulativeDistances?.[projectedLocation?.index || 0] || 0),
      ),
      remainingElevation: Math.max(
        0,
        (stats?.elevationGain || 0) -
          (cumulativeElevations?.[projectedLocation?.index || 0] || 0),
      ),
      remainingElevationLoss: Math.max(
        0,
        (stats?.elevationLoss || 0) -
          (cumulativeElevationLosses?.[projectedLocation?.index || 0] || 0),
      ),
    }),
    [
      stats,
      cumulativeDistances,
      cumulativeElevations,
      cumulativeElevationLosses,
      projectedLocation,
    ],
  );

  const { remainingDistance, remainingElevation, remainingElevationLoss } =
    useSpringWeb({
      ...remainingValues,
      config: { tension: 170, friction: 26 },
    });

  return (
    <div className={className}>
      <div className="data-container">
        <div className="item">
          <animated.div className="value">
            {remainingDistance.to((n) => `${(n / 1000).toFixed(1)}`)}
          </animated.div>
          <div className="label">km</div>
        </div>
        <div className="item">
          <div className="value">{timeMetrics.etaDateStr}</div>
          <div className="label">eta</div>
        </div>
        <div className="item">
          <div className="value">{timeMetrics.remainingStr}</div>
          <div className="label">remaining</div>
        </div>
      </div>

      <button
        onClick={() => {
          console.log("Button clicked, calling flush");
          flush();
        }}
      >
        Flush Data
      </button>
      <div className="build-number">
        <span>Build Number: {import.meta.env.VITE_NUMBER || "dev"}</span>
      </div>
    </div>
  );
});

export default style(TrailData);
