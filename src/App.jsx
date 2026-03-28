import { Route, Switch } from "wouter";

import FollowerScreen from "./components/followerScreen/FollowerScreen.jsx";
import Help from "./components/help/Help.jsx";
import InstallPromptOverlay from "./components/installPromptOverlay/InstallPromptOverlay.jsx";
import LandscapeOverlay from "./components/landscapeOverlay/LandscapeOverlay.jsx";
import TrailerScreen from "./components/trailerScreen/TrailerScreen.jsx";
import Wizard from "./components/wizard/Wizard.jsx";
import { useRouteSync } from "./hooks/useRouteSync.js";

import style from "./App.style.js";

function App({ className }) {
  useRouteSync();

  return (
    <div className={className}>
      <LandscapeOverlay />
      <InstallPromptOverlay />
      <Switch>
        <Route path="/follow/:raceId/:roomId">
          <FollowerScreen />
        </Route>
        <Route path="/run/:raceId">
          <TrailerScreen />
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
