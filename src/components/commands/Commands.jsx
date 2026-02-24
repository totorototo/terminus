import { MapPin } from "@styled-icons/feather/MapPin";
import { BarChart2 } from "@styled-icons/feather/BarChart2";
import { Map } from "@styled-icons/feather/Map";
import { Share2 } from "@styled-icons/feather/Share2";
import { useShallow } from "zustand/react/shallow";
import useStore from "../../store/store";
import style from "./Commands.style";

function Commands({ className }) {
  // Use useShallow to batch related app state and actions into single subscription
  const {
    profileMode,
    displaySlopes,
    liveSessionId,
    toggleProfileMode,
    toggleSlopesMode,
    shareLocation,
  } = useStore(
    useShallow((state) => ({
      profileMode: state.app.profileMode,
      displaySlopes: state.app.displaySlopes,
      liveSessionId: state.app.liveSessionId,
      toggleProfileMode: state.toggleProfileMode,
      toggleSlopesMode: state.toggleSlopesMode,
      shareLocation: state.shareLocation,
    })),
  );

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
        className={"off"}
        onClick={shareLocation}
        aria-label="Share my room code"
      >
        <Share2 size={24} />
      </button>
    </div>
  );
}

export default style(Commands);
