import { useMemo } from "react";

import {
  animated,
  useReducedMotion,
  useSpring as useSpringWeb,
  useTransition,
} from "@react-spring/web";
import {
  ArrowDown,
  ArrowUp,
  CornerUpLeft,
  CornerUpRight,
} from "@styled-icons/feather";
import { useTheme } from "styled-components";
import { useShallow } from "zustand/react/shallow";

import useStore, { useProjectedLocation } from "../../store/store.js";

import style from "./Navigation.style.js";

// Animation configuration
const SECTION_ITEM_HEIGHT = 140;
const SECTION_ITEM_TRANSLATE = 6;
const SPRING_CONFIG = { tension: 170, friction: 26 };

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

function Navigation({ className, singleSection }) {
  const {
    legs,
    cumulativeDistances,
    cumulativeElevations,
    cumulativeElevationLosses,
  } = useStore(
    useShallow((state) => ({
      legs: state.legs,
      cumulativeDistances: state.gpx.cumulativeDistances,
      cumulativeElevations: state.gpx.cumulativeElevations,
      cumulativeElevationLosses: state.gpx.cumulativeElevationLosses,
    })),
  );
  const projectedLocation = useProjectedLocation();
  const currentPositionIndex = projectedLocation.index || 0;
  const theme = useTheme();
  const reducedMotion = useReducedMotion();

  const remainingSections = useMemo(
    () =>
      legs?.filter((section) => section.endIndex >= currentPositionIndex) ?? [],
    [legs, currentPositionIndex],
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
    config: SPRING_CONFIG,
    immediate: reducedMotion,
  });

  const displaySections = useMemo(
    () => (singleSection ? remainingSections.slice(0, 1) : remainingSections),
    [singleSection, remainingSections],
  );

  const transitions = useTransition(displaySections, {
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
    immediate: reducedMotion,
  });

  return (
    <div className={className} aria-label="Upcoming sections" role="region">
      {transitions((animStyle, section, _, index) => {
        const isCurrent = index === 0;
        const ArrowIcon = getArrowIcon(section.bearing);

        return (
          <animated.div
            className={`section${isCurrent ? " current" : ""}`}
            style={animStyle}
          >
            <div className="arrow-container">
              <ArrowIcon
                size={32}
                strokeWidth={2}
                stroke={theme.colors[theme.currentVariant]["--color-primary"]}
              />
            </div>

            {/* Distance section - large number */}
            <div className="distance-section">
              <div
                className="distance-value"
                aria-label="Distance to next waypoint"
              >
                {isCurrent ? (
                  <animated.span>
                    {distance.to((n) => `${(n / 1000).toFixed(1)}`)}
                  </animated.span>
                ) : (
                  <span>{(section.totalDistance / 1000).toFixed(1)}</span>
                )}
                <div className="distance-unit">km</div>
              </div>

              <div className="waypoint">{section.endLocation}</div>
            </div>

            {/* Elevation info */}
            <div className="info-section">
              <div className="elevation-section">
                <div
                  className="elevation-item gain"
                  aria-label="Elevation gain"
                >
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
                <div
                  className="elevation-item loss"
                  aria-label="Elevation loss"
                >
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
          </animated.div>
        );
      })}
    </div>
  );
}

export default style(Navigation);
