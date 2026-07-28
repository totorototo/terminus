import { memo, useMemo } from "react";

import { animated, useSpring } from "@react-spring/web";
import { Radio } from "@styled-icons/feather/Radio";
import { useShallow } from "zustand/react/shallow";

import useStore, { useProjectedLocation } from "../../../store/store.js";
import { calculateTimeMetrics } from "../../trailData/trailDataHelpers.js";
import StorySection from "../StorySection.jsx";

import style from "./StoryNow.style.js";

const StoryNow = memo(function StoryNow({ className }) {
  const projectedLocation = useProjectedLocation();
  const cumulativeDistances = useStore(
    (state) => state.gpx.cumulativeDistances || [],
  );
  const sections = useStore((state) => state.sections);
  const { autoShareEnabled, toggleAutoShare } = useStore(
    useShallow((state) => ({
      autoShareEnabled: state.gps.autoShareEnabled,
      toggleAutoShare: state.toggleAutoShare,
    })),
  );
  const startingDate =
    sections?.length && sections[0].startTime != null
      ? sections[0].startTime * 1000
      : null;

  const metrics = useMemo(() => {
    if (
      !cumulativeDistances?.length ||
      !startingDate ||
      !sections?.length ||
      projectedLocation.timestamp < startingDate
    ) {
      return { etaDateStr: "--:--", remainingStr: "--", remainingKm: 0 };
    }
    const { etaDateStr, remainingStr, distanceDone, totalDistance } =
      calculateTimeMetrics(
        projectedLocation,
        cumulativeDistances,
        startingDate,
        sections,
      );
    return {
      etaDateStr,
      remainingStr,
      remainingKm: Math.max(0, totalDistance - distanceDone) / 1000,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    projectedLocation.index,
    projectedLocation.timestamp,
    cumulativeDistances,
    startingDate,
    sections,
  ]);

  const { remainingKm } = useSpring({
    remainingKm: metrics.remainingKm,
    config: { tension: 170, friction: 26 },
  });

  return (
    <div className={className}>
      <StorySection eyebrow="Right now" title="Where you are">
        <div className="live-badge">
          <span className="live-dot" />
          live
        </div>
        <div className="now-row">
          <div className="now-stat">
            <animated.span className="now-value">
              {remainingKm.to((n) => n.toFixed(1))}
            </animated.span>
            <span className="now-label">km left</span>
          </div>
          <div className="now-stat">
            <span className="now-value">
              {metrics.etaDateStr.toUpperCase()}
            </span>
            <span className="now-label">eta</span>
          </div>
          <div className="now-stat">
            <span className="now-value">{metrics.remainingStr}</span>
            <span className="now-label">remaining</span>
          </div>
        </div>
        <p className="now-note">Based on your pace so far against terrain.</p>

        {/* why: this is the only control that starts the GPS fix this whole
            page's live numbers depend on — everything else here is read-only. */}
        <button
          type="button"
          className={autoShareEnabled ? "track-btn on" : "track-btn"}
          onClick={toggleAutoShare}
          aria-pressed={autoShareEnabled}
        >
          <Radio size={16} />
          {autoShareEnabled ? "GPS on · spotting every 30 min" : "Spot me"}
        </button>
      </StorySection>
    </div>
  );
});

const StyledStoryNow = style(StoryNow);

export default StyledStoryNow;
