import { memo, useEffect, useMemo, useRef, useState } from "react";

import { curveCatmullRom, line as d3Line } from "d3-shape";
import { createPortal } from "react-dom";

import { createXScale, createYScale } from "../../helpers/d3.js";
import useStore, { useProjectedLocation } from "../../store/store.js";
import StoryDotNav from "./StoryDotNav.jsx";
import { STORY_SECTIONS } from "./storySections.js";

import style from "./Story.style.js";

// Normalized viewBox for the background contour — independent of real pixel
// height, since the SVG stretches (preserveAspectRatio="none") to match
// whatever height the scrollable content ends up being.
const CONTOUR_WIDTH = 200;
const CONTOUR_HEIGHT = 1000;
const CONTOUR_SAMPLES = 240;

// why: the signature element is the real route profile, rotated — elevation
// drives horizontal position, distance-along-route drives vertical position,
// so scrolling down the page is literally walking the mountain top to bottom.
// It's the one throughline connecting every section, not a decorative bg.
function buildContour(gpxData) {
  if (!gpxData?.length) return null;

  const step = Math.max(1, Math.floor(gpxData.length / CONTOUR_SAMPLES));
  const sampled = gpxData.filter((_, i) => i % step === 0);
  const elevations = sampled.map((p) => p[2]);
  const minElev = Math.min(...elevations);
  const maxElev = Math.max(...elevations);
  const elevRange = maxElev - minElev || 1;

  const scaleElev = createXScale(
    { min: minElev - elevRange * 0.15, max: maxElev + elevRange * 0.15 },
    { min: CONTOUR_WIDTH * 0.15, max: CONTOUR_WIDTH * 0.85 },
  );
  const scaleIndex = createYScale(
    { min: 0, max: sampled.length - 1 },
    { min: 0, max: CONTOUR_HEIGHT },
  );

  const path = d3Line()
    .x((d) => scaleElev(d[2]))
    .y((_, i) => scaleIndex(i))
    .curve(curveCatmullRom.alpha(0.5))(sampled);

  return { path, sampled, step, scaleElev, scaleIndex };
}

// why: the drawn path is a Catmull-Rom spline through *decimated* samples, not
// the raw per-point elevation — placing the marker from raw data puts it off
// the visible curve whenever terrain wiggles between two samples. Interpolating
// between the same two sampled points the curve is drawn through keeps it on
// (or very near) the line the eye actually follows.
function markerPosition(contour, index) {
  const { sampled, step, scaleElev, scaleIndex } = contour;
  const sampledIdx = Math.min(index / step, sampled.length - 1);
  const left = Math.floor(sampledIdx);
  const right = Math.min(Math.ceil(sampledIdx), sampled.length - 1);
  const t = sampledIdx - left;
  const elev = sampled[left][2] + (sampled[right][2] - sampled[left][2]) * t;

  return {
    leftPct: (scaleElev(elev) / CONTOUR_WIDTH) * 100,
    topPct: (scaleIndex(sampledIdx) / CONTOUR_HEIGHT) * 100,
  };
}

const Story = memo(function Story({ className }) {
  const gpxData = useStore((state) => state.gpx.data);
  const projectedLocation = useProjectedLocation();
  const sectionRefs = useRef([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const contour = useMemo(() => buildContour(gpxData), [gpxData]);

  const marker =
    contour && projectedLocation?.index != null
      ? markerPosition(contour, projectedLocation.index)
      : null;

  const jumpToIndex = (index) => {
    sectionRefs.current[index]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  // why: a thin band near the top of the viewport (not the full viewport)
  // is the standard scrollspy trick — whichever section's boundary is
  // crossing that band is "current". Observing the whole viewport instead
  // would make the nav track whichever section happens to be tallest/most
  // visible, jumping past short sections a reader is actually scrolling
  // through.
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        // why: near a section boundary, both neighbors can sit inside the
        // thin band in the same callback batch — entries[] order isn't
        // guaranteed to match scroll order, so picking "whichever came
        // last" flips the active dot depending on iteration order rather
        // than position. The topmost intersecting entry is the one the
        // reader is actually at.
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (!visible.length) return;
        const topmost = visible.reduce((a, b) =>
          a.boundingClientRect.top <= b.boundingClientRect.top ? a : b,
        );
        const index = sectionRefs.current.indexOf(topmost.target);
        if (index !== -1) setActiveIndex(index);
      },
      { rootMargin: "-15% 0px -80% 0px", threshold: 0 },
    );
    sectionRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* why: position: fixed inside this scrolling container doesn't
          reliably survive iOS Safari's compositing of an overflow:auto +
          mask-image ancestor (see ThemeToggle's own why-comment for the
          same constraint) — portal straight to <body> so the nav is a
          proper viewport-fixed control. Portaling (not a separate sibling
          mount) keeps activeIndex/jumpToIndex as plain props instead of a
          cross-tree bridge. */}
      {createPortal(
        <StoryDotNav activeIndex={activeIndex} onJump={jumpToIndex} />,
        document.body,
      )}
      <div className={className}>
        {contour?.path && (
          <svg
            className="story-contour"
            viewBox={`0 0 ${CONTOUR_WIDTH} ${CONTOUR_HEIGHT}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d={contour.path} className="contour-line" fill="none" />
          </svg>
        )}
        {marker && (
          <div
            className="story-marker"
            style={{ left: `${marker.leftPct}%`, top: `${marker.topPct}%` }}
            aria-hidden="true"
          />
        )}

        <div className="story-content">
          {STORY_SECTIONS.map(({ id, Component }, index) => (
            <div
              key={id}
              ref={(el) => {
                sectionRefs.current[index] = el;
              }}
            >
              <Component />
            </div>
          ))}
        </div>
      </div>
    </>
  );
});

const StyledStory = style(Story);

export default StyledStory;
