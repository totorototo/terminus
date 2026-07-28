import { lazy, memo } from "react";

import LazyPanel from "../../lazyPanel/LazyPanel.jsx";
import StorySection from "../StorySection.jsx";

import style from "./StoryMap.style.js";

// why: mapbox-gl (~452 KB) is the heaviest dependency in this page — keep its
// chunk out of the initial bundle and defer mounting until this section is
// about to scroll into view (LazyPanel), same as the old carousel did.
const TrailMap = lazy(() => import("../../trailData/Map/Map.jsx"));

const StoryMap = memo(function StoryMap({ className }) {
  return (
    <div className={className}>
      <StorySection eyebrow="The place" title="Where this happens">
        <p className="lede">The route, traced on the ground.</p>
        <div className="map-frame">
          <LazyPanel>
            <TrailMap />
          </LazyPanel>
        </div>
      </StorySection>
    </div>
  );
});

const StyledStoryMap = style(StoryMap);

export default StyledStoryMap;
