import { useEffect, useState } from "react";

import {
  Activity,
  ArrowRight,
  Eye,
  HelpCircle,
  Map,
} from "@styled-icons/feather";
import { useLocation } from "wouter";

import { track } from "../../lib/analytics.js";

import style from "./Wizard.style.js";

function Wizard({ className }) {
  const [step, setStep] = useState(1);
  const [code, setCode] = useState("");
  const [races, setRaces] = useState([]);
  const [racesError, setRacesError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [followerRaceId, setFollowerRaceId] = useState(null);
  const [, navigate] = useLocation();

  useEffect(() => {
    fetch("/races.json")
      .then((r) => r.json())
      .then(setRaces)
      .catch(() => setRacesError(true));
  }, [retryCount]);

  const retryIfNeeded = () => {
    if (racesError) {
      setRacesError(false);
      setRaces([]);
      setRetryCount((c) => c + 1);
    }
  };

  // Runner flow
  const handleRunnerNext = () => {
    track("role-selected", { role: "runner" });
    retryIfNeeded();
    setStep(2);
  };
  const handleRunnerRacePick = (raceId) => {
    track("race-selected", { role: "runner", raceId });
    navigate(`/run/${raceId}`);
  };

  // Follower flow
  const handleFollowerNext = () => {
    track("role-selected", { role: "follower" });
    retryIfNeeded();
    setStep(3);
  };
  const handleFollowerRacePick = (raceId) => {
    track("race-selected", { role: "follower", raceId });
    setFollowerRaceId(raceId);
    setStep(4);
  };

  const handleConfirm = () => {
    const trimmed = code.trim().toUpperCase();
    if (!followerRaceId || trimmed.length < 6) return;
    track("follower-join");
    navigate(`/follow/${followerRaceId}/${trimmed}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleConfirm();
  };

  // step → { current, total } for progress dots (step 1 has no indicator)
  const PROGRESS = {
    2: { current: 2, total: 2 },
    3: { current: 2, total: 3 },
    4: { current: 3, total: 3 },
  };
  const progress = PROGRESS[step] ?? null;

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
        {progress && (
          <div
            className="progress-dots"
            aria-label={`Step ${progress.current} of ${progress.total}`}
          >
            {Array.from({ length: progress.total }, (_, i) => (
              <span
                key={i}
                className={`progress-dot${i < progress.current ? " filled" : ""}`}
              />
            ))}
          </div>
        )}
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
      <footer className="footer" aria-hidden="true">
        © 2026 Terminus — La Vallée
      </footer>
    </div>
  );
}

export default style(Wizard);
