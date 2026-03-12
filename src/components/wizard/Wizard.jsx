import { useEffect, useState } from "react";

import {
  Activity,
  ArrowRight,
  Eye,
  HelpCircle,
  Map,
} from "@styled-icons/feather";
import { useLocation } from "wouter";

import style from "./Wizard.style.js";

function Wizard({ className }) {
  const [step, setStep] = useState(1);
  const [code, setCode] = useState("");
  const [races, setRaces] = useState([]);
  const [racesError, setRacesError] = useState(false);
  const [followerRaceId, setFollowerRaceId] = useState(null);
  const [, navigate] = useLocation();

  useEffect(() => {
    fetch("/races.json")
      .then((r) => r.json())
      .then(setRaces)
      .catch(() => setRacesError(true));
  }, []);

  // Runner flow
  const handleRunnerNext = () => setStep(2);
  const handleRunnerRacePick = (raceId) => navigate(`/run/${raceId}`);

  // Follower flow
  const handleFollowerNext = () => setStep(3);
  const handleFollowerRacePick = (raceId) => {
    setFollowerRaceId(raceId);
    setStep(4);
  };

  const handleConfirm = () => {
    const trimmed = code.trim().toUpperCase();
    if (!followerRaceId || trimmed.length < 6) return;
    navigate(`/follow/${followerRaceId}/${trimmed}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleConfirm();
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
          <p className="subtitle">Could not load races. Please try again.</p>
        )}
      </div>
    </>
  );

  return (
    <div className={className}>
      <div className="card">
        {step === 1 && (
          <div className="step">
            <h1 className="title">Terminus</h1>
            <p className="subtitle">What are you doing today?</p>
            <div className="choices">
              <button className="choice-btn primary" onClick={handleRunnerNext}>
                <Activity size={18} strokeWidth={2} />
                <span className="choice-label">I&apos;m running</span>
              </button>
              <button className="choice-btn" onClick={handleFollowerNext}>
                <Eye size={18} strokeWidth={2} />
                <span className="choice-label">I&apos;m following</span>
              </button>
            </div>
            <button className="help-link" onClick={() => navigate("/help")}>
              <HelpCircle size={13} strokeWidth={2} />
              Need some help?
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="step">
            <button className="back-btn" onClick={() => setStep(1)}>
              ← Back
            </button>
            <h1 className="title">Pick a race</h1>
            {raceList(
              handleRunnerRacePick,
              "Which race are you running today?",
            )}
          </div>
        )}

        {step === 3 && (
          <div className="step">
            <button className="back-btn" onClick={() => setStep(1)}>
              ← Back
            </button>
            <h1 className="title">Pick a race</h1>
            {raceList(handleFollowerRacePick, "Which race are you watching?")}
          </div>
        )}

        {step === 4 && (
          <div className="step">
            <button className="back-btn" onClick={() => setStep(3)}>
              ← Back
            </button>
            <h1 className="title">Enter Code</h1>
            <p className="subtitle">Ask the runner for their room code.</p>
            <input
              className="code-input"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              placeholder="A3K7X2"
              maxLength={8}
              autoFocus
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              className="confirm-btn"
              onClick={handleConfirm}
              disabled={code.trim().length < 6}
            >
              <span>Follow</span>
              <ArrowRight size={16} strokeWidth={2.5} />
            </button>
          </div>
        )}
      </div>
      <footer className="footer">© 2026 Terminus — La Vallée</footer>
    </div>
  );
}

export default style(Wizard);
