import { memo, useCallback, useMemo, useRef, useState } from "react";

import { animated, useSpring as useSpringWeb } from "@react-spring/web";
import { format } from "date-fns";

import useStore, { useProjectedLocation, useStats } from "../../store/store.js";
import Soundscape from "../soundscape/Soundscape.jsx";
import PaceProfile from "./PaceProfile/PaceProfile.jsx";
import PeakSummary from "./PeakSummary/PeakSummary.jsx";
import SectionAnalytics from "./SectionAnalytics/SectionAnalytics.jsx";
import StageAnalytics from "./StageAnalytics/StageAnalytics.jsx";
import StageETA from "./StageETA/StageETA.jsx";
import TrailActions from "./TrailActions/TrailActions.jsx";
import TrailOverview from "./TrailOverview/TrailOverview.jsx";
import TrailProgression from "./TrailProgression/TrailProgression.jsx";

import style from "./TrailData.style.js";

const PANEL_LABELS = [
  "Trail overview",
  "Trail progression",
  "Stage analytics",
  "Section analytics",
  "Stage ETA",
  "Pace profile",
  "Peak summary",
  "Soundscape",
  "Trail actions",
];

// Helper function to calculate ETA and remaining time
export const calculateTimeMetrics = (
  location,
  cumulativeDistances,
  startingDate,
) => {
  const distanceDone = cumulativeDistances[location?.index || 0] || 0;
  const totalDistance =
    cumulativeDistances[cumulativeDistances.length - 1] || 1;
  const elapsedDuration = (location?.timestamp || 0) - startingDate;

  // Avoid division by zero
  const estimatedTotalDuration =
    distanceDone > 0 ? (elapsedDuration * totalDistance) / distanceDone : 0;

  const now = Date.now();
  const eta = startingDate + Math.round(estimatedTotalDuration);

  // Format ETA as a readable date string with validation
  const etaDateStr = Number.isFinite(eta)
    ? format(new Date(eta), "EEE HH:mm")
    : "--:--";

  // Calculate remaining duration in milliseconds
  const remainingMs = Math.max(0, eta - now);

  // Convert to total hours and minutes (1 day = 24 hours)
  const totalMinutes = Math.floor(remainingMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  // Format remaining duration as hours and minutes only
  const remainingStr = remainingMs > 0 ? `${hours}h ${minutes}m` : "--";

  return {
    etaDateStr,
    remainingStr,
    distanceDone: Math.max(0, distanceDone),
    totalDistance: Math.max(0, totalDistance),
  };
};

const TrailData = memo(function TrailData({ className }) {
  const containerRef = useRef(null);
  const [activePanel, setActivePanel] = useState(0);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    setActivePanel(index);
  }, []);

  const scrollToPanel = useCallback((index) => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
  }, []);

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
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const timeMetrics = useMemo(() => {
    if (
      !cumulativeDistances?.length ||
      !startingDate ||
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
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    projectedLocation.index,
    projectedLocation.timestamp,
    cumulativeDistances,
    startingDate,
  ]);

  // Memoize remaining values for spring animation
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
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

      {/* Components container */}
      <div
        className="component-container"
        ref={containerRef}
        onScroll={handleScroll}
      >
        <div className="component-children">
          <TrailOverview />
        </div>
        <div className="component-children">
          <TrailProgression />
        </div>
        <div className="component-children">
          <StageAnalytics />
        </div>
        <div className="component-children">
          <SectionAnalytics />
        </div>
        <div className="component-children">
          <StageETA />
        </div>
        <div className="component-children">
          <PaceProfile />
        </div>
        <div className="component-children">
          <PeakSummary />
        </div>
        <div className="component-children">
          <Soundscape />
        </div>
        <div className="component-children">
          <TrailActions />
        </div>
      </div>

      {/* Pagination dots */}
      <div className="panel-dots" role="tablist" aria-label="Data panels">
        {PANEL_LABELS.map((label, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={i === activePanel}
            aria-label={label}
            className={`panel-dot${i === activePanel ? " active" : ""}`}
            onClick={() => scrollToPanel(i)}
          />
        ))}
      </div>
    </div>
  );
});

export default style(TrailData);
