import { useSpring as useSpringWeb, animated } from "@react-spring/web";
import style from "./SectionData.style.js";
import useStore from "../../store/store.js";
import { useMemo } from "react";

const SectionData = function SectionData({ className }) {
  const currentPositionIndex = useStore((state) => state.currentPositionIndex);
  const sections = useStore((state) => state.sections);

  // Memoize section for SectionData
  const section = useMemo(() => {
    if (sections && sections.length && currentPositionIndex !== null) {
      return sections.find(
        (section) =>
          currentPositionIndex >= section.startIndex &&
          currentPositionIndex <= section.endIndex,
      );
    }
    return undefined;
  }, [sections, currentPositionIndex]);

  const { opacity } = useSpringWeb({
    opacity: section ? 1 : 0,
    config: { tension: 170, friction: 26 },
  });

  const { distance } = useSpringWeb({
    distance: section?.totalDistance || 0,
    config: { tension: 170, friction: 26 },
  });

  const { elevationGain } = useSpringWeb({
    elevationGain: section?.totalElevation || 0,
    config: { tension: 170, friction: 26 },
  });

  const { elevationLoss } = useSpringWeb({
    elevationLoss: section?.totalElevationLoss || 0,
    config: { tension: 170, friction: 26 },
  });

  return (
    <div className={className}>
      <h1>Section Analytics</h1>
      {section && (
        <>
          <animated.div style={{ opacity }}>
            {section.startLocation && section.endLocation
              ? `From: ${section.startLocation} → To: ${section.endLocation}`
              : "Location data not available"}
          </animated.div>

          <animated.div>
            {distance.to((n) => `Distance: ${(n / 1000).toFixed(2)} km`)}
          </animated.div>
          <animated.div>
            {elevationGain.to((n) => `Elevation Gain: ${n.toFixed(0)} m`)}
          </animated.div>
          <animated.div>
            {elevationLoss.to((n) => `Elevation Loss: ${n.toFixed(0)} m`)}
          </animated.div>
          <animated.div
            style={{
              marginTop: "1em",
              fontSize: "0.8em",
              color: "#707070",
              opacity,
            }}
          ></animated.div>
        </>
      )}
    </div>
  );
};

export default style(SectionData);
