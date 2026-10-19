// Each test numbers a release from made-up tags; the last two read the real release.yml.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { RELEASE_TAG, newestRelease, nextVersion, readLine, readTags } from "../version.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const script = path.join(here, "..", "version.mjs");
const workflow = path.join(here, "..", "..", "..", ".github", "workflows", "release.yml");

// A commit on top of main: it descends from every tag unless told otherwise.
const next = (line, tags, { merged = tags, releasedHere = [] } = {}) => nextVersion({ line, tags, merged, releasedHere });

test("a line's first release is its .0, whatever was tagged by hand before it", () => {
  assert.deepEqual(next("0.2", ["v0.1.0"]), { version: "v0.2.0", previous: "v0.1.0" });
  assert.deepEqual(next("0.2", []), { version: "v0.2.0", previous: undefined });
});

test("the next release is the line's next patch, and the notes start at the newest release", () => {
  assert.deepEqual(next("0.2", ["v0.1.0", "v0.2.0", "v0.2.1"]), { version: "v0.2.2", previous: "v0.2.1" });
  assert.deepEqual(next("0.2", ["v0.2.10", "v0.2.9"]), { version: "v0.2.11", previous: "v0.2.10" });
});

test("a commit released already gets nothing", () => {
  assert.deepEqual(next("0.2", ["v0.2.0", "v0.2.1"], { releasedHere: ["v0.2.1"] }), { version: "", previous: "v0.2.1", released: "v0.2.1" });
});

test("a commit the newest release does not descend from gets nothing: numbers follow main's history", () => {
  const tags = ["v0.2.0", "v0.2.1"];
  assert.deepEqual(next("0.2", tags, { merged: ["v0.2.0"] }), { version: "", previous: "v0.2.1", behind: "v0.2.1" });
});

test("a tag that is not vMAJOR.MINOR.PATCH is no release", () => {
  assert.deepEqual(next("0.2", ["v0.2.0", "v0.2.1-rc.1", "v0.2.01", "v01.2.3", "version"]), { version: "v0.2.1", previous: "v0.2.0" });
  assert.deepEqual(next("0.2", ["v0.2.0"], { releasedHere: ["v0.2.1-rc.1"] }), { version: "v0.2.1", previous: "v0.2.0" });
  assert.equal(newestRelease(["v0.2.9", "v0.2.10", "v0.3.0-rc.1", "v1.0", ""]), "v0.2.10");
  assert.equal(newestRelease(["v0.2.0-rc.1"]), undefined);
  for (const tag of ["v0.2.0", "v10.20.30"]) assert.match(tag, RELEASE_TAG);
  for (const tag of ["v0.2", "0.2.0", "v0.2.0-rc.1", "v00.2.0", "v0.02.0"]) assert.doesNotMatch(tag, RELEASE_TAG);
});

test("a raised line starts at .0, and a line below the newest release is refused", () => {
  assert.deepEqual(next("0.3", ["v0.2.0", "v0.2.7"]), { version: "v0.3.0", previous: "v0.2.7" });
  assert.deepEqual(next("1.0", ["v0.9.4"]), { version: "v1.0.0", previous: "v0.9.4" });
  assert.throws(() => next("0.2", ["v0.2.3", "v0.3.0"]), /the line 0\.2 is older than the newest release, v0\.3\.0: raise RELEASE_LINE/);
});

test("a malformed line is refused", () => {
  for (const line of ["0", "0.2.0", "v0.2", "01.2", ""]) assert.throws(() => next(line, []), /is not MAJOR\.MINOR/);
});

test("stdin is three lists of tags divided by lines --", () => {
  assert.deepEqual(readTags("v0.1.0\nv0.2.0\n--\nv0.1.0\n--\n\n"), { tags: ["v0.1.0", "v0.2.0"], merged: ["v0.1.0"], releasedHere: [] });
  assert.deepEqual(readTags("--\n--\n"), { tags: [], merged: [], releasedHere: [] });
  assert.throws(() => readTags("v0.1.0\n--\n"), /2 lists of tags, not 3/);
});

test("RELEASE_LINE is read once from release.yml, quoted or not, with a comment or not", () => {
  assert.equal(readLine('env:\n  RELEASE_LINE: "1.4"\n'), "1.4");
  assert.equal(readLine("env:\n  RELEASE_LINE: '1.4'\n"), "1.4");
  assert.equal(readLine("env:\n  RELEASE_LINE: 1.4  # the format's new line\n"), "1.4");
  assert.throws(() => readLine("env: {}\n"), /0 times, not once/);
  assert.throws(() => readLine('  RELEASE_LINE: "0.2"\n  RELEASE_LINE: "0.3"\n'), /2 times, not once/);
});

test("the real release.yml names a line", () => {
  assert.match(readLine(fs.readFileSync(workflow, "utf8")), /^\d+\.\d+$/);
});

test("the script prints the step's outputs, and says on stderr why there is nothing to release", () => {
  const line = readLine(fs.readFileSync(workflow, "utf8"));
  const run = (input) => spawnSync(process.execPath, [script], { input, encoding: "utf8" });
  const fresh = run("--\n--\n");
  assert.equal(fresh.status, 0, fresh.stderr);
  assert.equal(fresh.stdout, `version=v${line}.0\nprevious=\nreleased=\nbehind=\n`);
  const done = run(`v${line}.0\n--\nv${line}.0\n--\nv${line}.0\n`);
  assert.equal(done.status, 0, done.stderr);
  assert.equal(done.stdout, `version=\nprevious=v${line}.0\nreleased=v${line}.0\nbehind=\n`);
  assert.match(done.stderr, /released already, as v/);
  const behind = run(`v${line}.0\n--\n--\n`);
  assert.equal(behind.stdout, `version=\nprevious=v${line}.0\nreleased=\nbehind=v${line}.0\n`);
  assert.match(behind.stderr, /is not in this commit's history/);
  const broken = run("v0.1.0\n");
  assert.equal(broken.status, 1);
  assert.match(broken.stderr, /^release-version: stdin has 1 list of tags, not 3/);
});
