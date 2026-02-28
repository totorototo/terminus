import { useMemo } from "react";

import {
  animated,
  useSpring as useSpringWeb,
  useTransition,
} from "@react-spring/web";
import { ArrowUp, CornerUpLeft, CornerUpRight } from "@styled-icons/feather";
import { ArrowDown } from "@styled-icons/feather";
import { format, formatDuration, intervalToDuration } from "date-fns";
import { useTheme } from "styled-components";
import { useShallow } from "zustand/react/shallow";

import { DIFFICULTY_COLORS, DIFFICULTY_LABELS } from "../../constants.js";
import useStore from "../../store/store.js";
import { useProjectedLocation } from "../../store/store.js";

import style from "./Navigation.style.js";

// Custom locale for duration formatting
const customLocale = {
  formatDistance: (token, count) => {
    const units = {
      xSeconds: `${count}sec`,
      xMinutes: `${count}m`,
      xHours: `${count}h`,
      xDays: `${count}d`,
    };
    return units[token] || "";
  },
};

// Animation configuration
const SECTION_ITEM_HEIGHT = 140;
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
  const {
    sections,
    cumulativeDistances,
    cumulativeElevations,
    cumulativeElevationLosses,
  } = useStore(
    useShallow((state) => ({
      sections: state.sections,
      cumulativeDistances: state.gpx.cumulativeDistances,
      cumulativeElevations: state.gpx.cumulativeElevations,
      cumulativeElevationLosses: state.gpx.cumulativeElevationLosses,
    })),
  );
  const projectedLocation = useProjectedLocation();
  const currentPositionIndex = projectedLocation.index || 0;
  const theme = useTheme();

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
        const endDate = new Date(section.endTime * 1000);
        const cutOffDay = format(endDate, "EEE");
        const cutOffTime = format(endDate, "HH:mm");
        const formattedDuration = formatDuration(
          intervalToDuration({
            start: 0,
            end: section.maxCompletionTime * 1000,
          }),
          {
            format: ["hours", "minutes"],
            locale: customLocale,
          },
        ).replace(/\s+/g, "");

        return (
          <animated.div
            className={`section${isCurrent ? " current" : ""}`}
            style={animStyle}
          >
            <div className="arrow-container">
              <ArrowIcon
                size={32}
                strokeWidth={2}
                stroke={theme.colors.dark["--color-primary"]}
              />
            </div>

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

              <div className="waypoint">{section.endLocation}</div>

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

            {/* Waypoint and time info */}
            <div className="info-section">
              <div className="time-row">
                <span className="time-value">{cutOffDay}</span>
                <span className="time-value">{cutOffTime}</span>
              </div>
              <div className="duration-row">
                <span className="duration-value">{formattedDuration}</span>
              </div>
              {section.difficulty > 0 && (
                <div className="difficulty-row">
                  <span
                    className="difficulty-value"
                    style={{
                      color: DIFFICULTY_COLORS[section.difficulty - 1],
                    }}
                  >
                    {DIFFICULTY_LABELS[section.difficulty - 1]}
                  </span>
                </div>
              )}
            </div>
          </animated.div>
        );
      })}
    </div>
  );
}

export default style(Navigation);
