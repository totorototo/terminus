import { memo } from "react";

import SectionAnalytics from "../trailData/SectionAnalytics/SectionAnalytics.jsx";
import StageAnalytics from "../trailData/StageAnalytics/StageAnalytics.jsx";
import StageETA from "../trailData/StageETA/StageETA.jsx";
import TrailOverview from "../trailData/TrailOverview/TrailOverview.jsx";
import TrailProgression from "../trailData/TrailProgression/TrailProgression.jsx";

import style from "./DesktopLayout.style.js";

const DesktopLayout = memo(function DesktopLayout({ className }) {
  return (
    <aside className={className}>
      <div className="panel panel-left">
        <div className="tile">
          <TrailOverview />
        </div>
        <div className="tile">
          <TrailProgression />
        </div>

        <div className="tile">
          <StageAnalytics />
        </div>
        <div className="tile">
          <SectionAnalytics />
        </div>
      </div>
      <div className="panel panel-bottom">
        <div className="tile tile-scrollable">
          <StageETA />
        </div>
      </div>
    </aside>
  );
});

export default style(DesktopLayout);
