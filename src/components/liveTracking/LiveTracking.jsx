import { animated, useSpring as useSpringWeb } from "@react-spring/web";
import { Navigation } from "@styled-icons/feather/Navigation";
import { useShallow } from "zustand/react/shallow";

import useStore from "../../store/store.js";

import style from "./LiveTracking.style";

function LiveTracking({ className }) {
  const {
    cumulativeDistances,
    cumulativeElevations,
    cumulativeElevationLosses,
    gpsData,
    currentPositionIndex,
    stats,
  } = useStore(
    useShallow((state) => ({
      cumulativeDistances: state.gpx.cumulativeDistances,
      cumulativeElevations: state.gpx.cumulativeElevations,
      cumulativeElevationLosses: state.gpx.cumulativeElevationLosses,
      gpsData: state.gps.data,
      currentPositionIndex: state.app.currentPositionIndex,
      stats: state.stats,
    })),
  );

  const springConfig = { tension: 170, friction: 26 };

  // Batch all spring animations into a single hook for better performance
  const springs = useSpringWeb({
    distance:
      (stats?.distance || 0) -
      (cumulativeDistances?.[currentPositionIndex] || 0),
    elevation:
      (stats?.elevationGain || 0) -
      (cumulativeElevations?.[currentPositionIndex] || 0),
    elevationLoss:
      (stats?.elevationLoss || 0) -
      (cumulativeElevationLosses?.[currentPositionIndex] || 0),
    altitude: gpsData?.[currentPositionIndex]?.[2] || 0,
    progress:
      gpsData && currentPositionIndex
        ? 100 - (currentPositionIndex * 100) / gpsData.length
        : 0,
    config: springConfig,
  });
  const { distance, elevation, elevationLoss, altitude, progress } = springs;

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
