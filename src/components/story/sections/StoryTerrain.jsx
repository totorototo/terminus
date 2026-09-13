import { memo } from "react";

import ElevationProfile from "../../trailData/ElevationProfile/ElevationProfile.jsx";
import RouteStats from "../../trailData/RouteStats/RouteStats.jsx";
import RunnabilityBreakdown from "../../trailData/RunnabilityBreakdown/RunnabilityBreakdown.jsx";
import RunnabilityIndex from "../../trailData/RunnabilityIndex/RunnabilityIndex.jsx";
import SlopeIntensity from "../../trailData/SlopeIntensity/SlopeIntensity.jsx";
import SlopeProfile from "../../trailData/SlopeProfile/SlopeProfile.jsx";
import UphillGradientBreakdown from "../../trailData/UphillGradientBreakdown/UphillGradientBreakdown.jsx";
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
          <UphillGradientBreakdown />
        </div>
        <div className="chart-frame stacked-frame">
          <span className="frame-label">Runnability</span>
          <RunnabilityIndex />
          <RunnabilityBreakdown />
        </div>
        <div className="chart-frame stacked-frame">
          <span className="frame-label">Effort intensity</span>
          <SlopeProfile />
        </div>
        <div className="chart-frame stacked-frame">
          <span className="frame-label">Route stats</span>
          <RouteStats />
        </div>
      </StorySection>
    </div>
  );
});

const StyledStoryTerrain = style(StoryTerrain);

export default StyledStoryTerrain;
