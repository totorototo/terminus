// Fails unless zig/build.zig.zon pins the Trail Suite's Zig libraries as the other apps do:
// gpxz and fitz at their latest release (the newest vX.Y.Z tag), and debriefz (when used) on
// those same commits.
//
// The apps exchange files that one library defines (gpxz writes plan.json in Regimen and
// reads it in Terminus and Retrace), so two apps on different commits can disagree on a file
// the runner carries from one to the other. The latest release is the one version every app
// agrees on; a commit to a library's main changes nothing until it is tagged.
//
// Usage: node scripts/check-pins.mjs [path/to/build.zig.zon]
// The same file in Waymark, Regimen, Terminus and Retrace.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const OWNER = "totorototo";
// Libraries pinned at their latest release. debriefz is checked through the commits it pins.
const LIBRARIES_RELEASED = ["gpxz", "fitz"];
// A release tag. Pre-releases (v1.0.0-rc.1) are not releases.
const RELEASE = /^v(\d+)\.(\d+)\.(\d+)$/;

/** Every dependency in a build.zig.zon, as { name: url }. */
export function parseDependencies(zon) {
  const dependencies = {};
  const pattern =
    /\.([A-Za-z_][A-Za-z0-9_]*)\s*=\s*\.\{\s*\.url\s*=\s*"([^"]+)"/g;
  for (const [, name, url] of zon.matchAll(pattern)) dependencies[name] = url;
  return dependencies;
}

/**
 * The { ref, commit } a `git+https://github.com/<owner>/<name>[?ref=<ref>]#<commit>` URL pins,
 * or null. `zig fetch --save` writes the `?ref=` form when given a tag; ref is null without it.
 */
export function parsePin(url, name) {
  const prefix = `git+https://github.com/${OWNER}/${name}`;
  if (!url.startsWith(prefix)) return null;
  const match = /^(?:\?ref=([^#]+))?#([0-9a-f]{40})$/.exec(
    url.slice(prefix.length),
  );
  return match ? { ref: match[1] ?? null, commit: match[2] } : null;
}

/** The commit a pin URL names, or null. */
export function pinnedCommit(url, name) {
  return parsePin(url, name)?.commit ?? null;
}

/** -1, 0 or 1 as release tag a is older than, the same as or newer than b. */
export function releaseCompare(a, b) {
  const [, ...va] = RELEASE.exec(a).map(Number);
  const [, ...vb] = RELEASE.exec(b).map(Number);
  for (let i = 0; i < 3; i += 1)
    if (va[i] !== vb[i]) return va[i] < vb[i] ? -1 : 1;
  return 0;
}

/**
 * The newest release in `git ls-remote --tags` output, as { tag, commit }, or null without one.
 * An annotated tag is listed twice, its tag object then the commit it points at (`<tag>^{}`):
 * the commit is the one a pin names.
 */
export function latestRelease(lsRemote) {
  const direct = {};
  const peeled = {};
  for (const line of lsRemote.split("\n")) {
    const match = /^([0-9a-f]{40})\trefs\/tags\/([^^]+)(\^\{\})?$/.exec(line);
    if (!match || !RELEASE.test(match[2])) continue;
    (match[3] ? peeled : direct)[match[2]] = match[1];
  }
  let latest = null;
  for (const tag of Object.keys(direct)) {
    if (latest === null || releaseCompare(tag, latest) > 0) latest = tag;
  }
  return latest === null
    ? null
    : { tag: latest, commit: peeled[latest] ?? direct[latest] };
}

function tagsRemote(name) {
  return execFileSync(
    "git",
    ["ls-remote", "--tags", `https://github.com/${OWNER}/${name}`],
    {
      encoding: "utf8",
    },
  );
}

async function zonAt(name, commit) {
  const url = `https://raw.githubusercontent.com/${OWNER}/${name}/${commit}/build.zig.zon`;
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`${name}@${commit}: ${response.status} for ${url}`);
  return response.text();
}

function fetchHint(name, tag) {
  return `cd zig && zig fetch --save=${name} git+https://github.com/${OWNER}/${name}#${tag}`;
}

async function main() {
  const path = process.argv[2] ?? "zig/build.zig.zon";
  const dependencies = parseDependencies(readFileSync(path, "utf8"));
  const errors = [];

  const pins = {};
  for (const [name, url] of Object.entries(dependencies)) {
    pins[name] = parsePin(url, name);
    if (pins[name] === null) {
      errors.push(
        `${name}: ${url} is not a git+https://github.com/${OWNER}/${name}[?ref=<tag>]#<commit> pin`,
      );
    }
  }

  for (const name of LIBRARIES_RELEASED) {
    const pin = pins[name];
    if (!pin) continue;
    const latest = latestRelease(tagsRemote(name));
    if (latest === null) {
      errors.push(
        `${name}: github.com/${OWNER}/${name} has no vX.Y.Z release tag`,
      );
      continue;
    }
    if (
      pin.commit !== latest.commit ||
      (pin.ref !== null && pin.ref !== latest.tag)
    ) {
      const pinned =
        pin.ref === null ? pin.commit : `${pin.ref} (${pin.commit})`;
      errors.push(
        `${name}: pinned ${pinned}, latest release is ${latest.tag} (${latest.commit})\n` +
          `  ${fetchHint(name, latest.tag)}`,
      );
    }
  }

  if (pins.debriefz) {
    const pinned = parseDependencies(
      await zonAt("debriefz", pins.debriefz.commit),
    );
    for (const name of LIBRARIES_RELEASED) {
      if (!pins[name]) continue;
      const commit = pinnedCommit(pinned[name] ?? "", name);
      if (commit !== pins[name].commit) {
        errors.push(
          `debriefz@${pins.debriefz.commit} pins ${name} ${commit}, this app ${pins[name].commit}`,
        );
      }
    }
  }

  if (errors.length > 0) {
    console.error(
      `${path}: the Zig pins drift from the suite's\n- ${errors.join("\n- ")}`,
    );
    process.exit(1);
  }
  console.log(
    `${path}: ${Object.keys(dependencies).join(", ")} pinned as the suite's`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
