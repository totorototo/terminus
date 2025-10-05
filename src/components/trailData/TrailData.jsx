import { memo } from "react";
import { useSpring as useSpringWeb, animated } from "@react-spring/web";
import style from "./TrailData.style.js";
import useStore from "../../store/store.js";

const TrailData = memo(function TrailData({ gpsResults, className }) {
  const stats = useStore((state) => state.stats);

  const { distance } = useSpringWeb({
    distance: stats.distance || 0,
    config: { tension: 170, friction: 26 },
  });

  const { elevationGain } = useSpringWeb({
    elevationGain: stats.elevationGain || 0,
    config: { tension: 170, friction: 26 },
  });

  const { elevationLoss } = useSpringWeb({
    elevationLoss: stats.elevationLoss || 0,
    config: { tension: 170, friction: 26 },
  });

  const { pointCount } = useSpringWeb({
    pointCount: stats.pointCount || 0,
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
});

export default style(TrailData);
