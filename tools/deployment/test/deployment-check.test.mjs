// Each test breaks one thing in a trial copy of spec's own deployment/ and expects deployment-check
// to name it. The first test reads the copy untouched, and the last one runs the command.

import { mock, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEPLOYMENT_PART, checkDeployment, deploymentCheck } from "../main.mjs";
import { ADMISSION_PART } from "../../admission/main.mjs";
import { FORMAT_PART } from "../../format-check/schemas.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const spec = path.join(here, "..", "..", "..");
const FILE_SCHEMA = "deployment/schemas/deployment.schema.json";
const VECTOR_SCHEMA = "deployment/schemas/reading-vector.schema.json";
const README = "deployment/README.md";
const ACCEPTED = "deployment/vectors/reading/accepted.yaml";
const LOOPBACK = "deployment/vectors/reading/loopback.yaml";

// A copy of spec's deployment/ with each [file, from, to] edit applied: from null writes the file
// anew with to, to null deletes it.
function trialCopy(edits) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "deployment-check-"));
  fs.cpSync(path.join(spec, "deployment"), path.join(root, "deployment"), { recursive: true });
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
    return checkDeployment(root).errors.map((e) => `${e.file}:${e.line}: ${e.message}`);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function expectOnly(edits, pattern) {
  const errors = errorsOf(edits);
  assert.equal(errors.length, 1, `expected one error, got:\n${errors.join("\n")}`);
  assert.match(errors[0], pattern);
}

// One of the errors matches pattern: a vector the reading cannot count leaves an outcome with no
// vector too.
function expectSome(edits, pattern) {
  const errors = errorsOf(edits);
  assert.ok(errors.some((error) => pattern.test(error)), `no error matches ${pattern}:\n${errors.join("\n")}`);
}

// The line of the text that holds the rule's row.
const ruleLine = (rule) => fs.readFileSync(path.join(spec, README), "utf8").split("\n").findIndex((line) => line.startsWith(`| \`${rule}\` |`)) + 1;

test("spec's own deployment/ passes, and the stats count what it holds", () => {
  const root = trialCopy([]);
  try {
    const { errors, stats } = checkDeployment(root);
    assert.deepEqual(errors, []);
    assert.equal(stats.schemas, 2);
    assert.equal(stats.rules, 2);
    assert.ok(stats.examples >= 2 && stats.vectors >= 4 && stats.cases >= 4);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a root with no deployment/ has that one error", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "deployment-check-"));
  try {
    assert.deepEqual(checkDeployment(root).errors, [{ file: "deployment", line: 0, message: "the deployment configuration's folder is not there" }]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a file the layout does not know is an error, and so is a case not in kebab-case", () => {
  expectOnly([["deployment/notes.txt", null, "notes\n"]], /^deployment\/notes\.txt:0: no file of the layout of deployment\/ \(deployment\/README\.md, section 3\)$/);
  expectOnly([["deployment/vectors/reading/Accepted.yaml", null, "cases: []\n"]], /^deployment\/vectors\/reading\/Accepted\.yaml:0: no file of the layout/);
  expectOnly([["deployment/vectors/rules/case.yaml", null, "cases: []\n"]], /^deployment\/vectors\/rules\/case\.yaml:0: no file of the layout/);
  expectOnly([["deployment/examples/deployment/broken/case.yaml", null, "a: b\n"]], /no file of the layout/);
});

test("VERSION is an integer and a newline, and the $id of each schema and the field format name it", () => {
  const zero = errorsOf([["deployment/VERSION", "1\n", "01\n"]]);
  assert.ok(zero.includes("deployment/VERSION:1: the format's version is an integer from 1 and a newline, with no leading zero"), zero.join("\n"));
  const decimal = errorsOf([["deployment/VERSION", "1\n", "1.0\n"]]);
  assert.ok(decimal.includes("deployment/VERSION:1: the format's version is an integer from 1 and a newline, with no leading zero"), decimal.join("\n"));
  const two = errorsOf([["deployment/VERSION", "1\n", "2\n"]]);
  assert.deepEqual(two, [
    `${FILE_SCHEMA}:3: $id is https://altnovatrail.github.io/spec/deployment/2/deployment.schema.json: the prefix, the version in deployment/VERSION and the file's name`,
    `${FILE_SCHEMA}:9: the field format is the const 2, the version in deployment/VERSION`,
    `${VECTOR_SCHEMA}:3: $id is https://altnovatrail.github.io/spec/deployment/2/reading-vector.schema.json: the prefix, the version in deployment/VERSION and the file's name`,
  ]);
  const missing = errorsOf([["deployment/VERSION", "", null]]);
  assert.ok(missing.includes("deployment/VERSION:0: no VERSION: the format's version, an integer and a newline"), missing.join("\n"));
});

test("a schema follows the conventions of the format's, and marks nothing x-open", () => {
  expectOnly([[FILE_SCHEMA, '"description": "The ID of the Firebase project."', '"description": "The ID of the Firebase project.", "x-open": true']], /x-open: deployment\/ has no open view/);
  expectOnly([[FILE_SCHEMA, '"$ref": "#/$defs/sign_in"', '"$ref": "sign-in.schema.json"']], /no schema sign-in\.schema\.json in deployment\/schemas\//);
  expectOnly([[VECTOR_SCHEMA, "", null]], /^deployment\/schemas:0: no reading-vector\.schema\.json, which the text names/);
});

test("the fields of the file are in camelCase, and the fields of a vector and every $defs in snake_case", () => {
  assert.deepEqual(DEPLOYMENT_PART.camelCase, ["deployment.schema.json"]);
  // The format and the admission table name no schema whose fields are in camelCase.
  assert.equal(FORMAT_PART.camelCase, undefined);
  assert.equal(ADMISSION_PART.camelCase, undefined);
  expectOnly([[FILE_SCHEMA, '"projectId": {', '"project_id": {']], /^deployment\/schemas\/deployment\.schema\.json:\d+: project_id: a name in camelCase, as deployment\/ names the fields of deployment\.schema\.json$/);
  expectOnly([[FILE_SCHEMA, '"projectId": {', '"ProjectId": {']], /ProjectId: a name in camelCase/);
  expectSome([[FILE_SCHEMA, '"sign_in": {', '"signIn": {']], /^deployment\/schemas\/deployment\.schema\.json:\d+: signIn: a name in snake_case$/);
  expectOnly([[VECTOR_SCHEMA, '"origin": {', '"appOrigin": {']], /^deployment\/schemas\/reading-vector\.schema\.json:\d+: appOrigin: a name in snake_case$/);
});

test("the rules of the text are the rules reading.mjs knows, in its order", () => {
  const apiOrigin = "| `deployment.api-origin` |";
  const loopback = "| `deployment.loopback` |";
  const errors = errorsOf([[README, loopback, "| `deployment.known-host` |"]]);
  assert.deepEqual(errors, [`${README}:0: deployment.loopback: a rule deployment-check knows, and the text lists it not`, `${README}:${ruleLine("deployment.loopback")}: deployment.known-host: no rule deployment-check knows`]);
  const text = fs.readFileSync(path.join(spec, README), "utf8");
  const rows = text.split("\n").filter((line) => line.startsWith(apiOrigin) || line.startsWith(loopback));
  const swapped = errorsOf([[README, `${rows[0]}\n${rows[1]}`, `${rows[1]}\n${rows[0]}`]]);
  assert.deepEqual(swapped, [`${README}:${ruleLine("deployment.api-origin")}: the rules stand in the order reading.mjs reads them, deployment.api-origin, deployment.loopback`]);
  const at = ruleLine("deployment.loopback");
  assert.deepEqual(errorsOf([[README, loopback, `${loopback} A rule. |\n| \`Loopback\` | A row. |\n${loopback}`]]), [`${README}:${at + 1}: "Loopback": a rule's ID is <part>.<name>, each in kebab-case`, `${README}:${at + 2}: the rule deployment.loopback again, after line ${at}`]);
  expectOnly([[README, "", null]], /^deployment\/README\.md:0: no text$/);
});

test("an example passes its schema or names the error it gives", () => {
  expectOnly([["deployment/examples/deployment/invalid/format-two.yaml", "# error: const at #/format", "# error: type at #/format"]], /format-two\.yaml:1: gives no type at #\/format; it gives const/);
  expectOnly([["deployment/examples/deployment/valid/platform.yaml", "api: https://api.example.org", "api: https://api.example.org/"]], /platform\.yaml:0: does not pass its schema: pattern at #\/api/);
  expectOnly([["deployment/examples/rollout/valid/case.yaml", null, "a: b\n"]], /^deployment\/examples\/rollout\/valid\/case\.yaml:0: an example of rollout, which has no schema in deployment\/schemas$/);
  expectOnly([["deployment/examples/deployment/valid/platform.yaml", "signIn:", "signIn: &s"]], /platform\.yaml:\d+: yaml\.no-anchors/);
});

test("a vector of reading passes its schema, and each case gives what section 5 computes", () => {
  expectOnly([[LOOPBACK, "    refused_by: deployment.loopback\n    fields: [api]\n  - origin: http://app.example.org", "    refused_by: deployment.api-origin\n    fields: [api]\n  - origin: http://app.example.org"]], /^deployment\/vectors\/reading\/loopback\.yaml:0: cases\/0: the reading gives \{"refused_by":"deployment\.loopback","fields":\["api"\]\}, and the vector \{"refused_by":"deployment\.api-origin","fields":\["api"\]\}$/);
  expectOnly([["deployment/vectors/reading/schema.yaml", "fields: [api, format]", "fields: [format, api]"]], /schema\.yaml:0: cases\/2: the reading gives .*"fields":\["api","format"\].*, and the vector .*"fields":\["format","api"\]/);
  const unpaired = errorsOf([["deployment/vectors/reading/schema.yaml", "    refused_by: schema\n    fields: [signIn]", "    refused_by: schema"]]);
  assert.ok(unpaired.includes("deployment/vectors/reading/schema.yaml:0: does not pass the schema of a vector of reading: dependentRequired at #/cases/1: must have property fields when property refused_by is present"), unpaired.join("\n"));
  expectSome([[ACCEPTED, "  - origin: http://localhost:5173", "  - origin: http://localhost:5173/"]], /accepted\.yaml:0: does not pass the schema of a vector of reading: pattern at #\/cases\/1\/origin/);
  expectSome([[ACCEPTED, "  - origin: http://localhost:5173", "  - origin: http://LOCALHOST:5173"]], /accepted\.yaml:0: does not pass the schema/);
  expectOnly([[ACCEPTED, "  - origin: http://localhost:5173", "  - origin: http://localhost:80"]], /^deployment\/vectors\/reading\/accepted\.yaml:0: cases\/1\/origin: http:\/\/localhost:80 is not written as its origin is, http:\/\/localhost$/);
  expectOnly([[ACCEPTED, "  - origin: http://localhost:5173", "  - origin: http://[::1"]], /cases\/1\/origin: http:\/\/\[::1 is not written as its origin is, which it has not/);
  expectSome([[ACCEPTED, "cases:", "cases: !!seq"]], /accepted\.yaml:\d+: yaml\.no-tags/);
  expectSome([[ACCEPTED, "cases:", "cases: ["]], /accepted\.yaml:\d+: not YAML/);
});

test("the vectors accept a file and refuse one by the schema and by each rule", () => {
  assert.deepEqual(errorsOf([[LOOPBACK, "", null]]), ["deployment/vectors/reading:0: no vector of reading refuses a file by deployment.loopback (deployment/README.md, section 7)"]);
  assert.deepEqual(
    errorsOf([
      [ACCEPTED, "", null],
      ["deployment/vectors/reading/api-origin.yaml", "", null],
      ["deployment/vectors/reading/schema.yaml", "", null],
    ]),
    [
      "deployment/vectors/reading:0: no vector of reading accepts a file (deployment/README.md, section 7)",
      "deployment/vectors/reading:0: no vector of reading refuses a file by deployment.api-origin (deployment/README.md, section 7)",
      "deployment/vectors/reading:0: no vector of reading refuses a file by the schema (deployment/README.md, section 7)",
    ],
  );
  // With no schema of a vector, the vectors are read by the YAML rules alone, and nothing is counted.
  assert.deepEqual(errorsOf([[VECTOR_SCHEMA, "", null]]), ["deployment/schemas:0: no reading-vector.schema.json, which the text names"]);
});

test("the command prints ok on spec's own deployment/, and the errors of a broken copy", () => {
  const main = path.join(spec, "tools/deployment/main.mjs");
  const ok = spawnSync(process.execPath, [main], { encoding: "utf8" });
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /^deployment-check: ok — 2 schemas, 2 rules, \d+ examples, \d+ vectors of reading with \d+ cases\n$/);
  const usage = spawnSync(process.execPath, [main, "extra"], { encoding: "utf8" });
  assert.equal(usage.status, 2);
  assert.match(usage.stderr, /^usage: node tools\/deployment\/main\.mjs/);
  // A broken copy prints each error and a count, and sets the exit code.
  const root = trialCopy([["deployment/notes.txt", null, "notes\n"]]);
  const printed = mock.method(console, "error", () => {});
  try {
    deploymentCheck(root);
    assert.equal(process.exitCode, 1);
    assert.deepEqual(
      printed.mock.calls.map((call) => call.arguments[0]),
      ["deployment/notes.txt:0: no file of the layout of deployment/ (deployment/README.md, section 3)", "deployment-check: 1 error"],
    );
  } finally {
    printed.mock.restore();
    process.exitCode = 0;
    fs.rmSync(root, { recursive: true, force: true });
  }
});
