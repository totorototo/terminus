import { memo } from "react";
import { useSpring as useSpringWeb, animated } from "@react-spring/web";
import style from "./TrailData.style.js";
import useStore from "../../store/store.js";
import { format, formatDuration, intervalToDuration } from "date-fns";

const customLocale = {
  formatDistance: (token, count) => {
    const units = {
      xSeconds: `${count} sec`,
      xMinutes: `${count} min`,
      xHours: `${count} h`,
      // include other units as needed
    };
    return units[token] || "";
  },
};

const TrailData = memo(function TrailData({ className }) {
  const currentPositionIndex = useStore(
    (state) => state.app.currentPositionIndex,
  );
  const cumulativeDistances = useStore(
    (state) => state.gps.cumulativeDistances,
  );
  const cumulativeElevations = useStore(
    (state) => state.gps.cumulativeElevations,
  );
  const cumulativeElevationLosses = useStore(
    (state) => state.gps.cumulativeElevationLosses,
  );
  const startingDate = useStore((state) => state.app.startingDate);

  const stats = useStore((state) => state.stats);

  const distanceDone = cumulativeDistances[currentPositionIndex.index] || 0;
  const totalDistance = cumulativeDistances[cumulativeDistances.length - 1];
  const ellaspedDuration = currentPositionIndex.date - startingDate;

  // Avoid division by zero
  const estiamtedTotalDuration =
    distanceDone > 0 ? (ellaspedDuration * totalDistance) / distanceDone : 0;

  const now = Date.now();
  const eta = startingDate + Math.round(estiamtedTotalDuration);

  // Format ETA as a readable date string
  const etaDateStr = format(new Date(eta), "HH:mm");

  // Calculate remaining duration from now to ETA
  const remainingDuration = intervalToDuration({ start: now, end: eta });

  // Format remaining duration as a human-friendly string
  const remainingStr = formatDuration(remainingDuration, {
    format: ["hours", "minutes", "seconds"],
    locale: customLocale,
  });

  const { remainingDistance, remainingElevation, remainingElevationLoss } =
    useSpringWeb({
      remainingDistance:
        stats.distance - cumulativeDistances?.[currentPositionIndex.index] || 0,
      remainingElevation:
        stats.elevationGain -
          cumulativeElevations?.[currentPositionIndex.index] || 0,
      remainingElevationLoss:
        stats.elevationLoss -
          cumulativeElevationLosses?.[currentPositionIndex.index] || 0,
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
          <div className="value"> {etaDateStr}</div>
          <div className="label">eta</div>
        </div>
        <div className="item">
          <div className="value">{remainingStr}</div>
          <div className="label">remaining</div>
        </div>
        {/* <div className="item">
          <animated.div className="value">
            {remainingElevation.to((n) => `${n.toFixed(0)}`)}
          </animated.div>
          <div className="label">↗ m</div>
        </div>
        <div className="item">
          <animated.div className="value">
            {remainingElevationLoss.to((n) => `${n.toFixed(0)}`)}
          </animated.div>
          <div className="label">↘ m </div>
        </div> */}
      </div>

      <div className="build-number">
        <span>Build Number: {import.meta.env.VITE_NUMBER || "dev"}</span>
      </div>
    </div>
  );
});

export default style(TrailData);
