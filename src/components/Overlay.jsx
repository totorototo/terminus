import { useSpring as useSpringWeb, animated } from "@react-spring/web";

function Overlay({ section }) {
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
    <div
      style={{
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "flex-start",
        position: "absolute",
        pointerEvents: "none",
        top: 0,
        maxWidth: "600px",
        padding: "80px",
        color: "#a0a0a0",
        lineHeight: 1.2,
        fontSize: "15px",
        letterSpacing: "1.5px",
        userSelect: "none",
      }}
    >
      <h1
        style={{
          pointerEvents: "none",
          color: "white",
          fontSize: "2em",
          fontWeight: "100",
          lineHeight: "1em",
          margin: 0,
          marginBottom: "0.25em",
        }}
      >
        Section Analytics
      </h1>
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
          >
            Click on another section to see its details.
          </animated.div>
        </>
      )}
    </div>
  );
}

export default Overlay;
