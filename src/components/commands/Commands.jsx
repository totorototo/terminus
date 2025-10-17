import { MapPin } from "@styled-icons/feather/MapPin";
import { Film } from "@styled-icons/feather/Film";
import { BarChart2 } from "@styled-icons/feather/BarChart2";
import useStore from "../../store/store";
import style from "./Commands.style";

function Commands({ className }) {
  const trackingMode = useStore((state) => state.app.trackingMode);
  const toggleTrackingMode = useStore((state) => state.toggleTrackingMode);
  const displaySlopes = useStore((state) => state.app.displaySlopes);
  const toggleSlopesMode = useStore((state) => state.toggleSlopesMode);
  const findClosestLocation = useStore((state) => state.findClosestLocation);

  return (
    <div className={className}>
      <button className={"off"} onClick={findClosestLocation}>
        <MapPin size={24} />
      </button>
      <button
        className={displaySlopes ? "on" : "off"}
        onClick={toggleSlopesMode}
      >
        <BarChart2 size={24} />
      </button>
      <button
        className={trackingMode ? "on" : "off"}
        onClick={toggleTrackingMode}
      >
        <Film size={24} />
      </button>
    </div>
  );
}

export default style(Commands);
