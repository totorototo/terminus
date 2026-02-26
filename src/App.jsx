import { Route, Switch } from "wouter";

import Follower from "./components/follower/Follower.jsx";
import Trailer from "./components/trailer/Trailer.jsx";
import Wizard from "./components/wizard/Wizard.jsx";

import style from "./App.style.js";

function App({ className }) {
  return (
    <div className={className}>
      <Switch>
        <Route path="/follow/:roomId">
          <Follower />
        </Route>
        <Route path="/run">
          <Trailer />
        </Route>
        <Route>
          <Wizard />
        </Route>
      </Switch>
    </div>
  );
}

export default style(App);
