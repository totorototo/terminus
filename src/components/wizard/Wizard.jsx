import { useState } from "react";

import { animated, useTransition } from "@react-spring/web";
import { Activity, ArrowRight, Eye } from "@styled-icons/feather";

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

  const transitions = useTransition(step, {
    from: { opacity: 0, transform: "translateY(8px)" },
    enter: { opacity: 1, transform: "translateY(0px)" },
    leave: { opacity: 0, transform: "translateY(-6px)", pointerEvents: "none" },
    config: { tension: 300, friction: 26 },
  });

  return (
    <div className={className}>
      <div className="card">
        {transitions((animStyle, currentStep) =>
          currentStep === 1 ? (
            <animated.div className="step" style={animStyle}>
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
            </animated.div>
          ) : (
            <animated.div className="step" style={animStyle}>
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
            </animated.div>
          ),
        )}
      </div>
    </div>
  );
}

export default style(Wizard);
