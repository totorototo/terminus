import { useEffect } from "react";
import style from "./App.style.js";
import { Switch, Route, useLocation } from "wouter";
import Follower from "./components/follower/Follower.jsx";
import Trailer from "./components/trailer/Trailer.jsx";
import useStore from "./store/store.js";

function App({ className }) {
  const [, navigate] = useLocation();
  const pendingUrl = useStore((state) => state.app.pendingUrl);
  const setPendingUrl = useStore((state) => state.setPendingUrl);

  // Safari → PWA handoff: save current URL to the persisted store
  useEffect(() => {
    if (!window.navigator.standalone) {
      const url = window.location.pathname + window.location.search;
      setPendingUrl(url);
    }
  }, [setPendingUrl]);

  // PWA launch: restore the URL saved from Safari (fires after store rehydrates)
  useEffect(() => {
    if (window.navigator.standalone && pendingUrl) {
      setPendingUrl(null);
      navigate(pendingUrl);
    }
  }, [pendingUrl, navigate, setPendingUrl]);

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
