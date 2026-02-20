import {
  useSpring as useSpringWeb,
  animated,
  useTransition,
} from "@react-spring/web";
import { useMemo, useState, useEffect } from "react";
import style from "./Navigation.style.js";
import useStore from "../../store/store.js";
import { ArrowUp, CornerUpLeft, CornerUpRight } from "@styled-icons/feather";
import { ArrowDown } from "@styled-icons/feather";
import { useProjectedLocation } from "../../store/store.js";
import { format } from "date-fns";

// Animation configuration
const SECTION_ITEM_HEIGHT = 100;
const SECTION_ITEM_TRANSLATE = 6;

// Get arrow icon based on bearing direction
function getArrowIcon(bearing) {
  const normalizedBearing = ((bearing % 360) + 360) % 360;

  if (normalizedBearing >= 315 || normalizedBearing < 45) {
    return ArrowUp;
  } else if (normalizedBearing >= 45 && normalizedBearing < 135) {
    return CornerUpRight;
  } else if (normalizedBearing >= 135 && normalizedBearing < 225) {
    return ArrowDown;
  } else {
    return CornerUpLeft;
  }
}

// SVG Arrow icons for elevation indicators
const UpArrow = () => (
  <svg
    width="11"
    height="11"
    viewBox="0 0 24 24"
    fill="currentColor"
    style={{ color: "inherit" }}
  >
    <path d="M12 4l8 14H4z" />
  </svg>
);

const DownArrow = () => (
  <svg
    width="11"
    height="11"
    viewBox="0 0 24 24"
    fill="currentColor"
    style={{ color: "inherit" }}
  >
    <path d="M12 20l-8-14h16z" />
  </svg>
);

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
      {transitions((animStyle, section, _, index) => {
        const isCurrent = index === 0;
        const ArrowIcon = getArrowIcon(section.bearing);
        const cutOffTime = format(new Date(section.endTime * 1000), "E HH:mm");

        return (
          <animated.div
            className={`section${isCurrent ? " current" : ""}`}
            style={animStyle}
          >
            {/* Arrow icon in circle */}
            <div className="arrow-container">
              <ArrowIcon size={22} />
            </div>

            {/* Vertical separator */}
            <div className="separator" />

            {/* Distance section - large number */}
            <div className="distance-section">
              <div className="distance-value">
                {isCurrent ? (
                  <animated.span>
                    {distance.to((n) => `${(n / 1000).toFixed(1)}`)}
                  </animated.span>
                ) : (
                  <span>{(section.totalDistance / 1000).toFixed(1)}</span>
                )}
                <div className="distance-unit">km</div>
              </div>

              {/* Elevation indicators */}
              <div className="elevation-section">
                <div className="elevation-item gain">
                  <UpArrow />
                  {isCurrent ? (
                    <animated.span>
                      {elevation.to((n) => n.toFixed(0))}
                    </animated.span>
                  ) : (
                    <span>{section.totalElevation.toFixed(0)}</span>
                  )}
                  <span className="unit">m</span>
                </div>
                <div className="elevation-item loss">
                  <DownArrow />
                  {isCurrent ? (
                    <animated.span>
                      {elevationLoss.to((n) => n.toFixed(0))}
                    </animated.span>
                  ) : (
                    <span>{section.totalElevationLoss.toFixed(0)}</span>
                  )}
                  <span className="unit">m</span>
                </div>
              </div>
            </div>

            {/* Vertical separator */}
            <div className="separator" />

            {/* Waypoint and time info */}
            <div className="info-section">
              <div className="waypoint">{section.endLocation}</div>
              <div className="time-row">
                <span className="time-value">{cutOffTime}</span>
              </div>
            </div>
          </animated.div>
        );
      })}
    </div>
  );
}

export default style(Navigation);
