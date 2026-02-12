import Marker from "../marker/Marker.jsx";

export default function Checkpoints({ checkpointsPoints3D }) {
  return checkpointsPoints3D?.map((checkpoint, idx) => {
    return (
      <Marker
        key={checkpoint.name || idx}
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
