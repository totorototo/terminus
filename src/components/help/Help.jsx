import { ArrowLeft } from "@styled-icons/feather/ArrowLeft";
import { useLocation } from "wouter";

import { MARK_PATH } from "../../theme/mark.js";
import ThemeToggle from "../story/ThemeToggle.jsx";

import style from "./Help.style.js";

// The user guide, on the suite's start page and story patterns: the masthead and title on
// the measure, a contents list (the start page's rows), then one section per part of the
// app, each an eyebrow, a title and its rows. Every claim here is checked against the
// code: change the guide with the feature.
const SECTIONS = [
  { id: "start", label: "Getting started" },
  { id: "story", label: "The story" },
  { id: "live", label: "Right now" },
  { id: "terrain", label: "Terrain and pace" },
  { id: "checkpoints", label: "Checkpoints" },
  { id: "fueling", label: "Fueling" },
  { id: "end", label: "End of line" },
  { id: "follower", label: "Following a runner" },
  { id: "install", label: "Install" },
  { id: "privacy", label: "Privacy" },
];

function Rows({ rows }) {
  return (
    <dl className="rows">
      {rows.map(([term, text]) => (
        <div className="row" key={term}>
          <dt>{term}</dt>
          <dd>{text}</dd>
        </div>
      ))}
    </dl>
  );
}

function Section({ id, eyebrow, title, children }) {
  return (
    <section id={id} className="section" aria-labelledby={`${id}-title`}>
      <span className="eyebrow">{eyebrow}</span>
      <h2 id={`${id}-title`} className="section-title">
        {title}
      </h2>
      {children}
    </section>
  );
}

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
    <>
      {/* why: outside the scrolling container, as on the start page: see ThemeToggle's
          why-comment for the fixed-positioning hazard. */}
      <ThemeToggle />
      <div className={className}>
        <div className="content">
          <header className="masthead">
            <svg className="mark" viewBox="0 0 64 64" aria-hidden="true">
              <path d={MARK_PATH} fillRule="evenodd" />
            </svg>
            <h1>terminus</h1>
          </header>

          <button type="button" className="back" onClick={handleBack}>
            <ArrowLeft size={14} aria-hidden="true" />
            Back
          </button>

          <span className="eyebrow">User guide</span>
          <h2 className="title">How it works</h2>
          <p className="lede">
            From two files to a race you can follow live: what each part of the
            page shows, who sees what, and what leaves your device.
          </p>

          <nav className="contents" aria-label="Contents">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                className="contents-row"
                onClick={() => scrollTo(s.id)}
              >
                {s.label}
              </button>
            ))}
          </nav>

          <Section
            id="start"
            eyebrow="Getting started"
            title="Two files, one race"
          >
            <p className="body">
              On the start screen, open the race&apos;s GPX, then the plan.json
              you made for it, or drop both anywhere on the page. Terminus
              checks that the plan was made for that GPX before it keeps either.
              The files stay on this device and reopen after a reload. Opening
              another race erases the positions saved for the previous one and
              stops sharing it.
            </p>
            <Rows
              rows={[
                [
                  "The GPX",
                  "The course from Waymark: the route, with the start, time barriers, life bases and arrival as waypoints, each with its cutoff. A plain GPX without waypoints still gives the map, the climbs and the profile, but no checkpoints, cutoffs or ETAs.",
                ],
                [
                  "The plan.json",
                  "Your pace model from Regimen: flat pace, fatigue, the stop at each life base, and fueling if you planned it. Every time on the page comes from it.",
                ],
              ]}
            />
            <p className="note">
              Followers never see this screen: the link a runner sends opens the
              race directly.
            </p>
          </Section>

          <Section
            id="story"
            eyebrow="The story"
            title="One page, top to bottom"
          >
            <p className="body">
              Once the race is open, Terminus is one long page about it, in this
              order. The dots on the right edge jump between its sections.
            </p>
            <Rows
              rows={[
                [
                  "Overview",
                  "The race's name, distance, gain and loss, estimated time, and a clock: starts in, elapsed, or ended.",
                ],
                ["Map", "The course on an interactive map."],
                [
                  "Right now",
                  "Km left, ETA, time remaining and the gap to the plan, from your last position.",
                ],
                [
                  "Terrain",
                  "The elevation profile, slope, runnability, effort intensity and route stats.",
                ],
                [
                  "Climbs",
                  "Every climb, graded 4 (easiest) to 1, then HC (hors catégorie), by length and steepness. The one you're on is marked In progress.",
                ],
                [
                  "Pace",
                  "The slowest pace still allowed at every point of the course, and the model from your plan.json.",
                ],
                [
                  "Milestones",
                  "The start, each life base and the finish, with their cutoffs.",
                ],
                [
                  "Checkpoints",
                  "Every checkpoint with its ETA, cutoff, margin and forecast.",
                ],
                [
                  "Fueling",
                  "What to eat, drink and carry on each leg, from your plan.json.",
                ],
                ["End", "Share, invite, settings, and leave."],
              ]}
            />
          </Section>

          <Section id="live" eyebrow="Right now" title="Where you are">
            <p className="body">
              Spot me starts your device&apos;s GPS: it takes a fix right away,
              then one every 30 minutes. Each fix updates Right now and moves
              the ETAs to the pace you&apos;re holding against the terrain.
              Until you invite someone to follow, your positions stay on this
              device; after that, each fix is also sent to your followers.
            </p>
            <p className="note">
              Followers have no Spot me: their page moves with the runner&apos;s
              fixes.
            </p>
          </Section>

          <Section
            id="terrain"
            eyebrow="Terrain and pace"
            title="What the course asks of you"
          >
            <p className="body">
              Terrain and Climbs show what the route demands. Pace turns it into
              the slowest pace still allowed at every point, and the effort that
              stands for.
            </p>
            <p className="body">
              The pace model is your plan.json&apos;s: Terminus never sets one
              of its own. To change it, change the plan in Regimen, export it,
              and use Replace plan.json in Pace. Every ETA, margin and estimate
              on the page moves with it.
            </p>
          </Section>

          <Section
            id="checkpoints"
            eyebrow="Checkpoints"
            title="Every stop, against its cutoff"
          >
            <p className="body">
              Milestones is the big picture: the start, each life base and the
              finish. Checkpoints is every named waypoint in order, each with
              its ETA, cutoff and margin. Both come from the GPX&apos;s
              waypoints, so a file without any shows neither.
            </p>
            <Rows
              rows={[
                [
                  "OK, Tight, Over",
                  "The margin on the cutoff: more than an hour, under an hour, or past it.",
                ],
                [
                  "Difficulty",
                  "How hard the leg into the stop is, from Easy to Extreme.",
                ],
                [
                  "Forecast",
                  "Temperature, chance of rain and wind at your ETA, from Open-Meteo. Cold, wet or windy stops are flagged, and the forecast follows your ETA as it moves.",
                ],
              ]}
            />
          </Section>

          <Section id="fueling" eyebrow="Fueling" title="What to carry">
            <p className="body">
              When your plan.json has fueling, this section shows each
              leg&apos;s intake and what to leave each refill with, as you
              planned them in Regimen, at the plan&apos;s times. It doesn&apos;t
              re-plan to your live ETAs. A plan without fueling says so: plan it
              in Regimen, then replace the plan.json in Pace.
            </p>
            <p className="note">
              Fueling stays on your device: followers don&apos;t get it.
            </p>
          </Section>

          <Section
            id="end"
            eyebrow="End of line"
            title="Share, settings, leave"
          >
            <p className="body">
              The last section of the story holds the actions.
            </p>
            <Rows
              rows={[
                [
                  "Share this trail",
                  "A card with the race's name, distance, elevation and estimated time, through your device's share sheet, or downloaded.",
                ],
                [
                  "Invite someone to follow",
                  "Runner only. Sends this race's GPX to the relay and gives you a link to follow you live.",
                ],
                [
                  "Stop sharing",
                  "Runner only, once you've invited someone. Deletes the race and your last position from the relay: followers get no more updates.",
                ],
                ["Light mode, Dark mode", "Switches the theme."],
                [
                  "Outdoor mode",
                  "Larger, heavier text, for reading in sunlight.",
                ],
                [
                  "Flush saved locations",
                  "Runner only. Erases the positions saved on this device.",
                ],
                ["User guide", "This page."],
                [
                  "Contact us",
                  "A message to the author, with your email address and the race's name.",
                ],
                [
                  "Leave trail",
                  "Back to the start screen. The race stays saved on this device.",
                ],
              ]}
            />
          </Section>

          <Section
            id="follower"
            eyebrow="Following a runner"
            title="Follow a runner live"
          >
            <p className="body">
              Crew, family and friends follow from the link the runner sends,
              with no file to open and no GPS permission. The link downloads the
              runner&apos;s race and joins their session.
            </p>
            <Rows
              rows={[
                [
                  "Live",
                  "The runner's positions and pace settings reach every follower as they change. Fueling stays on the runner's device.",
                ],
                [
                  "Same story",
                  "The same page, from the same file, on the runner's last position.",
                ],
                [
                  "Read-only",
                  "No Spot me, invite, flush or Replace plan.json: nothing a follower does changes the runner's race.",
                ],
                [
                  "Notifications",
                  "Allow them, and Terminus tells you when the runner's position updates.",
                ],
              ]}
            />
            <p className="note">
              The relay deletes the race and the last position when the runner
              stops sharing or opens another race, or 7 days after the last
              update.
            </p>
          </Section>

          <Section
            id="install"
            eyebrow="Install"
            title="Add it to your home screen"
          >
            <p className="body">
              Terminus installs like an app: it opens full screen and keeps
              working offline.
            </p>
            <Rows
              rows={[
                [
                  "Android, Chrome",
                  <>
                    Open Terminus in Chrome, tap the <strong>⋮</strong> menu,
                    then <strong>Add to Home screen</strong>, and confirm with{" "}
                    <strong>Add</strong>.
                  </>,
                ],
                [
                  "iPhone and iPad, Safari",
                  <>
                    Open Terminus in Safari, tap <strong>Share</strong> (the
                    square with an arrow), then{" "}
                    <strong>Add to Home Screen</strong>, and confirm with{" "}
                    <strong>Add</strong>.
                  </>,
                ],
              ]}
            />
            <p className="note">
              On iPhone, only Safari installs web apps. In another browser, open
              the same address in Safari first.
            </p>
          </Section>

          <Section
            id="privacy"
            eyebrow="Privacy"
            title="What leaves your device"
          >
            <p className="body">
              Terminus has no accounts and sets no cookies. Your GPX, plan and
              settings stay in this browser (IndexedDB and local storage). These
              services see a request only when you use what they serve:
            </p>
            <Rows
              rows={[
                [
                  "Mapbox",
                  "The map. Tiles, terrain and fonts come from Mapbox, so it sees your IP address and the area you view. The map library also sends Mapbox anonymous usage events (map loads).",
                ],
                [
                  "Open-Meteo",
                  "Forecasts, fetched for the checkpoints' coordinates: the course's, not yours. Open-Meteo sees your IP address and those coordinates.",
                ],
                [
                  "Umami",
                  "Usage statistics, cookieless and aggregate: pages viewed, browser, device, country, page speed, and which features are used (opening a GPX, sharing, theme). No position and no file content.",
                ],
                [
                  "Web3Forms",
                  "The contact form, only when you send it: your email address, your message and the race's name, forwarded to the author by email.",
                ],
                [
                  "Cloudflare",
                  "Live sharing, only while you share your location: the race's GPX, your position and pace settings go to the relay, which passes them to your followers. Followers who turn on notifications leave their browser's push address there.",
                ],
                [
                  "Netlify and jsDelivr",
                  "The app itself. Netlify hosts Terminus and sees each visit's IP address. The trail card you share is drawn with a font fetched from jsDelivr.",
                ],
              ]}
            />
            <p className="note">
              The relay keeps your last position for an hour. The GPX, position
              and followers&apos; push addresses are deleted when you stop
              sharing or open another race, or 7 days after the last update.
              Nothing is sold or used for advertising.
            </p>
          </Section>

          <footer className="footer">© 2026 terminus — La Vallée</footer>
        </div>
      </div>
    </>
  );
}

const StyledHelp = style(Help);

export default StyledHelp;
