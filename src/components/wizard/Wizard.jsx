import { useState } from "react";

import useStore from "../../store/store.js";

import style from "./Wizard.style.js";

function Wizard({ className }) {
  const [step, setStep] = useState(1);
  const [code, setCode] = useState("");
  const setMode = useStore((state) => state.setMode);
  const setFollowerRoomId = useStore((state) => state.setFollowerRoomId);

  const handleRunner = () => {
    setMode("trailer");
  };

  const handleFollowerNext = () => {
    setStep(2);
  };

  const handleConfirm = () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 6) return;
    setFollowerRoomId(trimmed);
    setMode("follower");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleConfirm();
  };

  return (
    <div className={className}>
      <div className="card">
        {step === 1 && (
          <>
            <h1 className="title">Terminus</h1>
            <p className="subtitle">What are you doing today?</p>
            <div className="choices">
              <button className="choice-btn primary" onClick={handleRunner}>
                <span className="choice-label">I&apos;m running</span>
              </button>
              <button className="choice-btn" onClick={handleFollowerNext}>
                <span className="choice-label">I&apos;m following</span>
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <button className="back-btn" onClick={() => setStep(1)}>
              ← Back
            </button>
            <h1 className="title">Enter Room Code</h1>
            <p className="subtitle">
              Ask the runner to share their 6-character code with you.
            </p>
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
              Follow
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default style(Wizard);
