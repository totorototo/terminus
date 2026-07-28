import { useEffect, useState } from "react";

import { HelpCircle } from "@styled-icons/feather/HelpCircle";
import { Map } from "@styled-icons/feather/Map";
import { useLocation } from "wouter";

import { track } from "../../lib/analytics.js";

import style from "./Wizard.style.js";

function Wizard({ className }) {
  const [races, setRaces] = useState([]);
  const [racesError, setRacesError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [, navigate] = useLocation();

  useEffect(() => {
    fetch("/races.json")
      .then((r) => r.json())
      .then(setRaces)
      .catch(() => setRacesError(true));
  }, [retryCount]);

  const handleRacePick = (raceId) => {
    track("race-selected", { raceId });
    navigate(`/run/${raceId}`);
  };

  const raceList = (onPick, subtitle) => (
    <>
      <p className="subtitle">{subtitle}</p>
      <div className="choices">
        {races.map((race) => (
          <button
            key={race.id}
            className="choice-btn primary"
            onClick={() => onPick(race.id)}
          >
            <Map size={18} strokeWidth={2} />
            <span className="choice-label">{race.name}</span>
          </button>
        ))}
        {!racesError && races.length === 0 && (
          <p className="subtitle">Loading races…</p>
        )}
        {racesError && (
          <div className="error-state">
            <p className="subtitle">Could not load races.</p>
            <button
              className="retry-btn"
              onClick={() => {
                setRacesError(false);
                setRaces([]);
                setRetryCount((c) => c + 1);
              }}
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className={className}>
      <div className="card">
        <div className="step">
          <h1 className="title">Terminus</h1>
          {raceList(handleRacePick, "Which trail do you want to read?")}
          <button className="help-link" onClick={() => navigate("/help")}>
            <HelpCircle size={13} strokeWidth={2} />
            Need some help?
          </button>
        </div>
      </div>
      <footer className="footer">© 2026 Terminus — La Vallée</footer>
    </div>
  );
}

const StyledWizard = style(Wizard);

export default StyledWizard;
