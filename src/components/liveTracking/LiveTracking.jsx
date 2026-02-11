import { useSpring as useSpringWeb, animated } from "@react-spring/web";
import style from "./LiveTracking.style";
import useStore from "../../store/store.js";
import { Navigation } from "@styled-icons/feather/Navigation";

function LiveTracking({ className }) {
  const cumulativeDistances = useStore(
    (state) => state.gpx.cumulativeDistances,
  );
  const cumulativeElevations = useStore(
    (state) => state.gpx.cumulativeElevations,
  );
  const cumulativeElevationLosses = useStore(
    (state) => state.gpx.cumulativeElevationLosses,
  );
  const gpsData = useStore((state) => state.gps.data);
  const currentPositionIndex = useStore(
    (state) => state.app.currentPositionIndex,
  );
  const stats = useStore((state) => state.stats);

  const springConfig = { tension: 170, friction: 26 };

  const { distance } = useSpringWeb({
    distance: stats.distance - cumulativeDistances?.[currentPositionIndex] || 0,
    config: springConfig,
  });

  const { elevation } = useSpringWeb({
    elevation:
      stats.elevationGain - cumulativeElevations?.[currentPositionIndex] || 0,
    config: springConfig,
  });

  const { elevationLoss } = useSpringWeb({
    elevationLoss:
      stats.elevationLoss - cumulativeElevationLosses?.[currentPositionIndex] ||
      0,
    config: springConfig,
  });

  const { altitude } = useSpringWeb({
    altitude: gpsData?.[currentPositionIndex]?.[2] || 0,
    config: springConfig,
  });

  const { progress } = useSpringWeb({
    progress:
      gpsData && currentPositionIndex
        ? 100 - (currentPositionIndex * 100) / gpsData.length
        : 0,
    config: springConfig,
  });

  return (
    <div className={className}>
      <div className="live-tracking-header">
        <div className={"distance"}>
          <Navigation size="24" />
          <animated.div>
            {distance.to((n) => `${(n / 1000).toFixed(1)} km`)}
          </animated.div>
        </div>
      </div>

      <animated.div>{elevation.to((n) => `↗ ${n.toFixed(0)} m`)}</animated.div>

      <animated.div>
        {elevationLoss.to((n) => `↘ ${n.toFixed(0)} m`)}
      </animated.div>

      <animated.div>{progress.to((n) => `${n.toFixed(2)} %`)}</animated.div>

      <animated.div>{altitude.to((n) => `${n.toFixed(0)} m`)}</animated.div>
    </div>
  );
}

export default style(LiveTracking);
