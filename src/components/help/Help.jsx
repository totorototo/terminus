import { useLocation } from "wouter";

import style from "./Help.style.js";

const SECTIONS = [
  { id: "start", label: "Getting Started" },
  { id: "story", label: "The Story" },
  { id: "live", label: "Live Tracking" },
  { id: "terrain", label: "Terrain & Pace" },
  { id: "checkpoints", label: "Checkpoints" },
  { id: "end", label: "End of Line" },
  { id: "follower", label: "Follower" },
  { id: "install", label: "Install" },
  { id: "privacy", label: "Privacy" },
];

function Help({ className }) {
  const [, navigate] = useLocation();

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const handleBack = () => {
    if (window.history.length > 1) window.history.back();
    else navigate("/");
  };

  return (
    <div className={className}>
      <header className="help-header">
        <button className="back-btn" onClick={handleBack}>
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
          <p className="hero-sub">GPS trail visualization for trail runners.</p>
        </div>

        {/* GETTING STARTED */}
        <section id="start" className="section">
          <p className="sec-label">01 — Getting Started</p>
          <h2 className="sec-title">Open your race&apos;s GPX</h2>
          <p className="sec-body">
            Tap &quot;Open GPX&quot; on the start screen, or drop the file
            anywhere on it. The file stays on this device until you invite
            someone to follow, and Terminus reopens it after a reload. Opening
            another file starts a new race: it erases the GPS positions saved
            for the previous one and stops sharing it. Followers never see this
            screen — the link a runner sends opens their race directly.
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
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <h3>The race director&apos;s file</h3>
              <p>
                A plain GPX of the course gives you the route, the map, the
                climbs, the profile, and the pace. Without waypoints there are
                no checkpoints, cutoffs, or ETAs.
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
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <h3>A file annotated in Waymark</h3>
              <p>
                Add the start, time barriers, life bases, and the arrival — with
                their cutoffs — in Waymark, then open the exported file here.
                That unlocks stages, checkpoints, ETAs, and the weather forecast
                for each stop.
              </p>
            </div>
          </div>
        </section>

        <hr className="divider" />

        {/* THE STORY */}
        <section id="story" className="section">
          <p className="sec-label">02 — The Story</p>
          <h2 className="sec-title">One continuous scroll</h2>
          <p className="sec-body">
            There is no map view, no bottom sheet, no floating command dock.
            Terminus reads like a longform article about the route — every
            section below lives on that same page, in this order. The only
            control that persists is a small theme toggle pinned to the top
            corner.
          </p>
          <div className="feat-grid">
            <div className="feat">
              <h4>
                <span className="dot" />
                The route
              </h4>
              <p>
                Trail name, distance, elevation gain/loss, total estimated time,
                and a start/elapsed clock.
              </p>
            </div>
            <div className="feat">
              <h4>
                <span className="dot t" />
                The place
              </h4>
              <p>An interactive map tracing the course on the ground.</p>
            </div>
            <div className="feat">
              <h4>
                <span className="dot g" />
                Right now
              </h4>
              <p>
                Live km left, ETA, and time remaining — updates as the GPS
                position moves.
              </p>
            </div>
            <div className="feat">
              <h4>
                <span className="dot" />
                The climbs
              </h4>
              <p>
                Every climb, graded 4 (easiest) to 1, then HC (hors catégorie)
                by length and steepness.
              </p>
            </div>
            <div className="feat">
              <h4>
                <span className="dot t" />
                The profile
              </h4>
              <p>
                Full elevation chart, a slope-intensity strip, and an
                effort-intensity chart, all marked with the current position.
              </p>
            </div>
            <div className="feat">
              <h4>
                <span className="dot g" />
                The pace
              </h4>
              <p>
                Required pace and effort per kilometer, plus the runner profile
                and life base stop controls that drive every estimate on the
                page.
              </p>
            </div>
            <div className="feat">
              <h4>
                <span className="dot" />
                The stages
              </h4>
              <p>
                Milestones — start, life bases, and the finish — with cutoffs.
              </p>
            </div>
            <div className="feat">
              <h4>
                <span className="dot t" />
                The checkpoints
              </h4>
              <p>
                ETA, cutoff, and weather forecast for every checkpoint and life
                base.
              </p>
            </div>
            <div className="feat">
              <h4>
                <span className="dot g" />
                End of line
              </h4>
              <p>Share a trail card, switch theme, and leave.</p>
            </div>
          </div>
        </section>

        <hr className="divider" />

        {/* LIVE TRACKING */}
        <section id="live" className="section">
          <p className="sec-label">03 — Live Tracking</p>
          <h2 className="sec-title">Where you are, right now</h2>
          <p className="sec-body">
            The &quot;Right now&quot; section is the one part of the story that
            updates on its own — km left, ETA, and time remaining, based on the
            pace run so far against the terrain ahead. The map above it traces
            the course on an interactive, lazy-loaded map.
          </p>
          <div className="info-box">
            <strong>Spot me</strong> — starts your device&apos;s GPS and takes a
            fix right away, then every 30 minutes. It is the only control that
            starts the live numbers this whole page depends on. Once you have
            invited someone to follow, each fix is also sent to them; until then
            your positions stay on this device. Followers have no Spot me button
            — their numbers update from the runner&apos;s fixes.
          </div>
        </section>

        <hr className="divider" />

        {/* TERRAIN & PACE */}
        <section id="terrain" className="section">
          <p className="sec-label">04 — Terrain &amp; Pace</p>
          <h2 className="sec-title">Climbs, profile &amp; pace</h2>
          <p className="sec-body">
            Together these sections tell you what the route demands and how fast
            you can expect to move through it.
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
                  <path d="M3 17l4-8 4 5 3-3 4 6H3z" />
                </svg>
              </div>
              <div>
                <p className="pi-name">Climbs</p>
                <p className="pi-desc">
                  Category (HC, then 1 to 4), summit elevation, average grade,
                  and length for every climb — the one you are currently on is
                  marked &quot;In progress&quot;.
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
                <p className="pi-name">Profile</p>
                <p className="pi-desc">
                  The full elevation chart for the route, with your position
                  marked on the current climb or descent.
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
                  <path d="M18 20V10" />
                  <path d="M12 20V4" />
                  <path d="M6 20v-6" />
                </svg>
              </div>
              <div>
                <p className="pi-name">Slope &amp; effort intensity</p>
                <p className="pi-desc">
                  A gradient strip and an effort chart along the whole route —
                  both dim the portion already covered, doubling as a progress
                  indicator.
                </p>
              </div>
            </div>
          </div>
          <p className="sec-body pace-intro">
            The pace chart shows the slowest pace still allowed at every point
            on the course, and the effort multiplier it represents. Two controls
            beneath it drive every ETA, cutoff, and estimate on the page:
          </p>
          <div className="info-box">
            <strong>Runner profile &amp; life base stops</strong> — pick a
            runner profile (Casual, Trail, Athlete, Elite) and how long you plan
            to rest at each life base (none, 30 min, 1 hour, 2 hours). Changing
            either instantly recalculates every estimate on the page. Followers
            see both pickers disabled, synced from the runner.
          </div>
        </section>

        <hr className="divider" />

        {/* CHECKPOINTS */}
        <section id="checkpoints" className="section">
          <p className="sec-label">05 — Checkpoints &amp; Stages</p>
          <h2 className="sec-title">Every stop, with a forecast</h2>
          <p className="sec-body">
            The stages list is the big picture — start, every life base, and the
            finish. The checkpoints list is the detailed one: every named
            waypoint, in order, each with distance, ETA, and cutoff. A
            checkpoint whose ETA is past its cutoff is flagged in accent colour.
            Both lists come from the GPX&apos;s waypoints, so a file without
            them shows neither.
          </p>
          <div className="feat-grid">
            <div className="feat">
              <h4>
                <span className="dot" />
                Distance &amp; elevation
              </h4>
              <p>
                Distance, gain/loss, estimated time, and the maximum allotted
                time for the leg leading to each stop.
              </p>
            </div>
            <div className="feat">
              <h4>
                <span className="dot t" />
                Difficulty
              </h4>
              <p>
                A colour-coded rating for how demanding each leg is, from easy
                to very hard.
              </p>
            </div>
            <div className="feat">
              <h4>
                <span className="dot g" />
                Weather forecast
              </h4>
              <p>
                Temperature, chance of precipitation, and wind speed forecast
                for your predicted arrival time, via Open-Meteo — cold, wet, or
                windy conditions are flagged.
              </p>
            </div>
          </div>
          <div className="info-box">
            <strong>Forecasts refresh automatically</strong> — as your estimated
            pace shifts, predicted arrival times move, and the weather forecast
            for each stop is re-fetched to match.
          </div>
        </section>

        <hr className="divider" />

        {/* END OF LINE */}
        <section id="end" className="section">
          <p className="sec-label">06 — End of Line</p>
          <h2 className="sec-title">Actions</h2>
          <p className="sec-body">
            The bottom of the story is also where the only exit affordance
            lives, alongside a handful of utility actions.
          </p>
          <table className="gtable">
            <thead>
              <tr>
                <th>Action</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Share this trail</td>
                <td>
                  Generates a shareable card — route name, distance, elevation,
                  and estimated time — and opens the native share sheet, or
                  downloads it.
                </td>
              </tr>
              <tr>
                <td>Invite someone to follow</td>
                <td>
                  Runner only. Uploads this race&apos;s GPX to the relay and
                  shares a link to follow you live.
                </td>
              </tr>
              <tr>
                <td>Stop sharing</td>
                <td>
                  Runner only, once you have invited someone. Deletes the race
                  and your last position from the relay; followers get no more
                  updates.
                </td>
              </tr>
              <tr>
                <td>Switch theme</td>
                <td>Toggle between light and dark mode.</td>
              </tr>
              <tr>
                <td>Flush saved locations</td>
                <td>
                  Runner only. Erases this device&apos;s buffered GPS fixes.
                </td>
              </tr>
              <tr>
                <td>User guide</td>
                <td>Open this documentation page.</td>
              </tr>
              <tr>
                <td>Leave trail</td>
                <td>
                  Exit the current race and return to the start screen. Your
                  saved route data is preserved.
                </td>
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
            Follower mode lets crew, family, or fans read a runner&apos;s story
            in real time from any device — no GPX file and no GPS permission
            needed.
          </p>
          <div className="feat-grid">
            <div className="feat">
              <h4>
                <span className="dot t" />
                Invite link
              </h4>
              <p>
                The runner shares a link from &quot;Invite someone to
                follow&quot;. Opening it downloads the runner&apos;s race and
                connects you to their session — nothing to pick or type.
              </p>
            </div>
            <div className="feat">
              <h4>
                <span className="dot t" />
                Live sync
              </h4>
              <p>
                The runner&apos;s position, pace profile, and life base settings
                are pushed to every connected follower in real time.
              </p>
            </div>
            <div className="feat">
              <h4>
                <span className="dot t" />
                Same story
              </h4>
              <p>
                Followers read the identical scroll, built from the very same
                file — hero, map, climbs, terrain, pace, checkpoints — locked to
                the runner&apos;s live position.
              </p>
            </div>
            <div className="feat">
              <h4>
                <span className="dot t" />
                Read-only
              </h4>
              <p>
                Spot me, invite-to-follow, the runner profile / life base
                pickers, and flush saved locations are hidden or disabled —
                nothing here can change what the runner set.
              </p>
            </div>
          </div>
          <div className="info-box">
            <strong>What the relay keeps</strong> — inviting someone uploads the
            race&apos;s GPX to the relay so followers can read it. The relay
            deletes it, with the last position, when the runner stops sharing or
            opens another race, or 7 days after the last update.
          </div>
        </section>

        <hr className="divider" />

        {/* INSTALL */}
        <section id="install" className="section">
          <p className="sec-label">08 — Install</p>
          <h2 className="sec-title">Add to Home Screen</h2>
          <p className="sec-body">
            Terminus is a Progressive Web App (PWA). You can install it on your
            phone like a native app — it runs full-screen with no browser
            chrome, loads instantly, and keeps working offline.
          </p>
          <div className="feat-grid">
            <div className="feat">
              <h4>
                <span className="dot" />
                Android (Chrome)
              </h4>
              <p>
                Open Terminus in Chrome. Tap the&nbsp;
                <strong>⋮ menu</strong> in the top-right corner, then tap{" "}
                <strong>Add to Home screen</strong>. Confirm by tapping{" "}
                <strong>Add</strong> — the app icon appears on your home screen.
              </p>
            </div>
            <div className="feat">
              <h4>
                <span className="dot" />
                iPhone / iPad (Safari)
              </h4>
              <p>
                Open Terminus in Safari. Tap the <strong>Share button</strong>{" "}
                (the square with an arrow pointing up) at the bottom of the
                screen, then tap <strong>Add to Home Screen</strong>. Tap{" "}
                <strong>Add</strong> to confirm.
              </p>
            </div>
          </div>
          <div className="info-box">
            <strong>Safari required on iPhone</strong> — iOS only allows PWA
            installation from Safari. If you are using Chrome or another browser
            on iPhone, open the same URL in Safari first.
          </div>
        </section>

        <hr className="divider" />

        {/* PRIVACY */}
        <section id="privacy" className="section">
          <p className="sec-label">09 — Privacy</p>
          <h2 className="sec-title">What leaves your device</h2>
          <p className="sec-body">
            Terminus has no accounts and sets no cookies. Your GPX, plan and
            settings stay in this browser (IndexedDB and local storage). These
            services see a request only when you use what they serve:
          </p>
          <div className="feat-grid">
            <div className="feat">
              <h4>
                <span className="dot" />
                Mapbox — the map
              </h4>
              <p>
                Map tiles, terrain and fonts come from Mapbox, so it sees your
                IP address and the area you view. The map library also sends
                Mapbox anonymous usage events (map loads).
              </p>
            </div>
            <div className="feat">
              <h4>
                <span className="dot" />
                Open-Meteo — forecasts
              </h4>
              <p>
                Forecasts are fetched for the checkpoints&apos; coordinates, the
                course&apos;s and not yours. Open-Meteo sees your IP address and
                those coordinates.
              </p>
            </div>
            <div className="feat">
              <h4>
                <span className="dot" />
                Umami — usage statistics
              </h4>
              <p>
                Cookieless, aggregate statistics: pages viewed, browser, device,
                country, page speed, and which features are used (opening a GPX,
                sharing, theme). No position and no file content.
              </p>
            </div>
            <div className="feat">
              <h4>
                <span className="dot" />
                Web3Forms — the contact form
              </h4>
              <p>
                Only when you send the form: your email address, your message
                and the race&apos;s name, forwarded to the author by email.
              </p>
            </div>
            <div className="feat">
              <h4>
                <span className="dot t" />
                Cloudflare — live sharing
              </h4>
              <p>
                Only while you share your location: the race&apos;s GPX, your
                position, pace and fueling settings go to the relay, which
                passes them to your followers. Followers who turn on
                notifications leave their browser&apos;s push address there.
              </p>
            </div>
            <div className="feat">
              <h4>
                <span className="dot" />
                Netlify and jsDelivr — the app itself
              </h4>
              <p>
                Netlify hosts Terminus and sees each visit&apos;s IP address.
                The trail card you share is drawn with a font fetched from
                jsDelivr.
              </p>
            </div>
          </div>
          <div className="info-box">
            <strong>What the relay keeps</strong> — your last position for an
            hour. The GPX, position and followers&apos; push addresses are
            deleted when you stop sharing or open another race, or 7 days after
            the last update. Nothing is sold or used for advertising.
          </div>
        </section>

        <footer className="help-footer">© 2026 Terminus</footer>
      </main>
    </div>
  );
}

const StyledHelp = style(Help);

export default StyledHelp;
