import { useRef, useState } from "react";

import { FolderPlus } from "@styled-icons/feather/FolderPlus";
import { HelpCircle } from "@styled-icons/feather/HelpCircle";
import { useLocation } from "wouter";

import { track } from "../../lib/analytics.js";
import { checkGpxFile, saveLocalGpx } from "../../lib/localGpx.js";
import useStore from "../../store/store.js";
import ThemeToggle from "../story/ThemeToggle.jsx";

import style from "./Wizard.style.js";

function Wizard({ className }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState(null);
  const flush = useStore((state) => state.flush);
  const forgetLiveSession = useStore((state) => state.forgetLiveSession);
  const setPlanFile = useStore((state) => state.setPlanFile);
  const [, navigate] = useLocation();

  const openFile = async (file) => {
    const problem = checkGpxFile(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setOpening(true);
    try {
      await saveLocalGpx({ name: file.name, bytes: await file.arrayBuffer() });
      // A new file is a new race: fixes saved against the previous route
      // would project onto the wrong trace, and its followers' room holds
      // the previous file.
      flush();
      forgetLiveSession();
      // A plan.json names its route: the previous race's is not this one's.
      setPlanFile?.(null);
      track("gpx-opened");
      navigate("/run");
    } catch {
      setError("Could not open this file on this device.");
      setOpening(false);
    }
  };

  const onDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    const [file] = event.dataTransfer.files;
    if (file) openFile(file);
  };

  return (
    <>
      {/* why: rendered outside the masked, scrolling container below — see
          ThemeToggle's own why-comment for the fixed-positioning hazard
          that lives inside it. */}
      <ThemeToggle />
      <div
        className={`${className ?? ""}${dragging ? " dragging" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          // dragleave also fires when the pointer crosses into a child.
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setDragging(false);
          }
        }}
        onDrop={onDrop}
      >
        <div className="content">
          <span className="eyebrow">Your race, your file</span>
          <h1 className="title">Terminus</h1>
          <p className="subtitle">
            Open the GPX of the race you&apos;re running today.
          </p>

          <div className="choices">
            <button
              type="button"
              className="choice-btn"
              onClick={() => inputRef.current?.click()}
              disabled={opening}
              aria-busy={opening}
            >
              <FolderPlus size={16} />
              <span className="choice-label">
                {opening ? "Opening…" : "Open GPX"}
              </span>
            </button>
            <input
              ref={inputRef}
              type="file"
              // why: extension only, as in Retrace's FilePicker — with
              // ".gpx,application/gpx+xml" iOS greyed every file out of
              // the picker.
              accept=".gpx"
              hidden
              data-testid="gpx-input"
              onChange={(event) => {
                const [file] = event.target.files;
                if (file) openFile(file);
                event.target.value = "";
              }}
            />
            <p className="drop-hint">or drop the file anywhere on the page</p>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </div>

          <p className="note">
            The file stays on this device. Checkpoints, cutoffs and life bases
            come from its waypoints — add them with Waymark.
          </p>

          <button className="help-link" onClick={() => navigate("/help")}>
            <HelpCircle size={13} strokeWidth={2} />
            Need some help?
          </button>

          <footer className="footer">© 2026 Terminus</footer>
        </div>
      </div>
    </>
  );
}

const StyledWizard = style(Wizard);

export default StyledWizard;
