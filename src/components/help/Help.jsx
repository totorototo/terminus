import { useLocation } from "wouter";

import style from "./Help.style.js";

const SECTIONS = [
  { id: "role", label: "Getting Started" },
  { id: "race", label: "Pick a Race" },
  { id: "scene", label: "Scene" },
  { id: "top", label: "Top Panel" },
  { id: "bottom", label: "Bottom Panel" },
  { id: "commands", label: "Commands" },
  { id: "follower", label: "Follower" },
];

function Help({ className }) {
  const [, navigate] = useLocation();

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className={className}>
      <header className="help-header">
        <button className="back-btn" onClick={() => navigate("/")}>
          ← Back
        </button>
        <nav className="section-nav">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              className="nav-btn"
              onClick={() => scrollTo(s.id)}
            >
              {s.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="help-main">
        {/* HERO */}
        <div className="hero">
          <p className="hero-eyebrow">Documentation</p>
          <h1 className="hero-title">Terminus</h1>
          <p className="hero-sub">
            GPS trail visualization for runners and their crew.
          </p>
        </div>

        {/* ROLE */}
        <section id="role" className="section">
          <p className="sec-label">01 — Getting Started</p>
          <h2 className="sec-title">Choose your role</h2>
          <p className="sec-body">
            When you open Terminus you are greeted by a two-step wizard. First,
            tell the app who you are — then pick your race.
          </p>
          <div className="role-grid">
            <div className="role-card rn">
              <div className="role-icon">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <h3>Runner</h3>
              <p>
                You are on the course. Terminus visualizes your race in 2D and
                3D, tracks your real-time position along the route, and shares a
                live room code with your crew.
              </p>
            </div>
            <div className="role-card fo">
              <div className="role-icon">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <h3>Follower</h3>
              <p>
                You are watching from the sidelines. Enter the runner&apos;s
                6-character room code to join their session and track them live
                on the same map.
              </p>
            </div>
          </div>
        </section>

        <hr className="divider" />

        {/* RACE */}
        <section id="race" className="section">
          <p className="sec-label">02 — Race Selection</p>
          <h2 className="sec-title">Pick a race</h2>
          <p className="sec-body">
            After choosing your role, select the event you are running or
            following. Each race includes a pre-loaded GPX route with elevation
            data, waypoints, and segment markers.
          </p>
          <div className="feat-grid">
            <div className="feat">
              <h4>
                <span className="dot" />
                GPX Route
              </h4>
              <p>Full GPS track with elevation profile loaded automatically.</p>
            </div>
            <div className="feat">
              <h4>
                <span className="dot t" />
                Waypoints
              </h4>
              <p>
                Aid stations, checkpoints, and key landmarks along the course.
              </p>
            </div>
            <div className="feat">
              <h4>
                <span className="dot g" />
                Segments
              </h4>
              <p>
                Named course sections with distance and elevation gain per leg.
              </p>
            </div>
          </div>
        </section>

        <hr className="divider" />

        {/* SCENE */}
        <section id="scene" className="section">
          <p className="sec-label">03 — Visualization</p>
          <h2 className="sec-title">2D / 3D Scene</h2>
          <p className="sec-body">
            The main view renders the race route in both 2D (map overhead) and
            3D (immersive terrain). Switch between views at any time — your
            position and the route are kept in sync across both modes.
          </p>
          <div className="feat-grid">
            <div className="feat">
              <h4>
                <span className="dot" />
                2D Map
              </h4>
              <p>
                Top-down view of the entire course with elevation coloring and
                waypoint markers.
              </p>
            </div>
            <div className="feat">
              <h4>
                <span className="dot" />
                3D Terrain
              </h4>
              <p>
                Immersive Three.js scene built from the GPS track. Drag to
                orbit, pinch to zoom.
              </p>
            </div>
            <div className="feat">
              <h4>
                <span className="dot t" />
                Live Position
              </h4>
              <p>
                Your GPS position is plotted in real time on both 2D and 3D
                views.
              </p>
            </div>
            <div className="feat">
              <h4>
                <span className="dot t" />
                Elevation Profile
              </h4>
              <p>
                Interactive cross-section graph at the bottom of the screen
                showing your current position on the climb.
              </p>
            </div>
          </div>
        </section>

        <hr className="divider" />

        {/* TOP PANEL */}
        <section id="top" className="section">
          <p className="sec-label">04 — Top Panel</p>
          <h2 className="sec-title">Race header</h2>
          <p className="sec-body">
            The top panel displays the current section at a glance — how far you
            have left to run and how much elevation remains in the section.
          </p>
          <div className="panel-list">
            <div className="pi">
              <div className="pi-icon primary">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <div>
                <p className="pi-name">
                  Current section — km &amp; elevation left
                </p>
                <p className="pi-desc">
                  Distance remaining and elevation gain left in the current
                  section of the course.
                </p>
              </div>
            </div>
          </div>
        </section>

        <hr className="divider" />

        {/* BOTTOM PANEL */}
        <section id="bottom" className="section">
          <p className="sec-label">05 — Bottom Panel</p>
          <h2 className="sec-title">Stats carousel</h2>
          <p className="sec-body">
            The bottom panel is a swipeable carousel. Each card gives you a
            different lens on your race — swipe left or right to browse.
          </p>
          <div className="panel-list">
            <div className="pi">
              <div className="pi-icon primary">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </div>
              <div>
                <p className="pi-name">Race overview</p>
                <p className="pi-desc">
                  Top-level race stats — total distance, total elevation gain,
                  and overall progress.
                </p>
              </div>
            </div>
            <div className="pi">
              <div className="pi-icon primary">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg>
              </div>
              <div>
                <p className="pi-name">Race progression</p>
                <p className="pi-desc">
                  How far you have come and how far remains — distance and
                  elevation progress through the full course.
                </p>
              </div>
            </div>
            <div className="pi">
              <div className="pi-icon primary">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 20V10" />
                  <path d="M12 20V4" />
                  <path d="M6 20v-6" />
                </svg>
              </div>
              <div>
                <p className="pi-name">Current stage analytics</p>
                <p className="pi-desc">
                  Detailed stats for the current stage: distance, D+, D−, and
                  your progress within it.
                </p>
              </div>
            </div>
            <div className="pi">
              <div className="pi-icon primary">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <div>
                <p className="pi-name">Current section analytics</p>
                <p className="pi-desc">
                  Focused view of the current section — km left, elevation
                  remaining, and section-level D+/D−.
                </p>
              </div>
            </div>
            <div className="pi">
              <div className="pi-icon secondary">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div>
                <p className="pi-name">ETAs — checkpoints</p>
                <p className="pi-desc">
                  Estimated arrival times at upcoming checkpoints based on your
                  current pace.
                </p>
              </div>
            </div>
            <div className="pi">
              <div className="pi-icon secondary">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 17l4-8 4 5 3-3 4 6H3z" />
                </svg>
              </div>
              <div>
                <p className="pi-name">Climbs — climb pro</p>
                <p className="pi-desc">
                  Upcoming climbs with gradient, length, and elevation gain —
                  detailed climb-by-climb breakdown.
                </p>
              </div>
            </div>
            <div className="pi">
              <div className="pi-icon secondary">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
                </svg>
              </div>
              <div>
                <p className="pi-name">Extra commands</p>
                <p className="pi-desc">
                  Utility actions: fly-by animation, delete saved data, and
                  other advanced options.
                </p>
              </div>
            </div>
          </div>
        </section>

        <hr className="divider" />

        {/* COMMANDS */}
        <section id="commands" className="section">
          <p className="sec-label">06 — Controls</p>
          <h2 className="sec-title">Commands</h2>
          <p className="sec-body">
            The command panel sits at the bottom of the screen. Tap any button
            to trigger the action.
          </p>
          <table className="gtable">
            <thead>
              <tr>
                <th>Command</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Locate me</td>
                <td>
                  Request your current GPS location. The browser asks for
                  permission each time you tap — your position is shown once and
                  not continuously tracked.
                </td>
              </tr>
              <tr>
                <td>Section / Slope</td>
                <td>
                  Toggle slope or section colouring on the route — highlights
                  gradient intensity or named course sections.
                </td>
              </tr>
              <tr>
                <td>2D / 3D</td>
                <td>
                  Switch between the overhead map view and the immersive 3D
                  terrain scene.
                </td>
              </tr>
              <tr>
                <td>Share room code</td>
                <td>
                  Display your 6-character code so followers can join your live
                  session.
                </td>
              </tr>
              <tr>
                <td>Switch theme</td>
                <td>Switch between light and dark colour schemes.</td>
              </tr>
            </tbody>
          </table>
        </section>

        <hr className="divider" />

        {/* FOLLOWER */}
        <section id="follower" className="section">
          <p className="sec-label secondary">07 — Follower Mode</p>
          <h2 className="sec-title">Follow a runner live</h2>
          <p className="sec-body">
            Follower mode lets crew, family, or fans track a runner&apos;s
            position in real time from any device — no GPS permission needed.
          </p>
          <div className="feat-grid">
            <div className="feat">
              <h4>
                <span className="dot t" />
                Room code
              </h4>
              <p>
                The runner shares a 6-character code. Enter it in the Follower
                flow to connect.
              </p>
            </div>
            <div className="feat">
              <h4>
                <span className="dot t" />
                Live sync
              </h4>
              <p>
                Runner position updates are pushed to all connected followers in
                real time.
              </p>
            </div>
            <div className="feat">
              <h4>
                <span className="dot t" />
                Same map
              </h4>
              <p>
                Followers see the identical 2D / 3D scene as the runner, locked
                to their position.
              </p>
            </div>
            <div className="feat">
              <h4>
                <span className="dot t" />
                Freshness indicator
              </h4>
              <p>
                A colour-coded badge shows how recent the last position update
                is — green means live.
              </p>
            </div>
          </div>
          <div className="info-box">
            <strong>Runner vs. Follower</strong> — the runner app uses the
            device GPS and broadcasts position. The follower app only receives
            it. Both see the same race map and elevation profile, but only the
            runner accumulates stats (pace, D+, elapsed time).
          </div>
        </section>

        <footer className="help-footer">© 2026 Terminus — La Vallée</footer>
      </main>
    </div>
  );
}

export default style(Help);
