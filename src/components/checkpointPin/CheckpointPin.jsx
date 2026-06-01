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

const MIN_TRAIL_GAP = 1.6;
const LEVEL_HEIGHT = 0.18;
const BASE_OFFSET = 0.28;

function computeLabelLevels(checkpoints) {
  const ordered = checkpoints
    .map((checkpoint, index) => ({
      index,
      z: checkpoint.point3D[2],
      y: checkpoint.point3D[1],
    }))
    .sort((a, b) => a.z - b.z);

  const placed = [];
  const levelByIndex = new Map();

  for (const { index, z, y } of ordered) {
    const neighbors = placed.filter((p) => Math.abs(p.z - z) < MIN_TRAIL_GAP);

    let level = 0;
    let labelY = y + BASE_OFFSET;
    while (neighbors.some((p) => Math.abs(p.labelY - labelY) < LEVEL_HEIGHT)) {
      level += 1;
      labelY = y + BASE_OFFSET + level * LEVEL_HEIGHT;
    }

    placed.push({ z, labelY });
    levelByIndex.set(index, level);
  }

  return levelByIndex;
}

const CheckpointPin = memo(function CheckpointPin({ checkpoint, level = 0 }) {
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
        checkpoint.point3D[1] + BASE_OFFSET + level * LEVEL_HEIGHT,
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
  const levelByIndex = useMemo(
    () => computeLabelLevels(checkpointsPoints3D ?? []),
    [checkpointsPoints3D],
  );

  return checkpointsPoints3D?.map((checkpoint, index) => (
    <CheckpointPin
      key={checkpoint.name ?? checkpoint.index}
      checkpoint={checkpoint}
      level={levelByIndex.get(index) ?? 0}
    />
  ));
}

export default memo(CheckpointPins);
