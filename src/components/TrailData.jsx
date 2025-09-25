import React from "react";
import { useSpring as useSpringWeb, animated } from "@react-spring/web";

export default function TrailData({ gpsResults }) {
  const { distance } = useSpringWeb({
    distance: gpsResults?.totalDistance || 0,
    config: { tension: 170, friction: 26 },
  });

  const { elevationGain } = useSpringWeb({
    elevationGain: gpsResults?.totalElevation || 0,
    config: { tension: 170, friction: 26 },
  });

  const { elevationLoss } = useSpringWeb({
    elevationLoss: gpsResults?.totalElevationLoss || 0,
    config: { tension: 170, friction: 26 },
  });

  const { pointCount } = useSpringWeb({
    pointCount: gpsResults?.pointCount || 0,
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
        Trail Analytics
      </h1>
      <animated.div>
        {distance.to((n) => `Distance: ${(n / 1000).toFixed(2)} km`)}
      </animated.div>
      <animated.div>
        {elevationGain.to((n) => `Elevation: ${n.toFixed(0)} m`)}
      </animated.div>
      <animated.div>
        {elevationLoss.to((n) => `Elevation Loss: ${n.toFixed(0)} m`)}
      </animated.div>
      <animated.div>
        {pointCount.to((n) => `Points: ${n.toLocaleString()}`)}
      </animated.div>
    </div>
  );
}
