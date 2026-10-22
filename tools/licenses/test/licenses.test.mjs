// Each test checks a made-up lock file, except those that check tools/ itself and those that run
// the recipes for another repository, in a made-up one.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { checkLicenses, parse, readExceptions } from "../main.mjs";
import { allowed as configuredAllowed, exceptions as configured } from "../config.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const main = path.join(here, "..", "main.mjs");
const justfile = path.join(here, "..", "..", "..", "justfile");
const allowed = ["MIT", "Apache-2.0"];

// A lock file of the given [path, license, fields] entries; license undefined leaves the field
// out, and fields — dev, optionalDependencies — go into the entry as they are.
function lock(entries) {
  const packages = { "": { name: "root" } };
  for (const [where, license, fields] of entries) packages[where] = { version: "1.0.0", ...(license === undefined ? {} : { license }), ...fields };
  return { lockfileVersion: 3, packages };
}

function problemsOf(entries, exceptions = {}) {
  return checkLicenses(lock(entries), { allowed, exceptions }).problems;
}

test("allowed licenses pass, nested and scoped packages too", () => {
  assert.deepEqual(problemsOf([["node_modules/a", "MIT"], ["node_modules/@s/b", "Apache-2.0"], ["node_modules/a/node_modules/c", "MIT"]]), []);
});

test("a package outside node_modules goes by its path, or by the name it gives", () => {
  assert.deepEqual(problemsOf([["packages/helper", "GPL-3.0-only"]]), ["packages/helper@1.0.0: GPL-3.0-only is not on the allowed list"]);
  const named = lock([]);
  named.packages["packages/helper"] = { name: "helper", version: "1.0.0", license: "GPL-3.0-only" };
  assert.deepEqual(checkLicenses(named, { allowed, exceptions: {} }).problems, ["helper@1.0.0: GPL-3.0-only is not on the allowed list"]);
});

test("a license off the list is named with the package", () => {
  assert.deepEqual(problemsOf([["node_modules/a/node_modules/gpl", "GPL-3.0-only"]]), ["gpl@1.0.0: GPL-3.0-only is not on the allowed list"]);
});

test("OR needs one allowed license, AND needs all of them", () => {
  assert.deepEqual(problemsOf([["node_modules/a", "(MPL-2.0 OR Apache-2.0)"]]), []);
  assert.deepEqual(problemsOf([["node_modules/a", "(MIT AND MPL-2.0)"]]), ["a@1.0.0: (MIT AND MPL-2.0) is not on the allowed list"]);
  assert.deepEqual(problemsOf([["node_modules/a", "MIT AND (Apache-2.0 OR MPL-2.0)"]]), []);
});

test("identifiers match in any case, operators all upper or all lower case", () => {
  assert.deepEqual(problemsOf([["node_modules/a", "mit"], ["node_modules/b", "(mpl-2.0 or apache-2.0)"]]), []);
  assert.deepEqual(problemsOf([["node_modules/a", "MIT Or Apache-2.0"]]), ["a@1.0.0: MIT Or Apache-2.0: not an SPDX expression"]);
});

test("a license with an exception clause is not the license alone", () => {
  assert.deepEqual(problemsOf([["node_modules/a", "Apache-2.0 WITH LLVM-exception"]]), ["a@1.0.0: Apache-2.0 WITH LLVM-exception is not on the allowed list"]);
});

test("a package with no license is named", () => {
  assert.deepEqual(problemsOf([["node_modules/a", undefined]]), ["a@1.0.0: no license in the lock file"]);
});

test("a malformed expression is named, not accepted", () => {
  assert.deepEqual(problemsOf([["node_modules/a", "(MIT OR"]]), ["a@1.0.0: (MIT OR: not an SPDX expression"]);
  assert.deepEqual(problemsOf([["node_modules/a", "(MIT"]]), ["a@1.0.0: (MIT: an unclosed parenthesis"]);
  assert.deepEqual(problemsOf([["node_modules/a", "MIT Apache-2.0"]]), ["a@1.0.0: MIT Apache-2.0: not an SPDX expression"]);
  assert.throws(() => parse("MIT WITH"), /WITH names no exception/);
});

test("an exception accepts its package only while the lock file says what it expects", () => {
  const exceptions = { elkjs: { license: "EPL-2.0", reason: "a tool" }, khroma: { license: null, reason: "MIT file" } };
  assert.deepEqual(problemsOf([["node_modules/elkjs", "EPL-2.0"], ["node_modules/khroma", undefined]], exceptions), []);
  assert.deepEqual(problemsOf([["node_modules/elkjs", "GPL-3.0-only"], ["node_modules/khroma", "MIT"]], exceptions), [
    "elkjs@1.0.0: the exception expects EPL-2.0, the lock file says GPL-3.0-only",
    "khroma@1.0.0: the exception expects no license, the lock file says MIT",
  ]);
});

test("an exception for a package that is gone is named", () => {
  assert.deepEqual(problemsOf([["node_modules/a", "MIT"]], { elkjs: { license: "EPL-2.0", reason: "a tool" } }), [
    "elkjs: an exception for a package the lock file no longer has",
  ]);
});

// Another repository's lock file, checked as licenses-check-repo checks it.
function repositoryProblemsOf(entries, exceptions) {
  return checkLicenses(lock(entries), { allowed, exceptions, devOnly: true }).problems;
}

const notDev = "the exception takes MPL-2.0 for a tool of development, and the lock file does not mark this package dev";

test("in another repository's lock file, an exception for a license off the list holds only for a package marked dev", () => {
  const exceptions = { lightningcss: { license: "MPL-2.0", reason: "a tool" } };
  assert.deepEqual(repositoryProblemsOf([["node_modules/lightningcss", "MPL-2.0", { dev: true }]], exceptions), []);
  assert.deepEqual(repositoryProblemsOf([["node_modules/lightningcss", "MPL-2.0"]], exceptions), [`lightningcss@1.0.0: ${notDev}`]);
  // devOptional is a dependency of a package that ships, too.
  assert.deepEqual(repositoryProblemsOf([["node_modules/lightningcss", "MPL-2.0", { devOptional: true }]], exceptions), [`lightningcss@1.0.0: ${notDev}`]);
  // spec's own tools/ never ships, and its lock file marks nothing dev.
  assert.deepEqual(problemsOf([["node_modules/lightningcss", "MPL-2.0"]], exceptions), []);
});

test("a tool's exception covers the builds it names in optionalDependencies, when they are dev and under its license, and nothing else", () => {
  const exceptions = { lightningcss: { license: "MPL-2.0", reason: "a tool" } };
  const names = { "lightningcss-linux-x64-gnu": "1.0.0", "lightningcss-darwin-arm64": "1.0.0", helper: "1.0.0" };
  assert.deepEqual(
    repositoryProblemsOf(
      [
        ["node_modules/lightningcss", "MPL-2.0", { dev: true, optionalDependencies: names }],
        ["node_modules/lightningcss-linux-x64-gnu", "MPL-2.0", { dev: true, optional: true }],
        ["node_modules/lightningcss-darwin-arm64", "MPL-2.0", { optional: true }],
        ["node_modules/helper", "GPL-3.0-only", { dev: true }],
        ["node_modules/lightningcss-wasm", "MPL-2.0", { dev: true }],
      ],
      exceptions,
    ),
    [
      "lightningcss-darwin-arm64@1.0.0: MPL-2.0 is not on the allowed list, and lightningcss's exception covers this build only while the lock file marks it dev",
      "helper@1.0.0: GPL-3.0-only is not on the allowed list",
      "lightningcss-wasm@1.0.0: MPL-2.0 is not on the allowed list",
    ],
  );
  // A tool the exception does not hold covers no build either.
  assert.deepEqual(
    repositoryProblemsOf(
      [
        ["node_modules/lightningcss", "MPL-2.0", { optionalDependencies: names }],
        ["node_modules/lightningcss-linux-x64-gnu", "MPL-2.0", { dev: true, optional: true }],
      ],
      exceptions,
    ),
    [`lightningcss@1.0.0: ${notDev}`, "lightningcss-linux-x64-gnu@1.0.0: MPL-2.0 is not on the allowed list"],
  );
});

test("an exception for no license, or for npm's SEE LICENSE IN, corrects the lock file and needs no dev; any other text off the list is a tool's", () => {
  const exceptions = { khroma: { license: null, reason: "its license file is MIT" }, custom: { license: "SEE LICENSE IN LICENSE", reason: "that file is MIT" } };
  assert.deepEqual(repositoryProblemsOf([["node_modules/khroma", undefined], ["node_modules/custom", "SEE LICENSE IN LICENSE"]], exceptions), []);
  // An identifier SPDX does not have, or text that is no expression, takes a license off the list as well.
  const odd = { old: { license: "BSD", reason: "its license file is BSD-3-Clause" }, plain: { license: "Public Domain", reason: "its file is CC0" } };
  assert.deepEqual(repositoryProblemsOf([["node_modules/old", "BSD"], ["node_modules/plain", "Public Domain"]], odd), [
    "old@1.0.0: the exception takes BSD for a tool of development, and the lock file does not mark this package dev",
    "plain@1.0.0: the exception takes Public Domain for a tool of development, and the lock file does not mark this package dev",
  ]);
  assert.deepEqual(repositoryProblemsOf([["node_modules/old", "BSD", { dev: true }], ["node_modules/plain", "Public Domain", { dev: true }]], odd), []);
});

test("tools/package-lock.json passes, and the script says so", () => {
  const run = spawnSync(process.execPath, [main], { encoding: "utf8" });
  assert.equal(run.status, 0, run.stdout + run.stderr);
  assert.match(run.stdout, new RegExp(`^licenses-check: ok — \\d+ packages, ${Object.keys(configured).length} exceptions$`, "m"));
});

test("a lock file of npm 5 or 6, with no packages, is refused rather than read as empty", () => {
  const v1 = { lockfileVersion: 1, dependencies: { a: { version: "1.0.0" } } };
  assert.deepEqual(checkLicenses(v1, { allowed, exceptions: {} }), {
    problems: ["the lock file has no packages, lockfileVersion 1: a lock file of npm 7 or later is read, one of npm 5 or 6 is refused"],
    packages: 0,
  });
  assert.equal(checkLicenses([], { allowed, exceptions: {} }).problems.length, 1);
  assert.equal(checkLicenses({ lockfileVersion: 3, packages: [] }, { allowed, exceptions: {} }).problems.length, 1);
});

test("an entry of packages that is not an object is named, not a crash", () => {
  const broken = lock([["node_modules/a", "MIT"]]);
  broken.packages["node_modules/b"] = null;
  assert.deepEqual(checkLicenses(broken, { allowed, exceptions: {} }).problems, ["node_modules/b: not a package's entry"]);
});

test("a repository's exceptions file: each package's license, or null, and why; nothing else", () => {
  const good = { lightningcss: { license: "MPL-2.0", reason: "a build tool, never shipped: R07 canvas" }, khroma: { license: null, reason: "MIT file" } };
  assert.deepEqual(readExceptions(JSON.stringify(good), "licenses.json"), good);
  for (const bad of ["[]", "null", "{", '{"a": {"license": "MIT"}}', '{"a": {"license": "MIT", "reason": " "}}', '{"a": {"license": "", "reason": "x"}}', '{"a": {"license": "MIT", "reason": "x", "until": "2027"}}', '{"": {"license": "MIT", "reason": "x"}}']) {
    assert.throws(() => readExceptions(bad, "licenses.json"), /^Error: licenses\.json: /, bad);
  }
});

// A repository of its own in a temporary directory, with the given files, and the recipe run in
// it as another repository runs it: `just -f spec/justfile <recipe>` from its root.
function inRepository(files, recipe, args) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "licenses-repo-"));
  try {
    for (const [name, content] of Object.entries(files)) fs.writeFileSync(path.join(root, name), typeof content === "string" ? content : JSON.stringify(content));
    return spawnSync(process.env.JUST ?? "just", ["-f", justfile, recipe, ...args], { cwd: root, encoding: "utf8" });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test("licenses-check-repo checks a repository's lock file, from its root, with its own exceptions", () => {
  const files = {
    "package-lock.json": lock([["node_modules/a", "MIT"], ["node_modules/lightningcss", "MPL-2.0", { dev: true }]]),
    "licenses.json": { lightningcss: { license: "MPL-2.0", reason: "a build tool, never shipped" } },
  };
  const green = inRepository(files, "licenses-check-repo", ["package-lock.json", "licenses.json"]);
  assert.equal(green.status, 0, green.stdout + green.stderr);
  assert.match(green.stdout, /^licenses-check: package-lock\.json: ok — 2 packages, 1 exceptions$/m);

  const red = inRepository(files, "licenses-check-repo", ["package-lock.json"]);
  assert.notEqual(red.status, 0);
  assert.match(red.stdout, /^lightningcss@1\.0\.0: MPL-2\.0 is not on the allowed list$/m);
  assert.match(red.stdout, /^licenses-check: package-lock\.json: 1 problem$/m);

  const shipped = { ...files, "package-lock.json": lock([["node_modules/a", "MIT"], ["node_modules/lightningcss", "MPL-2.0"]]) };
  const notDevRed = inRepository(shipped, "licenses-check-repo", ["package-lock.json", "licenses.json"]);
  assert.notEqual(notDevRed.status, 0);
  assert.match(notDevRed.stdout, new RegExp(`^lightningcss@1\\.0\\.0: ${notDev}$`, "m"));
});

test("licenses-check-repo takes spec's list, not spec's exceptions", () => {
  const red = inRepository({ "package-lock.json": lock([["node_modules/elkjs", "EPL-2.0"], ["node_modules/z", "0BSD"]]) }, "licenses-check-repo", ["package-lock.json"]);
  assert.match(red.stdout, /^elkjs@1\.0\.0: EPL-2\.0 is not on the allowed list$/m);
  assert.doesNotMatch(red.stdout, /^z@/m);
});

test("licenses-check-repo stops on a lock file of npm 5 or 6, a missing file or a malformed exceptions file", () => {
  const v1 = inRepository({ "package-lock.json": { lockfileVersion: 1, dependencies: {} } }, "licenses-check-repo", ["package-lock.json"]);
  assert.notEqual(v1.status, 0);
  assert.match(v1.stdout, /the lock file has no packages, lockfileVersion 1/);
  const missing = inRepository({}, "licenses-check-repo", ["package-lock.json"]);
  assert.match(missing.stderr, /licenses-check: package-lock\.json: cannot be read: ENOENT/);
  const malformed = inRepository({ "package-lock.json": lock([]), "licenses.json": { a: "MIT" } }, "licenses-check-repo", ["package-lock.json", "licenses.json"]);
  assert.match(malformed.stderr, /licenses-check: licenses\.json: "a": an exception is/);
  const notJson = inRepository({ "package-lock.json": "{" }, "licenses-check-repo", ["package-lock.json"]);
  assert.match(notJson.stderr, /licenses-check: package-lock\.json: not JSON: /);
});

test("licenses-check-repo reads files of the repository alone, never outside it", () => {
  for (const outside of ["../package-lock.json", path.join(here, "..", "..", "package-lock.json"), "."]) {
    const refused = inRepository({ "package-lock.json": lock([]) }, "licenses-check-repo", [outside]);
    assert.notEqual(refused.status, 0, `${outside}: ${refused.stdout}`);
    assert.match(refused.stderr, /not a file of the repository the check runs in/);
  }
  const exceptions = inRepository({ "package-lock.json": lock([]) }, "licenses-check-repo", ["package-lock.json", "../licenses.json"]);
  assert.match(exceptions.stderr, /\.\.\/licenses\.json: not a file of the repository/);
});

test("licenses-allowed prints config.mjs's list, one identifier a line, and nothing else on stdout", () => {
  const run = inRepository({}, "licenses-allowed", []);
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stdout, configuredAllowed.map((id) => `${id}\n`).join(""));
  const mixed = spawnSync(process.execPath, [main, "--allowed", "--lock=x"], { encoding: "utf8" });
  assert.equal(mixed.status, 2);
});
