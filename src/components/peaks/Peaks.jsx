import { useMemo } from "react";
import { transformCoordinate } from "../../utils/coordinateTransforms";
import useStore from "../../store/store.js";
import { Billboard, Text } from "@react-three/drei";
import { useTheme } from "styled-components";
import FadingText from "./FadingText.jsx";

function Peaks({ coordinateScales, profileMode }) {
  const data = useStore((state) => state.gpx.data);
  const peaks = useStore((state) => state.gpx.peaks);
  const theme = useTheme();

  const { peakPoints3D } = useMemo(() => {
    if (!data || data.length === 0 || !peaks || peaks.length === 0) {
      return { peakPoints3D: [] };
    }

    // get gps points corresponding to peaks
    const peakPoints = peaks.map((peakIndex) => data[peakIndex]);

    // transform to 3D coordinates (pass peakIndex for profile mode)
    const peakPoints3D = peakPoints.map((point, idx) =>
      transformCoordinate(point, coordinateScales, peaks[idx]),
    );

    return { peakPoints3D };
  }, [data, peaks, coordinateScales]);

  return peakPoints3D?.map((point, idx) => (
    <Billboard key={idx} position={point}>
      <FadingText
        position={[0, 0.03, 0]}
        fontSize={0.02}
        color={theme.colors.dark["--color-text"]}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.001}
        outlineColor={theme.colors.dark["--color-background"]}
        fadeDistance={5}
        fadeStrength={1}
        fadeFrom={1} // fade relative to camera
      >
        {Math.round(data[peaks[idx]][2])}
      </FadingText>
    </Billboard>
  ));
}

export default Peaks;
