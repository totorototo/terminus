import Marker from "../marker/Marker.jsx";

export default function Checkpoints({ checkpointsPoints3D }) {
  return checkpointsPoints3D?.map((checkpoint, idx) => {
    // Prefer stable IDs; fallback to name, then index (use index only if unavoidable)
    const stableKey = checkpoint.id || checkpoint.name || idx;

    // Warn if using index as key, which can cause issues if list reorders
    if (idx === stableKey && process.env.NODE_ENV === "development") {
      console.warn(
        "Checkpoint missing stable ID and name; using index as key. This may cause issues if list reorders.",
        checkpoint,
      );
    }

    return (
      <Marker
        key={stableKey}
        position={[
          checkpoint.point3D[0],
          checkpoint.point3D[1] + 0.2,
          checkpoint.point3D[2],
        ]}
      >
        {`${checkpoint.name}`}
      </Marker>
    );
  });
}
