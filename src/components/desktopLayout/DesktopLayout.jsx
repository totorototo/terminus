import { memo } from "react";

import PaceProfile from "../trailData/PaceProfile/PaceProfile.jsx";
import PeakSummary from "../trailData/PeakSummary/PeakSummary.jsx";
import SectionAnalytics from "../trailData/SectionAnalytics/SectionAnalytics.jsx";
import SectionETA from "../trailData/SectionETA/SectionETA.jsx";
import StageAnalytics from "../trailData/StageAnalytics/StageAnalytics.jsx";
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
          <PaceProfile />
        </div>
        <div className="tile">
          <StageAnalytics />
        </div>
        <div className="tile">
          <SectionAnalytics />
        </div>
      </div>
      <div className="panel panel-right">
        <div className="tile tile-scrollable">
          <SectionETA />
        </div>
        <div className="tile tile-scrollable">
          <PeakSummary />
        </div>
      </div>
    </aside>
  );
});

export default style(DesktopLayout);
