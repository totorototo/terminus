// Fails unless zig/build.zig.zon pins the Trail Suite's Zig libraries as the other apps do:
// gpxz and fitz at their main HEAD, and debriefz (when used) on those same commits.
//
// The apps exchange files that one library defines (gpxz writes plan.json in Regimen and
// reads it in Terminus and Retrace), so two apps on different commits can disagree on a file
// the runner carries from one to the other. Main HEAD is the one version every app can agree
// on without coordinating, until the libraries are tagged.
//
// Usage: node scripts/check-pins.mjs [path/to/build.zig.zon]
// The same file in Waymark, Regimen, Terminus and Retrace.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const OWNER = "totorototo";
// Libraries pinned at their main HEAD. debriefz is checked through the commits it pins.
const LIBRARIES_AT_HEAD = ["gpxz", "fitz"];
const COMMIT = /^[0-9a-f]{40}$/;

/** Every dependency in a build.zig.zon, as { name: url }. */
export function parseDependencies(zon) {
  const dependencies = {};
  const pattern =
    /\.([A-Za-z_][A-Za-z0-9_]*)\s*=\s*\.\{\s*\.url\s*=\s*"([^"]+)"/g;
  for (const [, name, url] of zon.matchAll(pattern)) dependencies[name] = url;
  return dependencies;
}

/** The commit a `git+https://github.com/<owner>/<name>#<commit>` URL pins, or null. */
export function pinnedCommit(url, name) {
  const prefix = `git+https://github.com/${OWNER}/${name}#`;
  if (!url.startsWith(prefix)) return null;
  const commit = url.slice(prefix.length);
  return COMMIT.test(commit) ? commit : null;
}

function headCommit(name) {
  const output = execFileSync(
    "git",
    ["ls-remote", `https://github.com/${OWNER}/${name}`, "refs/heads/main"],
    { encoding: "utf8" },
  );
  const commit = output.split(/\s/)[0];
  if (!COMMIT.test(commit))
    throw new Error(`${name}: no main HEAD in ${JSON.stringify(output)}`);
  return commit;
}

async function zonAt(name, commit) {
  const url = `https://raw.githubusercontent.com/${OWNER}/${name}/${commit}/build.zig.zon`;
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`${name}@${commit}: ${response.status} for ${url}`);
  return response.text();
}

function fetchHint(name, commit) {
  return `cd zig && zig fetch --save=${name} git+https://github.com/${OWNER}/${name}#${commit}`;
}

async function main() {
  const path = process.argv[2] ?? "zig/build.zig.zon";
  const dependencies = parseDependencies(readFileSync(path, "utf8"));
  const errors = [];

  const commits = {};
  for (const [name, url] of Object.entries(dependencies)) {
    commits[name] = pinnedCommit(url, name);
    if (commits[name] === null) {
      errors.push(
        `${name}: ${url} is not a git+https://github.com/${OWNER}/${name}#<commit> pin`,
      );
    }
  }

  for (const name of LIBRARIES_AT_HEAD) {
    if (!commits[name]) continue;
    const head = headCommit(name);
    if (commits[name] !== head) {
      errors.push(
        `${name}: pinned ${commits[name]}, main is ${head}\n  ${fetchHint(name, head)}`,
      );
    }
  }

  if (commits.debriefz) {
    const pinned = parseDependencies(await zonAt("debriefz", commits.debriefz));
    for (const name of LIBRARIES_AT_HEAD) {
      if (!commits[name]) continue;
      const commit = pinnedCommit(pinned[name] ?? "", name);
      if (commit !== commits[name]) {
        errors.push(
          `debriefz@${commits.debriefz} pins ${name} ${commit}, this app ${commits[name]}`,
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
