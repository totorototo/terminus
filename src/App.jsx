import style from "./App.style.js";
import { Switch, Route } from "wouter";
import Follower from "./components/follower/Follower.jsx";
import Trailer from "./components/trailer/Trailer.jsx";

function App({ className }) {
  return (
    <div className={className}>
      <Switch>
        <Route path="follower" component={Follower} />
        <Route component={Trailer} />
      </Switch>
    </div>
  );
}

export default style(App);
