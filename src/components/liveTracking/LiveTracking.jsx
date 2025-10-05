import { useSpring as useSpringWeb, animated } from "@react-spring/web";
import style from "./LiveTracking.style";
import useStore from "../../store/store.js";

function LiveTracking({ className }) {
  const cumulativeDistances = useStore((state) => state.cumulativeDistances);
  const cumulativeElevations = useStore((state) => state.cumulativeElevations);
  const cumulativeElevationLosses = useStore(
    (state) => state.cumulativeElevationLosses,
  );
  const gpsData = useStore((state) => state.gpsData);
  const currentPositionIndex = useStore((state) => state.currentPositionIndex);

  const springConfig = { tension: 170, friction: 26 };

  const { distance } = useSpringWeb({
    distance: cumulativeDistances?.[currentPositionIndex] || 0,
    config: springConfig,
  });

  const { elevation } = useSpringWeb({
    elevation: cumulativeElevations?.[currentPositionIndex] || 0,
    config: springConfig,
  });

  const { elevationLoss } = useSpringWeb({
    elevationLoss: cumulativeElevationLosses?.[currentPositionIndex] || 0,
    config: springConfig,
  });

  const { altitude } = useSpringWeb({
    altitude: gpsData?.[currentPositionIndex]?.[2] || 0,
    config: springConfig,
  });

  const { progress } = useSpringWeb({
    progress:
      gpsData && currentPositionIndex
        ? (currentPositionIndex * 100) / gpsData.length
        : 0,
    config: springConfig,
  });

  return (
    <div className={className}>
      <h1>Live Tracking</h1>
      <animated.div>
        {distance.to((n) => `${(n / 1000).toFixed(2)} km`)}
      </animated.div>

      <animated.div>{elevation.to((n) => `↗ ${n.toFixed(0)} m`)}</animated.div>

      <animated.div>
        {elevationLoss.to((n) => `↘ ${n.toFixed(0)} m`)}
      </animated.div>

      <animated.div>{altitude.to((n) => `${n.toFixed(0)} m`)}</animated.div>

      <animated.div>{progress.to((n) => `${n.toFixed(2)} %`)}</animated.div>
    </div>
  );
}

export default style(LiveTracking);
