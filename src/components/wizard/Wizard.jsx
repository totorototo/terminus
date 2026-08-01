import { useEffect, useState } from "react";

import { HelpCircle } from "@styled-icons/feather/HelpCircle";
import { useLocation } from "wouter";

import { track } from "../../lib/analytics.js";
import ThemeToggle from "../story/ThemeToggle.jsx";

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

  return (
    <>
      {/* why: rendered outside the masked, scrolling container below — see
          ThemeToggle's own why-comment for the fixed-positioning hazard
          that lives inside it. */}
      <ThemeToggle />
      <div className={className}>
        <div className="content">
          <span className="eyebrow">La Vallée · 2026</span>
          <h1 className="title">Terminus</h1>
          <p className="subtitle">Which race are you running today?</p>

          <div className="choices">
            {races.map((race, i) => (
              <button
                key={race.id}
                className="choice-btn"
                onClick={() => handleRacePick(race.id)}
              >
                <span className="choice-index">
                  {String(i + 1).padStart(2, "0")}
                </span>
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

          <button className="help-link" onClick={() => navigate("/help")}>
            <HelpCircle size={13} strokeWidth={2} />
            Need some help?
          </button>

          <footer className="footer">© 2026 Terminus — La Vallée</footer>
        </div>
      </div>
    </>
  );
}

const StyledWizard = style(Wizard);

export default StyledWizard;
