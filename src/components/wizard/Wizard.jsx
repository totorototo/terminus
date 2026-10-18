import { useRef, useState } from "react";

import { Check } from "@styled-icons/feather/Check";
import { FileText } from "@styled-icons/feather/FileText";
import { FolderPlus } from "@styled-icons/feather/FolderPlus";
import { HelpCircle } from "@styled-icons/feather/HelpCircle";
import { useLocation } from "wouter";

import { track } from "../../lib/analytics.js";
import { checkGpxFile, saveLocalGpx } from "../../lib/localGpx.js";
import { checkPlanFile, planFileError } from "../../lib/planFile.js";
import useStore from "../../store/store.js";
import ThemeToggle from "../story/ThemeToggle.jsx";

import style from "./Wizard.style.js";

// The race is two files: the GPX (checkpoints, cutoffs, from Waymark) and its
// plan.json (the pace model, from Regimen). gpxz checks the plan names this
// GPX before either is kept, so /run never opens a race on someone else's plan.
function Wizard({ className }) {
  const gpxInputRef = useRef(null);
  const planInputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState(null);
  // The GPX picked, read but not kept until its plan.json checks out.
  const [course, setCourse] = useState(null); // { name, bytes }
  const flush = useStore((state) => state.flush);
  const forgetLiveSession = useStore((state) => state.forgetLiveSession);
  const setPlanFile = useStore((state) => state.setPlanFile);
  const setPaceSettings = useStore((state) => state.setPaceSettings);
  const initGPXWorker = useStore((state) => state.initGPXWorker);
  const readPlanFile = useStore((state) => state.readPlanFile);
  const [, navigate] = useLocation();

  const openCourse = async (file) => {
    const problem = checkGpxFile(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setCourse({ name: file.name, bytes: await file.arrayBuffer() });
  };

  const openPlan = async (file) => {
    if (!course) {
      setError("Open the race's GPX first.");
      return;
    }
    const problem = checkPlanFile(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setOpening(true);
    let settings;
    try {
      // The app's one worker, started here rather than on /run: gpxz reads
      // the plan, and it carries on to /run with the race.
      initGPXWorker();
      settings = await readPlanFile(await file.arrayBuffer(), course.bytes);
    } catch (err) {
      setError(planFileError(err.message));
      setOpening(false);
      return;
    }
    try {
      await saveLocalGpx({ name: course.name, bytes: course.bytes });
    } catch {
      setError("Could not open this race on this device.");
      setOpening(false);
      return;
    }
    // A new file is a new race: fixes saved against the previous route
    // would project onto the wrong trace, and its followers' room holds
    // the previous file.
    flush();
    forgetLiveSession();
    setPaceSettings(settings);
    setPlanFile({ name: file.name });
    track("gpx-opened");
    navigate("/run");
  };

  const onDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    const [file] = event.dataTransfer.files;
    if (!file) return;
    if (/\.json$/i.test(file.name)) openPlan(file);
    else openCourse(file);
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
            Open the GPX of the race you&apos;re running today, then the
            plan.json you made for it.
          </p>

          <div className="choices">
            <button
              type="button"
              className="choice-btn"
              onClick={() => gpxInputRef.current?.click()}
              disabled={opening}
            >
              {course ? <Check size={16} /> : <FolderPlus size={16} />}
              <span className="choice-label">{course?.name ?? "Open GPX"}</span>
            </button>
            <input
              ref={gpxInputRef}
              type="file"
              // why: extension only, as in Retrace's FilePicker — with
              // ".gpx,application/gpx+xml" iOS greyed every file out of
              // the picker.
              accept=".gpx"
              hidden
              data-testid="gpx-input"
              onChange={(event) => {
                const [file] = event.target.files;
                if (file) openCourse(file);
                event.target.value = "";
              }}
            />
            <button
              type="button"
              className="choice-btn"
              onClick={() => planInputRef.current?.click()}
              disabled={!course || opening}
              aria-busy={opening}
            >
              <FileText size={16} />
              <span className="choice-label">
                {opening ? "Opening…" : "Open plan.json"}
              </span>
            </button>
            <input
              ref={planInputRef}
              type="file"
              accept=".json"
              hidden
              data-testid="plan-input"
              onChange={(event) => {
                const [file] = event.target.files;
                if (file) openPlan(file);
                event.target.value = "";
              }}
            />
            <p className="drop-hint">or drop the files anywhere on the page</p>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </div>

          <p className="note">
            The files stay on this device. Checkpoints, cutoffs and life bases
            come from the GPX&apos;s waypoints — add them with Waymark. Your
            pace comes from the plan.json — make it with Regimen.
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
