import Follower from "./components/follower/Follower.jsx";
import Trailer from "./components/trailer/Trailer.jsx";
import Wizard from "./components/wizard/Wizard.jsx";
import useStore from "./store/store.js";

import style from "./App.style.js";

function App({ className }) {
  const mode = useStore((state) => state.app.mode);

  return (
    <div className={className}>
      {!mode && <Wizard />}
      {mode === "follower" && <Follower />}
      {mode === "trailer" && <Trailer />}
    </div>
  );
}

export default style(App);
