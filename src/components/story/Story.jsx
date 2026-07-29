import { memo, useMemo } from "react";

import { Moon } from "@styled-icons/feather/Moon";
import { Sun } from "@styled-icons/feather/Sun";
import { curveCatmullRom, line as d3Line } from "d3-shape";
import { useShallow } from "zustand/react/shallow";

import { createXScale, createYScale } from "../../helpers/d3.js";
import useStore, { useProjectedLocation } from "../../store/store.js";
import StoryCheckpoints from "./sections/StoryCheckpoints.jsx";
import StoryClimbs from "./sections/StoryClimbs.jsx";
import StoryEnd from "./sections/StoryEnd.jsx";
import StoryHero from "./sections/StoryHero.jsx";
import StoryMap from "./sections/StoryMap.jsx";
import StoryNow from "./sections/StoryNow.jsx";
import StoryPace from "./sections/StoryPace.jsx";
import StoryStages from "./sections/StoryStages.jsx";
import StoryTerrain from "./sections/StoryTerrain.jsx";

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
  const { theme, toggleTheme } = useStore(
    useShallow((state) => ({
      theme: state.app.theme,
      toggleTheme: state.toggleTheme,
    })),
  );

  const contour = useMemo(() => buildContour(gpxData), [gpxData]);

  const marker =
    contour && projectedLocation?.index != null
      ? markerPosition(contour, projectedLocation.index)
      : null;

  return (
    <div className={className}>
      {/* why: the only theme control lives at the end of the story
          (StoryEnd) — with no persistent chrome, that leaves it a very
          long scroll away for a runner who wants to check readability
          in bright sun. A small fixed corner control fixes that without
          competing with the editorial reading experience. */}
      <button
        type="button"
        className="theme-toggle"
        onClick={toggleTheme}
        aria-label={
          theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
        }
      >
        {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      </button>

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
        <StoryHero />
        <StoryMap />
        <StoryNow />
        <StoryClimbs />
        <StoryTerrain />
        <StoryPace />
        <StoryStages />
        <StoryCheckpoints />
        <StoryEnd />
      </div>
    </div>
  );
});

const StyledStory = style(Story);

export default StyledStory;
