import { MapPin } from "@styled-icons/feather/MapPin";
import { Film } from "@styled-icons/feather/Film";
import { BarChart2 } from "@styled-icons/feather/BarChart2";
import { Map } from "@styled-icons/feather/Map";
// import { Upload } from "@styled-icons/feather/upload";
import { useShallow } from "zustand/react/shallow";
import useStore from "../../store/store";
import style from "./Commands.style";
// import { useCallback } from "react";

function Commands({ className }) {
  // Use useShallow to batch related app state and actions into single subscription
  const {
    trackingMode,
    profileMode,
    displaySlopes,
    toggleTrackingMode,
    toggleProfileMode,
    toggleSlopesMode,
  } = useStore(
    useShallow((state) => ({
      trackingMode: state.app.trackingMode,
      profileMode: state.app.profileMode,
      displaySlopes: state.app.displaySlopes,
      toggleTrackingMode: state.toggleTrackingMode,
      toggleProfileMode: state.toggleProfileMode,
      toggleSlopesMode: state.toggleSlopesMode,
    })),
  );

  // These are top-level actions, select directly
  const findClosestLocation = useStore((state) => state.findClosestLocation);
  const spotMe = useStore((state) => state.spotMe);
  //const processGPXFile = useStore((state) => state.processGPXFile);

  // const onChange = useCallback(
  //   async (evt) => {
  //     const [file] = evt.target.files;
  //     if (file) {
  //       const buffer = await file.arrayBuffer();
  //       await processGPXFile(buffer);
  //     }
  //   },
  //   [processGPXFile],
  // );

  return (
    <div className={className}>
      {/* <label className="off file-upload-button">
        <Upload size={24} />
        <input
          type="file"
          accept=".gpx"
          onChange={onChange}
          style={{ display: "none" }}
        />
      </label> */}
      <button
        className={"off"}
        onClick={spotMe}
        aria-label="Find my current location"
      >
        <MapPin size={24} />
      </button>
      <button
        className={displaySlopes ? "on" : "off"}
        onClick={toggleSlopesMode}
        aria-label="Toggle slope colors"
        aria-pressed={displaySlopes}
      >
        <BarChart2 size={24} />
      </button>
      <button
        className={!profileMode ? "on" : "off"}
        onClick={toggleProfileMode}
        aria-label="Toggle 2D profile view"
        aria-pressed={profileMode}
      >
        <Map size={24} />
      </button>
      <button
        className={trackingMode ? "on" : "off"}
        onClick={toggleTrackingMode}
        aria-label="Toggle animation mode"
        aria-pressed={trackingMode}
      >
        <Film size={24} />
      </button>
    </div>
  );
}

export default style(Commands);
