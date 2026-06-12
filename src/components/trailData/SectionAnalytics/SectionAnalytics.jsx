import useStore from "../../../store/store.js";
import AnalyticsCarousel from "../AnalyticsCarousel/AnalyticsCarousel.jsx";

export default function SectionAnalytics() {
  const sections = useStore((state) => state.sections);
  return <AnalyticsCarousel items={sections} label="Section" />;
}
