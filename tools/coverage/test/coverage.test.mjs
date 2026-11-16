// untested.sh in a repository of its own, made up of modules of tools/ and lcov reports of them:
// which modules it finds that no report names, over one report or the reports of several parts;
// and the refusal of coverage-part, the recipe that runs one part of the tests.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { GIT } from "../../shared.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const script = path.join(here, "..", "untested.sh");
const spec = path.join(here, "..", "..", "..");

// A repository with these files committed, and those of `untracked` beside them, not yet added.
function repository(files, untracked = {}) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "untested-")));
  const write = (name, text) => {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), text);
  };
  const git = (...args) => assert.equal(spawnSync(GIT, args, { cwd: root, encoding: "utf8" }).status, 0, `git ${args.join(" ")}`);
  git("init", "--quiet");
  for (const [name, text] of Object.entries(files)) write(name, text);
  git("add", "--all");
  git("-c", "user.name=t", "-c", "user.email=t@example.invalid", "commit", "--quiet", "--message", "files");
  for (const [name, text] of Object.entries(untracked)) write(name, text);
  const untested = (...reports) => spawnSync("/bin/bash", [script, ...reports], { cwd: root, encoding: "utf8" });
  return { root, write, untested, done: () => fs.rmSync(root, { recursive: true, force: true }) };
}

const lcov = (...files) => files.map((file) => `TN:\nSF:${file}\nDA:1,1\nend_of_record\n`).join("");
const MODULES = { "tools/a.mjs": "", "tools/b/c.mjs": "", "tools/b/test/c.test.mjs": "", "tools/b/README.md": "", "other/d.mjs": "" };

test("every module of tools/ but the tests in one report, or across the reports of the parts, passes", () => {
  const r = repository(MODULES);
  try {
    r.write("coverage/lcov.info", lcov("tools/b/c.mjs", "tools/a.mjs"));
    const one = r.untested("coverage/lcov.info");
    assert.equal(one.status, 0, one.stderr);
    r.write("coverage/coverage-1/lcov.info", lcov("tools/a.mjs"));
    r.write("coverage/coverage-2/lcov.info", lcov("tools/b/c.mjs", "tools/a.mjs"));
    const parts = r.untested("coverage/coverage-1/lcov.info", "coverage/coverage-2/lcov.info");
    assert.equal(parts.status, 0, parts.stderr);
  } finally {
    r.done();
  }
});

test("a module that no report names fails, and is named, whether git tracks it yet or not", () => {
  const r = repository(MODULES, { "tools/new.mjs": "" });
  try {
    r.write("coverage/coverage-1/lcov.info", lcov("tools/a.mjs"));
    r.write("coverage/coverage-2/lcov.info", lcov("tools/new.mjs"));
    const missing = r.untested("coverage/coverage-1/lcov.info", "coverage/coverage-2/lcov.info");
    assert.equal(missing.status, 1);
    assert.match(missing.stderr, /no test loads these modules of tools\/, so codecov\/patch would never count their lines:\ntools\/b\/c\.mjs\n$/);
    const one = r.untested("coverage/coverage-1/lcov.info");
    assert.equal(one.status, 1);
    assert.match(one.stderr, /:\ntools\/b\/c\.mjs\ntools\/new\.mjs\n$/);
  } finally {
    r.done();
  }
});

test("no report named, or one that is not there, stops it", () => {
  const r = repository(MODULES);
  try {
    const none = r.untested();
    assert.equal(none.status, 2);
    assert.match(none.stderr, /name the lcov reports/);
    const absent = r.untested("coverage/lcov.info");
    assert.equal(absent.status, 2);
    assert.match(absent.stderr, /coverage\/lcov\.info: no such report/);
  } finally {
    r.done();
  }
});

test("the script keeps its executable bit, in the tree and in git: CI runs it by its path", () => {
  assert.ok(fs.statSync(script).mode & 0o100, "untested.sh is not executable");
  const mode = spawnSync(GIT, ["ls-files", "--stage", "--", "tools/coverage/untested.sh"], { cwd: spec, encoding: "utf8" }).stdout;
  if (mode) assert.match(mode, /^100755 /);
});

test("coverage-part takes a part k of n, whole numbers from 1 with k no more than n, before it runs a test", () => {
  const just = process.env.JUST ?? "just";
  for (const [k, n] of [["0", "3"], ["4", "3"], ["1", "0"], ["a;b", "3"], ["1", "3/1"], ["-1", "3"]]) {
    const refused = spawnSync(just, ["-f", path.join(spec, "justfile"), "coverage-part", k, n], { cwd: spec, encoding: "utf8" });
    assert.equal(refused.status, 2, `${k} of ${n}: ${refused.stderr}`);
    assert.ok(refused.stderr.includes(`not ${k} of ${n}`), refused.stderr);
  }
});
