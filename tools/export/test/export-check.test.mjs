// Each test breaks one thing in a trial copy of spec's own export/ and expects export-check to name
// it. The first test reads the copy untouched, and the last one runs the command.

import { mock, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EXPORT_PART, FILE_TERMS, checkExport, exportCheck } from "../main.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const spec = path.join(here, "..", "..", "..");
const README = "export/README.md";
const MANIFEST_SCHEMA = "export/schemas/manifest.schema.json";
const ACCEPTED = "export/vectors/reading/accepted.yaml";

// A copy of spec's export/ under a new folder, with each [file, from, to] edit applied: from null
// writes the file anew with to, to null deletes it.
function trialCopy(edits) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "export-check-"));
  fs.cpSync(path.join(spec, "export"), path.join(root, "export"), { recursive: true });
  for (const [file, from, to] of edits) {
    const target = path.join(root, file);
    if (to === null) fs.rmSync(target, { recursive: true });
    else if (from === null) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, to);
    } else {
      const text = fs.readFileSync(target, "utf8");
      assert.ok(text.includes(from), `${file} has no "${from}"`);
      fs.writeFileSync(target, text.replace(from, () => to));
    }
  }
  return root;
}

function errorsOf(edits = []) {
  const root = trialCopy(edits);
  try {
    return checkExport(root).errors.map((e) => `${e.file}:${e.line}: ${e.message}`);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function expectOnly(edits, pattern) {
  const errors = errorsOf(edits);
  assert.equal(errors.length, 1, `expected one error, got:\n${errors.join("\n")}`);
  assert.match(errors[0], pattern);
}

function expectSome(edits, pattern) {
  const errors = errorsOf(edits);
  assert.ok(errors.some((error) => pattern.test(error)), `no error matches ${pattern}:\n${errors.join("\n")}`);
}

test("spec's own export/ passes, and the stats count what it holds", () => {
  const root = trialCopy([]);
  try {
    const { errors, stats } = checkExport(root);
    assert.deepEqual(errors, []);
    assert.equal(stats.schemas, 6);
    assert.equal(stats.rules, 4);
    assert.ok(stats.examples >= 4 && stats.vectors >= 6 && stats.cases >= 6, JSON.stringify(stats));
    assert.equal(EXPORT_PART.folder, "export");
    assert.deepEqual(FILE_TERMS, ["manifest", "account", "profile", "device"]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a root with no export/ has that one error", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "export-none-"));
  try {
    assert.deepEqual(checkExport(root).errors, [{ file: "export", line: 0, message: "the folder of the format of the export is not there" }]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a file the layout does not know is an error", () => {
  expectOnly([["export/notes.txt", null, "notes\n"]], /^export\/notes\.txt:0: no file of the layout of export\/ \(export\/README\.md, section 3\)$/);
});

test("VERSION is an integer, and the field format of each file's schema names it", () => {
  expectSome([["export/VERSION", null, "01\n"]], /^export\/VERSION:1: the part's version is an integer from 1/);
  expectSome([[MANIFEST_SCHEMA, '"const": 2,', '"const": 3,']], /^export\/schemas\/manifest\.schema\.json:\d+: the field format is the const 2, the version in export\/VERSION$/);
  expectSome([["export/schemas/device.schema.json", null, null]], /^export\/schemas:0: no device\.schema\.json, which the text names$/);
});

test("the rules of the text are the rules reading.mjs knows, in its order", () => {
  const row = fs.readFileSync(path.join(spec, README), "utf8").split("\n").find((line) => line.startsWith("| `export.proto` |")) + "\n";
  expectOnly([[README, row, ""]], /^export\/README\.md:0: export\.proto: a rule export-check knows, and the text lists it not$/);
});

test("an example passes its schema or names the error it gives, and needs its schema", () => {
  expectSome([["export/examples/manifest/invalid/format-three.yaml", "# error: const at #/format", "# error: enum at #/scope"]], /format-three\.yaml/);
  expectOnly([["export/examples/other/valid/case.yaml", null, "a: 1\n"]], /^export\/examples\/other\/valid\/case\.yaml:0: an example of other, which has no schema in export\/schemas$/);
});

test("a vector of reading passes its schema, its files are a map, and each case gives what section 5 computes", () => {
  expectSome([[ACCEPTED, "cases:", "cases: 1\nother:"]], /accepted\.yaml:0: does not pass the schema of a vector of reading/);
  expectSome([[ACCEPTED, "cases:", "cases:\ncases:"]], /accepted\.yaml:\d+: yaml\.unique-keys/);
  expectOnly([["export/vectors/reading/listed.yaml", null, "cases:\n  - files: [1]\n    accepted: true\n"]], /^export\/vectors\/reading\/listed\.yaml:0: cases\/0\/files: the files of an export are a map from each file's path to the file$/);
  expectOnly([["export/vectors/reading/wrong.yaml", null, 'cases:\n  - files: {}\n    accepted: true\n']], /^export\/vectors\/reading\/wrong\.yaml:0: cases\/0: the reading gives \{"refused_by":"export\.files","names":\["manifest\.json"\]\}, and the vector \{"accepted":true\}$/);
});

test("the vectors accept an export and refuse one by the schema and by each rule", () => {
  expectOnly([["export/vectors/reading/proto.yaml", null, null]], /^export\/vectors\/reading:0: no vector of reading refuses an export by export\.proto \(export\/README\.md, section 7\)$/);
  expectOnly([["export/vectors/reading/schema.yaml", null, null]], /^export\/vectors\/reading:0: no vector of reading refuses an export by the schema/);
  expectOnly([[ACCEPTED, null, null]], /^export\/vectors\/reading:0: no vector of reading accepts an export/);
});

test("the command prints ok, and the errors of a broken copy", () => {
  const main = path.join(spec, "tools/export/main.mjs");
  const ok = spawnSync(process.execPath, [main], { encoding: "utf8" });
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /^export-check: ok — 6 schemas, 4 rules, \d+ examples, \d+ vectors of reading with \d+ cases\n$/);
  const usage = spawnSync(process.execPath, [main, "extra"], { encoding: "utf8" });
  assert.equal(usage.status, 2);
  assert.match(usage.stderr, /^usage: node tools\/export\/main\.mjs/);
  const root = trialCopy([["export/notes.txt", null, "notes\n"]]);
  const printed = mock.method(console, "error", () => {});
  const logged = mock.method(console, "log", () => {});
  try {
    exportCheck(root);
    assert.equal(process.exitCode, 1);
    assert.deepEqual(printed.mock.calls.map((call) => call.arguments[0]), ["export/notes.txt:0: no file of the layout of export/ (export/README.md, section 3)", "export-check: 1 error"]);
    process.exitCode = 0;
    fs.rmSync(path.join(root, "export/notes.txt"));
    exportCheck(root);
    assert.match(logged.mock.calls.at(-1).arguments[0], /^export-check: ok — /);
  } finally {
    printed.mock.restore();
    logged.mock.restore();
    process.exitCode = 0;
    fs.rmSync(root, { recursive: true, force: true });
  }
});
