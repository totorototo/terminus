import { Route, Switch } from "wouter";

import Follower from "./components/follower/Follower.jsx";
import Help from "./components/help/Help.jsx";
import LandscapeOverlay from "./components/landscapeOverlay/LandscapeOverlay.jsx";
import Trailer from "./components/trailer/Trailer.jsx";
import Wizard from "./components/wizard/Wizard.jsx";

import { useRouteSync } from "./hooks/useRouteSync.js";
import style from "./App.style.js";

function App({ className }) {
  useRouteSync();

  return (
    <div className={className}>
      <LandscapeOverlay />
      <Switch>
        <Route path="/follow/:raceId/:roomId">
          <Follower />
        </Route>
        <Route path="/run/:raceId">
          <Trailer />
        </Route>
        <Route path="/help">
          <Help />
        </Route>
        <Route>
          <Wizard />
        </Route>
      </Switch>
    </div>
  );
}

export default style(App);
