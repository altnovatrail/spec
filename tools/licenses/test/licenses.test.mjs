// Each test checks a made-up lock file, except the last, which checks tools/ itself.

import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { checkLicenses, parse } from "../main.mjs";
import { exceptions as configured } from "../config.mjs";

const main = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "main.mjs");
const allowed = ["MIT", "Apache-2.0"];

// A lock file of the given [path, license] pairs; license undefined leaves the field out.
function lock(entries) {
  const packages = { "": { name: "root" } };
  for (const [where, license] of entries) packages[where] = { version: "1.0.0", ...(license === undefined ? {} : { license }) };
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

test("tools/package-lock.json passes, and the script says so", () => {
  const run = spawnSync(process.execPath, [main], { encoding: "utf8" });
  assert.equal(run.status, 0, run.stdout + run.stderr);
  assert.match(run.stdout, new RegExp(`^licenses-check: ok — \\d+ packages, ${Object.keys(configured).length} exceptions$`, "m"));
});
