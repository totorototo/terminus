import { useState } from "react";

import { Activity, ArrowRight, Eye } from "@styled-icons/feather";
import { useLocation } from "wouter";

import style from "./Wizard.style.js";

function Wizard({ className }) {
  const [step, setStep] = useState(1);
  const [code, setCode] = useState("");
  const [, navigate] = useLocation();

  const handleRunner = () => {
    navigate("/run");
  };

  const handleFollowerNext = () => {
    setStep(2);
  };

  const handleConfirm = () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 6) return;
    navigate(`/follow/${trimmed}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleConfirm();
  };

  return (
    <div className={className}>
      <div className="card">
        {step === 1 && (
          <div className="step">
            <h1 className="title">Terminus</h1>
            <p className="subtitle">What are you doing today?</p>
            <div className="choices">
              <button className="choice-btn primary" onClick={handleRunner}>
                <Activity size={18} strokeWidth={2} />
                <span className="choice-label">I&apos;m running</span>
              </button>
              <button className="choice-btn" onClick={handleFollowerNext}>
                <Eye size={18} strokeWidth={2} />
                <span className="choice-label">I&apos;m following</span>
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="step">
            <button className="back-btn" onClick={() => setStep(1)}>
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
