import { memo } from "react";
import { useSpring as useSpringWeb, animated } from "@react-spring/web";
import style from "./TrailData.style.js";
import useStore from "../../store/store.js";

const TrailData = memo(function TrailData({ className }) {
  const currentPositionIndex = useStore((state) => state.currentPositionIndex);
  const cumulativeDistances = useStore((state) => state.cumulativeDistances);
  const cumulativeElevations = useStore((state) => state.cumulativeElevations);
  const cumulativeElevationLosses = useStore(
    (state) => state.cumulativeElevationLosses,
  );

  const stats = useStore((state) => state.stats);

  const { remainingDistance, remainingElevation, remainingElevationLoss } =
    useSpringWeb({
      remainingDistance:
        stats.distance - cumulativeDistances?.[currentPositionIndex] || 0,
      remainingElevation:
        stats.elevationGain - cumulativeElevations?.[currentPositionIndex] || 0,
      remainingElevationLoss:
        stats.elevationLoss -
          cumulativeElevationLosses?.[currentPositionIndex] || 0,
      config: { tension: 170, friction: 26 },
    });

  return (
    <div className={className}>
      <div className="item">
        <animated.div className="value">
          {remainingDistance.to((n) => `${(n / 1000).toFixed(1)}`)}
        </animated.div>
        <div className="label">km</div>
      </div>
      <div className="item">
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
      </div>
    </div>
  );
});

export default style(TrailData);
