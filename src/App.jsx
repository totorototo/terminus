import { lazy, Suspense } from "react";

import { Route, Switch } from "wouter";

import LandscapeOverlay from "./components/landscapeOverlay/LandscapeOverlay.jsx";
import Wizard from "./components/wizard/Wizard.jsx";
import { useRouteSync } from "./hooks/useRouteSync.js";

import style from "./App.style.js";

const FollowerScreen = lazy(
  () => import("./components/followerScreen/FollowerScreen.jsx"),
);
const Help = lazy(() => import("./components/help/Help.jsx"));
const TrailerScreen = lazy(
  () => import("./components/trailerScreen/TrailerScreen.jsx"),
);

function App({ className }) {
  useRouteSync();

  return (
    <div className={className}>
      <LandscapeOverlay />
      <Suspense fallback={null}>
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
      </Suspense>
    </div>
  );
}

export default style(App);
