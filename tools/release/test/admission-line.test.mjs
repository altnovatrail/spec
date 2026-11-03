// A new version of the admission table starts a new line (R96): the rule, the script that
// release-version passes its lines through in spec, and the recipe, in a made-up copy of spec.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { checkAdmissionLine, checked } from "../admission-line.mjs";
import { copySpecTools, env, recipe, releaseLine, root, scratchRepository, writeFile } from "./repository.mjs";

const script = path.join(root, "tools", "release", "admission-line.mjs");

const check = (version, previous, now, then, tableChanged = false) => () => checkAdmissionLine({ version, previous, admissionNow: now, admissionThen: then, tableChanged });

test("a release is held to the table only after a release that carried it", () => {
  assert.equal(checked({ version: "v0.8.1", previous: "v0.8.0" }), true);
  assert.equal(checked({ version: "v0.8.0", previous: "v0.7.9" }), false);
  assert.equal(checked({ version: "", previous: "v0.8.0" }), false);
  assert.equal(checked({ version: "v0.8.0", previous: "" }), false);
});

test("another version of the table needs a raised line, and never goes back", () => {
  assert.doesNotThrow(check("v0.8.3", "v0.8.2", "0.1", "0.1"));
  assert.doesNotThrow(check("v0.9.0", "v0.8.2", "0.1", "0.1"));
  assert.throws(
    check("v0.8.3", "v0.8.2", "0.2", "0.1"),
    /^Error: admission\/VERSION is 0\.2, and at v0\.8\.2 it was 0\.1: a new version of the admission table starts a new line, so raise RELEASE_LINE above 0\.8 in the same change \(R96\)$/,
  );
  assert.doesNotThrow(check("v0.9.0", "v0.8.2", "0.2", "0.1"));
  // The table's major version is no part of spec's.
  assert.doesNotThrow(check("v0.9.0", "v0.8.2", "1.0", "0.3"));
  assert.throws(check("v0.9.0", "v0.8.2", "0.1", "0.2"), /^Error: admission\/VERSION is 0\.1, below 0\.2 at v0\.8\.2: a version of the admission table never goes back/);
  assert.throws(check("v0.9.0", "v0.8.2", "0.9", "1.0"), /below 1\.0 at v0\.8\.2/);
  // Any change of the table is a new version: the same version with another table is refused,
  // in a raised line too, and a new version may come with it.
  assert.throws(check("v0.8.3", "v0.8.2", "0.1", "0.1", true), /^Error: admission\/admission-table\.json changed after v0\.8\.2, and admission\/VERSION is still 0\.1: any change of the admission table is a new version, in a new line \(R96\)$/);
  assert.throws(check("v0.9.0", "v0.8.2", "0.1", "0.1", true), /changed after v0\.8\.2/);
  assert.doesNotThrow(check("v0.9.0", "v0.8.2", "0.2", "0.1", true));
});

test("the script passes the lines through when there is nothing to check, and wants a SHA when there is", () => {
  const run = (input, args) => spawnSync(process.execPath, [script, ...args], { input, encoding: "utf8", env });
  const before = "version=v0.8.0\nprevious=v0.7.9\nreleased=\nbehind=\n";
  const through = run(before, []);
  assert.equal(through.status, 0, through.stderr);
  assert.equal(through.stdout, before);
  const noCommit = run("version=v0.8.1\nprevious=v0.8.0\nreleased=\nbehind=\n", ["HEAD"]);
  assert.equal(noCommit.status, 1);
  assert.match(noCommit.stderr, /^release-version: the commit is 'HEAD', not a SHA/);
  const { dir, git } = scratchRepository("admission-line-script-");
  try {
    git("commit", "--quiet", "--allow-empty", "-m", "one");
    const head = git("rev-parse", "HEAD");
    const missing = spawnSync(process.execPath, [script, head], { cwd: dir, input: "version=v0.8.1\nprevious=v0.8.0\nreleased=\nbehind=\n", encoding: "utf8", env });
    assert.equal(missing.status, 1);
    assert.match(missing.stderr, /^release-version: no admission\/VERSION at /);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

const lines = (version, previous) => `version=${version}\nprevious=${previous}\nreleased=\nbehind=\n`;

test("in spec, release-version refuses a new version of the table in the line of the release before it", () => {
  const { dir, git } = scratchRepository("admission-line-");
  try {
    copySpecTools(dir, git);
    writeFile(dir, git, "format/VERSION", "0.2\n");
    writeFile(dir, git, "admission/VERSION", "0.1\n");
    releaseLine(dir, git, "0.8");
    git("commit", "--quiet", "-m", "the first table");
    git("tag", "v0.8.0");

    // A change of the text alone keeps the version: it is editorial.
    writeFile(dir, git, "admission/README.md", "# The admission table\n");
    git("commit", "--quiet", "-m", "the same version");
    const same = recipe(dir);
    assert.equal(same.status, 0, same.stderr);
    assert.equal(same.stdout, lines("v0.8.1", "v0.8.0"));
    git("tag", "v0.8.1");

    writeFile(dir, git, "admission/admission-table.json", "{}\n");
    git("commit", "--quiet", "-m", "the table, and no new version");
    const unversioned = recipe(dir);
    assert.notEqual(unversioned.status, 0);
    assert.match(unversioned.stderr, /admission\/admission-table\.json changed after v0\.8\.1, and admission\/VERSION is still 0\.1/);

    writeFile(dir, git, "admission/VERSION", "0.2\n");
    git("commit", "--quiet", "-m", "a new version, and no new line");
    const refused = recipe(dir);
    assert.notEqual(refused.status, 0);
    assert.match(refused.stderr, /admission\/VERSION is 0\.2, and at v0\.8\.1 it was 0\.1: a new version of the admission table starts a new line/);
    assert.equal(refused.stdout, "");

    releaseLine(dir, git, "0.9");
    git("commit", "--quiet", "-m", "and its new line");
    const raised = recipe(dir);
    assert.equal(raised.status, 0, raised.stderr);
    assert.equal(raised.stdout, lines("v0.9.0", "v0.8.1"));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
