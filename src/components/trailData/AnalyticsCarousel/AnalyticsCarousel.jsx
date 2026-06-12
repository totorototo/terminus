import { useMemo } from "react";

import { useProjectedLocation } from "../../../store/store.js";
import Carousel from "../../carousel/Carousel.jsx";
import AnalyticsPanel from "../AnalyticsPanel/AnalyticsPanel.jsx";

export default function AnalyticsCarousel({ items, label }) {
  const projectedLocation = useProjectedLocation();

  const currentIndex = useMemo(() => {
    if (!items?.length) return 0;
    const idx = projectedLocation?.index || 0;
    const found = items.findIndex(
      (s) => idx >= s.startIndex && idx < s.endIndex,
    );
    if (found !== -1) return found;
    const upcoming = items.findIndex((s) => idx < s.endIndex);
    return upcoming !== -1 ? upcoming : items.length - 1;
  }, [items, projectedLocation?.index]);

  if (!items?.length) return null;

  return (
    <Carousel
      direction="vertical"
      showNav={false}
      initialIndex={currentIndex}
      ariaLabel={`${label} analytics`}
    >
      {items.map((item, index) => (
        <AnalyticsPanel
          key={index}
          item={item}
          label={`${label} ${index + 1} / ${items.length}`}
          isCurrent={index === currentIndex}
        />
      ))}
    </Carousel>
  );
}
