import useStore from "../../../store/store.js";
import AnalyticsCarousel from "../AnalyticsCarousel/AnalyticsCarousel.jsx";

export default function StageAnalytics() {
  const stages = useStore((state) => state.stages);
  return <AnalyticsCarousel items={stages} label="Stage" />;
}
