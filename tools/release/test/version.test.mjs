// Each test numbers a release from made-up tags; two read the real release.yml, and the last ones
// run release-version in made-up repositories: in one that has spec as its submodule, in one
// whose release workflow it is named, and in a copy of spec. release-refusal's are in
// refusal.test.mjs.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { RELEASE_TAG, newestRelease, nextVersion, readLine, readTags } from "../version.mjs";
import { env, justfile, recipe, root, scratchRepository, writeFile } from "./repository.mjs";

const script = path.join(root, "tools", "release", "version.mjs");
const workflow = path.join(root, ".github", "workflows", "release.yml");

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
  const run = (input) => spawnSync(process.execPath, [script], { input, encoding: "utf8", env });
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

test("RELEASE_LINE from the environment is the line, before spec's own in release.yml", () => {
  const run = (line) => spawnSync(process.execPath, [script], { input: "--\n--\n", encoding: "utf8", env: { ...env, RELEASE_LINE: line } });
  const own = run("7.3");
  assert.equal(own.status, 0, own.stderr);
  assert.equal(own.stdout, "version=v7.3.0\nprevious=\nreleased=\nbehind=\n");
  const empty = run("");
  assert.equal(empty.status, 1);
  assert.match(empty.stderr, /the line '' is not MAJOR\.MINOR/);
});

const lines = (version, previous, released = "", behind = "") =>
  `version=${version}\nprevious=${previous}\nreleased=${released}\nbehind=${behind}\n`;

test("another repository's tags are counted at the commit given, in the line its workflow sets", () => {
  const { dir, git } = scratchRepository("release-version-");
  try {
    git("commit", "--quiet", "--allow-empty", "-m", "first");
    const first = git("rev-parse", "HEAD");
    git("tag", "v1.4.0");
    git("commit", "--quiet", "--allow-empty", "-m", "second");
    const second = git("rev-parse", "HEAD");
    git("commit", "--quiet", "--allow-empty", "-m", "third");

    // As `just -f spec/justfile release-version` runs from the root of a repository with spec in it.
    const run = (args, line = "1.4") => recipe(dir, { justfileFlags: ["-f", justfile], args, line });
    for (const [args, expected] of [
      [[], lines("v1.4.1", "v1.4.0")],
      [[second], lines("v1.4.1", "v1.4.0")],
      [[first], lines("", "v1.4.0", "v1.4.0")],
    ]) {
      const result = run(args);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stdout, expected);
    }
    assert.match(run([first]).stderr, /released already, as v1\.4\.0/);
    assert.notEqual(run(["no-such-commit"]).status, 0);
    // Outside spec, spec's own line is never taken by default.
    const lineless = run([], null);
    assert.notEqual(lineless.status, 0);
    assert.match(lineless.stderr, /is not spec, and neither a workflow nor RELEASE_LINE names its line/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("another repository's line is RELEASE_LINE as the workflow it names sets it at the commit, whatever the shell sets", () => {
  const { dir, git } = scratchRepository("release-version-workflow-");
  try {
    const workflow = ".github/workflows/self-release.yml";
    writeFile(dir, git, workflow, 'env:\n  RELEASE_LINE: "2.1"\n');
    git("commit", "--quiet", "-m", "first");
    git("tag", "v2.1.0");
    git("commit", "--quiet", "--allow-empty", "-m", "second");
    const second = git("rev-parse", "HEAD");
    writeFile(dir, git, workflow, 'env:\n  RELEASE_LINE: "2.2"\n');
    git("commit", "--quiet", "-m", "raise the line");

    const run = (args, line = null) => recipe(dir, { justfileFlags: ["-f", justfile], args, line });
    for (const [args, line, expected] of [
      // A commit made before the line was raised keeps the line of its own workflow.
      [[second, workflow], null, lines("v2.1.1", "v2.1.0")],
      [["HEAD", workflow], null, lines("v2.2.0", "v2.1.0")],
      // A line set in the shell — a release workflow's own env, the tip's — counts only when no
      // workflow is named.
      [[second, workflow], "7.0", lines("v2.1.1", "v2.1.0")],
      [[second], "7.0", lines("v7.0.0", "v2.1.0")],
    ]) {
      const result = run(args, line);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stdout, expected);
    }
    assert.notEqual(run([second, ".github/workflows/no-such.yml"]).status, 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("a commit from before the named workflow existed takes the checked-out file's line", () => {
  const { dir, git } = scratchRepository("release-version-before-");
  try {
    git("commit", "--quiet", "--allow-empty", "-m", "before the workflow");
    const before = git("rev-parse", "HEAD");
    const workflow = ".github/workflows/release.yml";
    writeFile(dir, git, workflow, 'env:\n  RELEASE_LINE: "3.0"\n');
    git("commit", "--quiet", "-m", "the workflow");
    git("tag", "v3.0.0");

    const run = (args) => recipe(dir, { justfileFlags: ["-f", justfile], args });
    // Older than the newest release, it gets none, and its run does not fail for want of a line.
    const older = run([before, workflow]);
    assert.equal(older.status, 0, older.stderr);
    assert.equal(older.stdout, lines("", "v3.0.0", "", "v3.0.0"));
    assert.match(older.stderr, /is not at [0-9a-f]+, which came before it; the line is the checked-out file's/);
    // With the file gone from the checkout too, there is no line to take.
    fs.rmSync(path.join(dir, workflow));
    const gone = run([before, workflow]);
    assert.notEqual(gone.status, 0);
    assert.match(gone.stderr, /is neither at [0-9a-f]+ nor checked out/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("in spec, a commit is numbered in the line its own release.yml sets, whatever is checked out", () => {
  const { dir, git } = scratchRepository("release-version-spec-");
  try {
    // spec as far as the recipe goes: its justfile and the release tools, beside a release.yml.
    for (const file of ["justfile", "tools/shared.mjs", "tools/release/version.mjs", "tools/release/line.mjs"]) {
      fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
      fs.copyFileSync(path.join(root, file), path.join(dir, file));
    }
    const releaseLine = (line) => {
      fs.mkdirSync(path.join(dir, ".github", "workflows"), { recursive: true });
      fs.writeFileSync(path.join(dir, ".github", "workflows", "release.yml"), `env:\n  RELEASE_LINE: "${line}"\n`);
      git("add", "--all");
    };
    releaseLine("1.4");
    git("commit", "--quiet", "-m", "first");
    git("tag", "v1.4.0");
    git("commit", "--quiet", "--allow-empty", "-m", "second");
    const second = git("rev-parse", "HEAD");
    releaseLine("1.5");
    git("commit", "--quiet", "-m", "raise the line");

    // From the copy's root, as `just release-version` runs in spec: a commit made before the line
    // was raised keeps its own line, and a line set in the shell counts for nothing.
    const older = recipe(dir, { args: [second], line: "9.9" });
    assert.equal(older.status, 0, older.stderr);
    assert.equal(older.stdout, lines("v1.4.1", "v1.4.0"));
    const tip = recipe(dir);
    assert.equal(tip.status, 0, tip.stderr);
    assert.equal(tip.stdout, lines("v1.5.0", "v1.4.0"));
    // A workflow is named by another repository; in spec it is refused, not ignored.
    const named = recipe(dir, { args: [second, ".github/workflows/release.yml"] });
    assert.notEqual(named.status, 0);
    assert.match(named.stderr, /in spec the line is its own release\.yml's/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

