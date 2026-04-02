import { Helmet } from "react-helmet";
import { Route, Switch, useLocation } from "wouter";

import FollowerScreen from "./components/followerScreen/FollowerScreen.jsx";
import Help from "./components/help/Help.jsx";
import InstallPromptOverlay from "./components/installPromptOverlay/InstallPromptOverlay.jsx";
import LandscapeOverlay from "./components/landscapeOverlay/LandscapeOverlay.jsx";
import TrailerScreen from "./components/trailerScreen/TrailerScreen.jsx";
import Wizard from "./components/wizard/Wizard.jsx";
import { usePageTracking } from "./hooks/usePageTracking.js";
import { useRouteSync } from "./hooks/useRouteSync.js";

import style from "./App.style.js";

function App({ className }) {
  usePageTracking();
  useRouteSync();

  const [path] = useLocation();

  return (
    <main className={className}>
      <Helmet>
        <link rel="canonical" href={`${window.location.origin}${path}`} />
      </Helmet>
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
    </main>
  );
}

export default style(App);
