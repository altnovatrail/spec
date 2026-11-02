// A new major package of an API contract starts a new line (R83): the rule, the script that
// release-version passes its lines through in spec, and the recipe, in a made-up copy of spec.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { checkContractsLine, packagesOf } from "../contracts-line.mjs";
import { copySpecTools, env, recipe, releaseLine, root, scratchRepository, writeFile } from "./repository.mjs";

const script = path.join(root, "tools", "release", "contracts-line.mjs");

const check = (version, previous, now, then) => () =>
  checkContractsLine({ version, previous, packagesNow: new Set(now), packagesThen: new Set(then) });

test("the packages of a commit are the folders of its contracts", () => {
  const packages = packagesOf([
    "contracts/README.md",
    "contracts/novatrail/observation/v1/observation.proto",
    "contracts/novatrail/observation/v1/observation.pb.go",
    "contracts/novatrail/observation/v2/observation.proto",
    "contracts/novatrail/learner_model/v1/progress.proto",
    "contracts/novatrail/learner_model/v1/sub/other.proto",
    "contracts/novatrail/trial/v0/trial.proto",
    "",
  ]);
  assert.deepEqual([...packages].sort(), ["novatrail.learner_model.v1", "novatrail.observation.v1", "novatrail.observation.v2"]);
});

test("a new major package needs a raised line, and a first v1 does not", () => {
  const v1 = ["novatrail.observation.v1"];
  assert.doesNotThrow(check("v0.7.3", "v0.7.2", v1, []));
  assert.doesNotThrow(check("v0.7.3", "v0.7.2", [...v1, "novatrail.app.v1"], v1));
  assert.throws(
    check("v0.7.3", "v0.7.2", [...v1, "novatrail.observation.v2"], v1),
    /^Error: novatrail\.observation\.v2 came after v0\.7\.2: a new major package of a contract starts a new line, so raise RELEASE_LINE above 0\.7 in the same change \(R83, R44\)$/,
  );
  assert.doesNotThrow(check("v0.8.0", "v0.7.2", [...v1, "novatrail.observation.v2"], v1));
  // A package that was there before opens nothing, and one that goes opens nothing either.
  assert.doesNotThrow(check("v0.8.1", "v0.8.0", ["novatrail.observation.v2"], [...v1, "novatrail.observation.v2"]));
  assert.throws(check("v0.8.1", "v0.8.0", ["novatrail.a.v2", "novatrail.b.v3"], []), /^Error: novatrail\.a\.v2 and novatrail\.b\.v3 came after v0\.8\.0/);
});

test("the script passes the lines through when there is nothing to check, and wants a SHA when there is", () => {
  const run = (input, args) => spawnSync(process.execPath, [script, ...args], { input, encoding: "utf8", env });
  const unreleased = "version=\nprevious=v0.7.2\nreleased=v0.7.2\nbehind=\n";
  const through = run(unreleased, []);
  assert.equal(through.status, 0, through.stderr);
  assert.equal(through.stdout, unreleased);
  const noCommit = run("version=v0.7.3\nprevious=v0.7.2\nreleased=\nbehind=\n", ["HEAD"]);
  assert.equal(noCommit.status, 1);
  assert.match(noCommit.stderr, /^release-version: the commit is 'HEAD', not a SHA/);
  const { dir, git } = scratchRepository("contracts-line-script-");
  try {
    git("commit", "--quiet", "--allow-empty", "-m", "one");
    const head = git("rev-parse", "HEAD");
    const missing = spawnSync(process.execPath, [script, head], { cwd: dir, input: "version=v0.7.3\nprevious=v0.7.2\nreleased=\nbehind=\n", encoding: "utf8", env });
    assert.equal(missing.status, 1);
    assert.match(missing.stderr, /^release-version: git cannot list contracts\/ at v0\.7\.2/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

const lines = (version, previous) => `version=${version}\nprevious=${previous}\nreleased=\nbehind=\n`;

test("in spec, release-version refuses a new major package in the line of the release before it", () => {
  const { dir, git } = scratchRepository("contracts-line-");
  try {
    copySpecTools(dir, git);
    writeFile(dir, git, "format/VERSION", "0.1\n");
    writeFile(dir, git, "contracts/novatrail/observation/v1/observation.proto", "syntax = \"proto3\";\n");
    releaseLine(dir, git, "0.7");
    git("commit", "--quiet", "-m", "the first package");
    git("tag", "v0.7.0");

    writeFile(dir, git, "contracts/novatrail/app/v1/app.proto", "syntax = \"proto3\";\n");
    git("commit", "--quiet", "-m", "the first package of another part");
    const first = recipe(dir);
    assert.equal(first.status, 0, first.stderr);
    assert.equal(first.stdout, lines("v0.7.1", "v0.7.0"));
    git("tag", "v0.7.1");

    writeFile(dir, git, "contracts/novatrail/observation/v2/observation.proto", "syntax = \"proto3\";\n");
    git("commit", "--quiet", "-m", "a new major package, and no new line");
    const refused = recipe(dir);
    assert.notEqual(refused.status, 0);
    assert.match(refused.stderr, /novatrail\.observation\.v2 came after v0\.7\.1: a new major package of a contract starts a new line/);
    assert.equal(refused.stdout, "");

    releaseLine(dir, git, "0.8");
    git("commit", "--quiet", "-m", "and its new line");
    const raised = recipe(dir);
    assert.equal(raised.status, 0, raised.stderr);
    assert.equal(raised.stdout, lines("v0.8.0", "v0.7.1"));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
