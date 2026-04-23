import { memo, useMemo } from "react";

import { Html } from "@react-three/drei";
import { CheckCircle } from "@styled-icons/feather/CheckCircle";
import { Clock } from "@styled-icons/feather/Clock";
import { Flag } from "@styled-icons/feather/Flag";
import { Home } from "@styled-icons/feather/Home";
import { MapPin } from "@styled-icons/feather/MapPin";
import { Navigation } from "@styled-icons/feather/Navigation";
import { rgba } from "polished";
import { useTheme } from "styled-components";

const TYPE_ICONS = {
  LifeBase: Home,
  TimeBarrier: Clock,
  Start: Navigation,
  Arrival: Flag,
  Checkpoint: CheckCircle,
};

const CheckpointPin = memo(function CheckpointPin({ checkpoint }) {
  const theme = useTheme();
  const palette = theme.colors[theme.currentVariant];
  const color = palette["--color-text"];
  const surface = palette["--color-surface"];

  const styles = useMemo(
    () => ({
      pin: {
        display: "flex",
        alignItems: "center",
        gap: "5px",
        padding: "3px 8px",
        borderRadius: "4px",
        background: rgba(surface, 0.8),
        backdropFilter: "blur(8px)",
        border: `1px solid ${rgba(color, 0.15)}`,
        whiteSpace: "nowrap",
        pointerEvents: "none",
        fontFamily: "'Inter', 'Roboto', 'Helvetica', sans-serif",
      },
      name: {
        fontSize: "10px",
        fontWeight: 500,
        color,
      },
    }),
    [color, surface],
  );

  const TypeIcon = TYPE_ICONS[checkpoint.wptType] ?? MapPin;

  return (
    <Html
      position={[
        checkpoint.point3D[0],
        checkpoint.point3D[1] + 0.28,
        checkpoint.point3D[2],
      ]}
      center
      distanceFactor={8}
      occlude
    >
      <div style={styles.pin}>
        <TypeIcon size={12} color={color} />
        <span style={styles.name}>{checkpoint.name}</span>
      </div>
    </Html>
  );
});

function CheckpointPins({ checkpointsPoints3D }) {
  return checkpointsPoints3D?.map((checkpoint) => (
    <CheckpointPin
      key={checkpoint.name ?? checkpoint.index}
      checkpoint={checkpoint}
    />
  ));
}

export default memo(CheckpointPins);
