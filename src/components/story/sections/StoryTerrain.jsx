import { memo } from "react";

import ElevationProfile from "../../trailData/ElevationProfile/ElevationProfile.jsx";
import SlopeIntensity from "../../trailData/SlopeIntensity/SlopeIntensity.jsx";
import SlopeProfile from "../../trailData/SlopeProfile/SlopeProfile.jsx";
import StorySection from "../StorySection.jsx";

import style from "./StoryTerrain.style.js";

const StoryTerrain = memo(function StoryTerrain({ className }) {
  return (
    <div className={className}>
      <StorySection eyebrow="The profile" title="Terrain">
        <p className="lede">Every rise and drop between here and the end.</p>
        <div className="chart-frame">
          <span className="frame-label">Profile</span>
          <ElevationProfile />
        </div>
        <div className="chart-frame stacked-frame">
          <span className="frame-label">Slope</span>
          <SlopeIntensity />
        </div>
        <div className="chart-frame stacked-frame">
          <span className="frame-label">Effort intensity</span>
          <SlopeProfile />
        </div>
      </StorySection>
    </div>
  );
});

const StyledStoryTerrain = style(StoryTerrain);

export default StyledStoryTerrain;
