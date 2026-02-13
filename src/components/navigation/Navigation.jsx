import {
  useSpring as useSpringWeb,
  animated,
  useTransition,
} from "@react-spring/web";
import { useMemo } from "react";
import style from "./Navigation.style.js";
import useStore from "../../store/store.js";
import { ArrowUp, CornerUpLeft, CornerUpRight } from "@styled-icons/feather";
import { ArrowDown } from "@styled-icons/feather";
import { useProjectedLocation } from "../../store/store.js";
import { format } from "date-fns";
import { Clock } from "@styled-icons/feather";

// Animation configuration
const SECTION_ITEM_HEIGHT = 66;
const SECTION_ITEM_TRANSLATE = 6;

// Get arrow icon based on bearing direction
function getArrowIcon(bearing) {
  // Normalize bearing to 0-360
  const normalizedBearing = ((bearing % 360) + 360) % 360;

  // Divide into 4 quadrants
  if (normalizedBearing >= 315 || normalizedBearing < 45) {
    return ArrowUp; // North
  } else if (normalizedBearing >= 45 && normalizedBearing < 135) {
    return CornerUpRight; // East
  } else if (normalizedBearing >= 135 && normalizedBearing < 225) {
    return ArrowDown; // South
  } else {
    return CornerUpLeft; // West
  }
}

function Navigation({ className }) {
  const sections = useStore((state) => state.sections);

  const projectedLocation = useProjectedLocation();
  const currentPositionIndex = projectedLocation.index || 0;

  const cumulativeDistances = useStore(
    (state) => state.gpx.cumulativeDistances,
  );

  const cumulativeElevations = useStore(
    (state) => state.gpx.cumulativeElevations,
  );

  const cumulativeElevationLosses = useStore(
    (state) => state.gpx.cumulativeElevationLosses,
  );

  const springConfig = { tension: 170, friction: 26 };

  // currentPosition
  const remainingSections = useMemo(
    () =>
      sections?.filter((section) => section.endIndex >= currentPositionIndex) ??
      [],
    [sections, currentPositionIndex],
  );

  const currentSection =
    remainingSections?.length > 0 ? remainingSections[0] : null;

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

  const transitions = useTransition(remainingSections || [], {
    // animate height (and a subtle translate) only — leave opacity to CSS classes
    from: {
      height: 0,
      transform: `translateY(-${SECTION_ITEM_TRANSLATE}px)`,
    },
    enter: { height: SECTION_ITEM_HEIGHT, transform: "translateY(0px)" },
    leave: {
      height: 0,
      transform: `translateY(-${SECTION_ITEM_TRANSLATE}px)`,
    },
    keys: (section) => section.segmentId,
  });

  return (
    <div className={className}>
      {transitions((style, section, _, index) => {
        const ArrowIcon = getArrowIcon(section.bearing);
        const cutOffTime = format(
          new Date(section.endTime * 1000),
          "EEEEEE HH:mm",
        );

        return (
          <animated.div
            className={`section${index === 0 ? " current" : ""}`}
            style={style}
          >
            <ArrowIcon size={40} />
            <div className="location-container">
              <div className="location">
                <span className="value">{section.endLocation}</span>
              </div>
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
            </div>

            <div className="meta-container">
              <div className="cutoff-time">
                <Clock size={16} />
                <span>{cutOffTime}</span>
              </div>

              <div className="elevation-container">
                {index === 0 ? (
                  <animated.div className="elevation gain">
                    <animated.span>
                      {elevation.to((n) => n.toFixed(0))}
                    </animated.span>
                    <span className="unit">D+</span>
                  </animated.div>
                ) : (
                  <div className="elevation gain">
                    <span>{section.totalElevation.toFixed(0)}</span>
                    <span className="unit">D+</span>
                  </div>
                )}
                {index === 0 ? (
                  <animated.div className="elevation loss">
                    <animated.span>
                      {elevationLoss.to((n) => n.toFixed(0))}
                    </animated.span>
                    <span className="unit">D-</span>
                  </animated.div>
                ) : (
                  <div className="elevation loss">
                    <span>{section.totalElevationLoss.toFixed(0)}</span>
                    <span className="unit">D-</span>
                  </div>
                )}
              </div>
            </div>
          </animated.div>
        );
      })}
    </div>
  );
}

export default style(Navigation);
