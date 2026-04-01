import useStore from "../../../store/store.js";
import AnalyticsPanel from "../AnalyticsPanel/AnalyticsPanel.jsx";

export default function StageAnalytics() {
  const stages = useStore((state) => state.stages);
  return <AnalyticsPanel items={stages} label="Stage" />;
}
