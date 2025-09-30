import React from "react";
import { useSpring as useSpringWeb, animated } from "@react-spring/web";
import style from "./TrailData.style.js";

function TrailData({ gpsResults, className }) {
  const { distance } = useSpringWeb({
    distance: gpsResults?.totalDistance || 0,
    config: { tension: 170, friction: 26 },
  });

  const { elevationGain } = useSpringWeb({
    elevationGain: gpsResults?.totalElevation || 0,
    config: { tension: 170, friction: 26 },
  });

  const { elevationLoss } = useSpringWeb({
    elevationLoss: gpsResults?.totalElevationLoss || 0,
    config: { tension: 170, friction: 26 },
  });

  const { pointCount } = useSpringWeb({
    pointCount: gpsResults?.pointCount || 0,
    config: { tension: 170, friction: 26 },
  });

  return (
    <div className={className}>
      <h1>Trail Analytics</h1>
      <animated.div>
        {distance.to((n) => `Distance: ${(n / 1000).toFixed(2)} km`)}
      </animated.div>
      <animated.div>
        {elevationGain.to((n) => `Elevation: ${n.toFixed(0)} m`)}
      </animated.div>
      <animated.div>
        {elevationLoss.to((n) => `Elevation Loss: ${n.toFixed(0)} m`)}
      </animated.div>
      <animated.div>
        {pointCount.to((n) => `Points: ${n.toLocaleString()}`)}
      </animated.div>
    </div>
  );
}

export default style(TrailData);
