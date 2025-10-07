import {
  useSpring as useSpringWeb,
  animated,
  useTransition,
} from "@react-spring/web";
import style from "./Navigation.style.js";
import useStore from "../../store/store.js";
import { CornerUpRight } from "@styled-icons/feather/CornerUpRight";

function Navigation({ className }) {
  const sections = useStore((state) => state.sections);
  const currentPositionIndex = useStore((state) => state.currentPositionIndex);
  const cumulativeDistances = useStore((state) => state.cumulativeDistances);
  const cumulativeElevations = useStore((state) => state.cumulativeElevations);
  const cumulativeElevationLosses = useStore(
    (state) => state.cumulativeElevationLosses,
  );

  const springConfig = { tension: 170, friction: 26 };

  const remaningSections = sections?.filter(
    (section) => section.endIndex >= currentPositionIndex,
  );
  const currentSection =
    remaningSections?.length > 0 ? remaningSections[0] : null;

  const { distance, elevation, elevationLoss } = useSpringWeb({
    distance:
      currentSection && cumulativeDistances
        ? cumulativeDistances[currentSection.endIndex] -
          cumulativeDistances[currentPositionIndex]
        : 0,
    elevation:
      currentSection && cumulativeElevations
        ? cumulativeElevations[currentSection.endIndex] -
          cumulativeElevations[currentPositionIndex]
        : 0,
    elevationLoss:
      currentSection && cumulativeElevationLosses
        ? cumulativeElevationLosses[currentSection.endIndex] -
          cumulativeElevationLosses[currentPositionIndex]
        : 0,
    config: springConfig,
  });

  const transitions = useTransition(remaningSections || [], {
    from: { opacity: 0, height: 0 },
    enter: { opacity: 1, height: 66 },
    leave: { opacity: 0, height: 0 },
    keys: (section) => section.segmentId,
  });

  return (
    <div className={className}>
      {transitions((style, section, _, index) => (
        <animated.div className="section" style={style}>
          <CornerUpRight size={32} />
          <div className="location-container">
            <div className="distance-container">
              {index === 0 ? (
                <animated.div className="distance">
                  <animated.span>
                    {distance.to((n) => (n / 1000).toFixed(1))}
                  </animated.span>
                  <span className="unit">km</span>
                </animated.div>
              ) : (
                <div className="distance">
                  <span>{(section.totalDistance / 1000).toFixed(2)}</span>
                  <span className="unit">km</span>
                </div>
              )}
            </div>
            <div className="location">{section.endLocation}</div>
          </div>

          <div className="elevation-container">
            {index === 0 ? (
              <animated.div className="elevation gain">
                <animated.span>
                  {elevation.to((n) => n.toFixed(0))}
                </animated.span>
                <span className="unit">m ↗</span>
              </animated.div>
            ) : (
              <div className="elevation gain">
                <span>{section.totalElevation.toFixed(0)}</span>
                <span className="unit">m ↗</span>
              </div>
            )}
            {index === 0 ? (
              <animated.div className="elevation loss">
                <animated.span>
                  {elevationLoss.to((n) => n.toFixed(0))}
                </animated.span>
                <span className="unit">m ↘</span>
              </animated.div>
            ) : (
              <div className="elevation loss">
                <span>{section.totalElevationLoss.toFixed(0)}</span>
                <span className="unit">m ↘</span>
              </div>
            )}
          </div>
        </animated.div>
      ))}
    </div>
  );
}

export default style(Navigation);
