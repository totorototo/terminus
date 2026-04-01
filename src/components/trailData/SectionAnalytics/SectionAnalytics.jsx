import useStore from "../../../store/store.js";
import AnalyticsPanel from "../AnalyticsPanel/AnalyticsPanel.jsx";

export default function SectionAnalytics() {
  const sections = useStore((state) => state.sections);
  return <AnalyticsPanel items={sections} label="Section" />;
}
