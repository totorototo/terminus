import { memo } from "react";

import ElevationProfile from "../../trailData/ElevationProfile/ElevationProfile.jsx";
import StorySection from "../StorySection.jsx";

import style from "./StoryTerrain.style.js";

const StoryTerrain = memo(function StoryTerrain({ className }) {
  return (
    <div className={className}>
      <StorySection eyebrow="The profile" title="Terrain">
        <p className="lede">Every rise and drop between here and the end.</p>
        <div className="chart-frame">
          <ElevationProfile />
        </div>
      </StorySection>
    </div>
  );
});

const StyledStoryTerrain = style(StoryTerrain);

export default StyledStoryTerrain;
