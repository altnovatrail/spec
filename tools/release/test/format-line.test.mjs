// A new version of the module format starts a new line (R44): the rules, the script that
// release-version passes its lines through in spec, and the recipe, in made-up copies of spec
// and in another repository, which the rule does not reach.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { checkFormatLine, checked, lineOf, readOutputs } from "../format-line.mjs";
import { copySpecTools, env, justfile, recipe, releaseLine, root, scratchRepository, writeFile } from "./repository.mjs";

const script = path.join(root, "tools", "release", "format-line.mjs");

const check = (version, previous, formatNow, formatThen) => () => checkFormatLine({ version, previous, formatNow, formatThen });

test("the same version of the format passes, in the same line or a raised one", () => {
  assert.doesNotThrow(check("v0.3.5", "v0.3.4", "0.1", "0.1"));
  assert.doesNotThrow(check("v0.4.0", "v0.3.4", "0.1", "0.1"));
  assert.doesNotThrow(check("v1.2.0", "v1.1.9", "1.3", "1.3"));
});

test("another version of the format needs a raised line", () => {
  assert.throws(check("v0.3.5", "v0.3.4", "0.2", "0.1"), /a new version of the format starts a new line, so raise RELEASE_LINE above 0\.3/);
  assert.doesNotThrow(check("v0.4.0", "v0.3.4", "0.2", "0.1"));
  assert.doesNotThrow(check("v0.6.0", "v0.3.4", "0.2", "0.1"));
});

test("the version of the format never goes back", () => {
  assert.throws(check("v0.4.0", "v0.3.4", "0.1", "0.2"), /below 0\.2 at v0\.3\.4: a version of the format never goes back/);
  assert.throws(check("v2.0.0", "v1.4.0", "1.0", "1.3"), /never goes back/);
  // In the same line too: raising it would not help, and the refusal says so at once.
  assert.throws(check("v0.4.5", "v0.4.4", "0.1", "0.2"), /never goes back/);
});

test("a new major version of the format raises spec's major version, and spec stays 0.x while the format is v0", () => {
  assert.throws(check("v0.9.0", "v0.8.3", "1.0", "0.7"), /a new major version, and v0\.9\.0 keeps spec's major version/);
  assert.doesNotThrow(check("v1.0.0", "v0.8.3", "1.0", "0.7"));
  assert.throws(check("v2.1.0", "v2.0.4", "3.0", "2.5"), /a major version of the format raises spec's/);
  assert.throws(check("v1.0.0", "v0.8.3", "0.8", "0.7"), /spec stays 0\.x while the format is v0/);
  assert.throws(check("v1.0.1", "v1.0.0", "0.7", "0.7"), /spec stays 0\.x/);
});

test("only a commit that gets a release, after a release that carried the format as files, is checked", () => {
  assert.equal(checked({ version: "v0.3.0", previous: "v0.2.46" }), false);
  assert.equal(checked({ version: "v0.3.1", previous: "v0.3.0" }), true);
  assert.equal(checked({ version: "", previous: "v0.4.0" }), false);
  assert.equal(checked({ version: "v0.3.0", previous: "" }), false);
  assert.equal(lineOf("v0.10.2"), "0.10");
  assert.throws(() => lineOf("v0.3"), /no release tag/);
  assert.deepEqual(readOutputs("version=v0.3.1\nprevious=v0.3.0\nreleased=\nbehind=\n"), { version: "v0.3.1", previous: "v0.3.0", released: "", behind: "" });
});

test("the script passes the lines through when there is nothing to check, and wants a SHA when there is", () => {
  const run = (input, args) => spawnSync(process.execPath, [script, ...args], { input, encoding: "utf8", env });
  const unchecked = "version=v0.3.0\nprevious=v0.2.46\nreleased=\nbehind=\n";
  const through = run(unchecked, []);
  assert.equal(through.status, 0, through.stderr);
  assert.equal(through.stdout, unchecked);
  const noCommit = run("version=v0.3.1\nprevious=v0.3.0\nreleased=\nbehind=\n", ["HEAD"]);
  assert.equal(noCommit.status, 1);
  assert.match(noCommit.stderr, /^release-version: the commit is 'HEAD', not a SHA/);
});

test("the script reads format/VERSION at the commit and at the release before it, by git where it runs", () => {
  const { dir, git } = scratchRepository("format-line-script-");
  try {
    git("commit", "--quiet", "--allow-empty", "-m", "before the format had a version");
    git("tag", "v0.3.0");
    writeFile(dir, git, "format/VERSION", "0.2\n");
    git("commit", "--quiet", "-m", "a version");
    git("tag", "v0.3.1");
    const head = git("rev-parse", "HEAD");
    const run = (input) => spawnSync(process.execPath, [script, head], { cwd: dir, input, encoding: "utf8", env });
    const missing = run("version=v0.3.2\nprevious=v0.3.0\nreleased=\nbehind=\n");
    assert.equal(missing.status, 1);
    assert.match(missing.stderr, /^release-version: no format\/VERSION at v0\.3\.0/);
    const same = run("version=v0.3.2\nprevious=v0.3.1\nreleased=\nbehind=\n");
    assert.equal(same.status, 0, same.stderr);
    assert.equal(same.stdout, "version=v0.3.2\nprevious=v0.3.1\nreleased=\nbehind=\n");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

const lines = (version, previous, released = "", behind = "") =>
  `version=${version}\nprevious=${previous}\nreleased=${released}\nbehind=${behind}\n`;

test("in spec, release-version refuses a new version of the format in the line of the release before it", () => {
  const { dir, git } = scratchRepository("format-line-");
  try {
    copySpecTools(dir, git);
    writeFile(dir, git, "format/VERSION", "0.1\n");
    releaseLine(dir, git, "0.2");
    git("commit", "--quiet", "-m", "a draft of 0.1");
    git("tag", "v0.2.9");
    releaseLine(dir, git, "0.3");
    git("commit", "--quiet", "-m", "0.1 comes out");
    // The first release of the line 0.3 is held to nothing: the one before it carried a draft.
    const first = recipe(dir);
    assert.equal(first.status, 0, first.stderr);
    assert.equal(first.stdout, lines("v0.3.0", "v0.2.9"));
    git("tag", "v0.3.0");
    const released = git("rev-parse", "HEAD");

    writeFile(dir, git, "format/VERSION", "0.2\n");
    git("commit", "--quiet", "-m", "a new version of the format, and no new line");
    const refused = recipe(dir);
    assert.notEqual(refused.status, 0);
    assert.match(refused.stderr, /format\/VERSION is 0\.2, and at v0\.3\.0 it was 0\.1: a new version of the format starts a new line/);
    assert.equal(refused.stdout, "");

    releaseLine(dir, git, "0.4");
    git("commit", "--quiet", "-m", "and its new line");
    const raised = recipe(dir);
    assert.equal(raised.status, 0, raised.stderr);
    assert.equal(raised.stdout, lines("v0.4.0", "v0.3.0"));
    git("tag", "v0.4.0");

    // A commit released already, or behind the newest release, gets no release and no check.
    const again = recipe(dir, { args: [released] });
    assert.equal(again.status, 0, again.stderr);
    assert.equal(again.stdout, lines("", "v0.4.0", "v0.3.0"));
    git("checkout", "--quiet", "-b", "older", released);
    writeFile(dir, git, "format/VERSION", "0.3\n");
    git("commit", "--quiet", "-m", "off main's history");
    const behind = recipe(dir);
    assert.equal(behind.status, 0, behind.stderr);
    assert.equal(behind.stdout, lines("", "v0.4.0", "", "v0.4.0"));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("another repository's format/VERSION is not spec's, and the rule does not reach it", () => {
  const { dir, git } = scratchRepository("format-line-other-");
  try {
    const workflow = ".github/workflows/release.yml";
    writeFile(dir, git, "format/VERSION", "0.1\n");
    writeFile(dir, git, workflow, 'env:\n  RELEASE_LINE: "0.5"\n');
    git("commit", "--quiet", "-m", "first");
    git("tag", "v0.5.0");
    writeFile(dir, git, "format/VERSION", "0.2\n");
    git("commit", "--quiet", "-m", "its own file, of its own meaning");
    const result = recipe(dir, { justfileFlags: ["-f", justfile], args: ["HEAD", workflow] });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, lines("v0.5.1", "v0.5.0"));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
