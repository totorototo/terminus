import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parsePin,
  pinnedCommit,
  releaseCompare,
  latestRelease,
} from "./check-pins.mjs";

const A = "a".repeat(40),
  B = "b".repeat(40),
  C = "c".repeat(40),
  D = "d".repeat(40);
const base = "git+https://github.com/totorototo/gpxz";

test("parsePin: commit form, ref form, and the invalid space", () => {
  assert.deepEqual(parsePin(`${base}#${A}`, "gpxz"), { ref: null, commit: A });
  assert.deepEqual(parsePin(`${base}?ref=v0.1.0#${A}`, "gpxz"), {
    ref: "v0.1.0",
    commit: A,
  });
  assert.equal(parsePin(`${base}#v0.1.0`, "gpxz"), null); // a tag alone: not reproducible
  assert.equal(parsePin(`${base}#${A.slice(1)}`, "gpxz"), null); // 39 hex
  assert.equal(parsePin(`${base}#${A}0`, "gpxz"), null); // 41 hex
  assert.equal(parsePin(`${base}?ref=#${A}`, "gpxz"), null); // empty ref
  assert.equal(parsePin(`${base}x#${A}`, "gpxz"), null); // gpxzx, another repo
  assert.equal(
    parsePin(`git+https://github.com/other/gpxz#${A}`, "gpxz"),
    null,
  );
  assert.equal(parsePin("file:///tmp/gpxz.tar.gz", "gpxz"), null);
  assert.equal(pinnedCommit("", "gpxz"), null);
});

test("releaseCompare: numeric, not lexical", () => {
  assert.equal(releaseCompare("v0.10.0", "v0.9.0"), 1);
  assert.equal(releaseCompare("v0.1.0", "v0.1.0"), 0);
  assert.equal(releaseCompare("v1.0.0", "v0.99.99"), 1);
  assert.equal(releaseCompare("v0.1.2", "v0.1.10"), -1);
});

test("latestRelease: the peeled commit of the newest release", () => {
  const out = [
    `${A}\trefs/tags/v0.9.0`,
    `${B}\trefs/tags/v0.9.0^{}`,
    `${C}\trefs/tags/v0.10.0`,
    `${D}\trefs/tags/v0.10.0^{}`,
    `${A}\trefs/tags/v0.11.0-rc.1`,
    `${B}\trefs/tags/v0.11.0-rc.1^{}`,
    `${A}\trefs/tags/v2`,
    `${A}\trefs/tags/nightly`,
    "",
  ].join("\n");
  assert.deepEqual(latestRelease(out), { tag: "v0.10.0", commit: D });
});

test("latestRelease: a lightweight tag is its commit; peeled order doesn't matter", () => {
  assert.deepEqual(latestRelease(`${A}\trefs/tags/v0.1.0\n`), {
    tag: "v0.1.0",
    commit: A,
  });
  const reversed = `${B}\trefs/tags/v0.1.0^{}\n${A}\trefs/tags/v0.1.0`;
  assert.deepEqual(latestRelease(reversed), { tag: "v0.1.0", commit: B });
});

test("latestRelease: no release is null", () => {
  assert.equal(latestRelease(""), null);
  assert.equal(latestRelease(`${A}\trefs/tags/v1.0.0-rc.1`), null);
});
