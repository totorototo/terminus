import { lazy, memo, useMemo } from "react";

import { animated, useSpring as useSpringWeb } from "@react-spring/web";

import useStore, { useProjectedLocation, useStats } from "../../store/store.js";
import Carousel from "../carousel/Carousel.jsx";
import LazyPanel from "../lazyPanel/LazyPanel.jsx";
import GpsView from "./GpsView/GpsView.jsx";
import PaceProfile from "./PaceProfile/PaceProfile.jsx";
import PaceSettings from "./PaceSettings/PaceSettings.jsx";
import PeakSummary from "./PeakSummary/PeakSummary.jsx";
import SectionAnalytics from "./SectionAnalytics/SectionAnalytics.jsx";
import SectionETA from "./SectionETA/SectionETA.jsx";
import StageAnalytics from "./StageAnalytics/StageAnalytics.jsx";
import StageETA from "./StageETA/StageETA.jsx";
import TrailActions from "./TrailActions/TrailActions.jsx";
import { calculateTimeMetrics } from "./trailDataHelpers.js";
import TrailOverview from "./TrailOverview/TrailOverview.jsx";
import TrailProgression from "./TrailProgression/TrailProgression.jsx";

import style from "./TrailData.style.js";

// mapbox-gl (~452 KB) is the heaviest dependency in the trailer view and the
// map sits off-screen on carousel panel 2. Lazy-import it so its chunk stays
// out of the initial bundle; LazyPanel mounts it on demand as the slide nears.
const TrailMap = lazy(() => import("./Map/Map.jsx"));

const PANEL_LABELS = [
  "Trail overview",
  "Map",
  "GPS view",
  "Trail progression",
  "Checkpoints",
  "Life bases",
  "Pace profile",
  "Stage analytics",
  "Section analytics",
  "Peak summary",
  "Pace settings",
  "Trail actions",
];

const TrailData = memo(function TrailData({ className }) {
  // Use optimized selectors for better performance
  const projectedLocation = useProjectedLocation();
  useStats();
  const cumulativeDistances = useStore(
    (state) => state.gpx.cumulativeDistances || [],
  );

  const sections = useStore((state) => state.sections);
  const startingDate =
    sections &&
    sections.length > 0 &&
    sections[0].startTime != null &&
    sections[0].startTime * 1000;

  // Memoize expensive time calculations
  const timeMetrics = useMemo(() => {
    if (
      !cumulativeDistances?.length ||
      !startingDate ||
      !sections?.length ||
      projectedLocation.timestamp < startingDate
    ) {
      return {
        etaDateStr: "--:--",
        remainingStr: "--",
        distanceDone: 0,
        totalDistance: 0,
      };
    }
    return calculateTimeMetrics(
      projectedLocation,
      cumulativeDistances,
      startingDate,
      sections,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    projectedLocation.index,
    projectedLocation.timestamp,
    cumulativeDistances,
    startingDate,
    sections,
  ]);

  // Memoize remaining values for spring animation
  const remainingValues = useMemo(() => {
    const currentPositionIndex = projectedLocation?.index || 0;
    const distanceDone = cumulativeDistances[currentPositionIndex] || 0;
    const totalDistance =
      cumulativeDistances[cumulativeDistances.length - 1] || 0;
    const remainingDistance = Math.max(0, totalDistance - distanceDone);

    return {
      remainingKm: remainingDistance / 1000,
    };
  }, [projectedLocation?.index, cumulativeDistances]);

  const { remainingKm } = useSpringWeb({
    ...remainingValues,
    config: { tension: 170, friction: 26 },
  });

  return (
    <div className={className}>
      {/* Stats container */}
      <div className="stats-container">
        <div className="stat-item">
          <animated.div className="stat-value">
            {remainingKm.to((n) => n.toFixed(1))}
          </animated.div>
          <div className="stat-label">km left</div>
        </div>

        <div className="stat-divider" />

        <div className="stat-item">
          <div
            className="stat-value"
            aria-live="polite"
            aria-atomic="true"
            aria-label={`ETA: ${timeMetrics.etaDateStr}`}
          >
            {timeMetrics.etaDateStr.toUpperCase()}
          </div>
          <div className="stat-label">eta</div>
        </div>

        <div className="stat-divider" />

        <div className="stat-item">
          <div
            className="stat-value"
            aria-live="polite"
            aria-atomic="true"
            aria-label={`Remaining time: ${timeMetrics.remainingStr}`}
          >
            {timeMetrics.remainingStr}
          </div>
          <div className="stat-label">remaining</div>
        </div>
      </div>

      {/* Divider line */}
      <div className="content-divider" />

      {/* Components carousel */}
      <Carousel
        className="trail-data-carousel"
        labels={PANEL_LABELS}
        ariaLabel="Data panels"
        gap="1.5rem"
      >
        <TrailOverview />
        <LazyPanel>
          <TrailMap />
        </LazyPanel>
        <GpsView />
        <TrailProgression />
        <SectionETA />
        <StageETA />
        <PaceProfile />
        <StageAnalytics />
        <SectionAnalytics />
        <PeakSummary />
        <PaceSettings />
        <TrailActions />
      </Carousel>
    </div>
  );
});

const StyledTrailData = style(TrailData);

export default StyledTrailData;
