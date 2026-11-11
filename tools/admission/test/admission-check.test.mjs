// Each test breaks one thing in a trial copy of spec's own admission/ — with the format's common
// schema and the documents the table cites — and expects admission-check to name it. The first test
// reads the copy untouched, and the last ones run the command.

import { mock, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { admissionCheck, checkAdmission } from "../main.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const spec = path.join(here, "..", "..", "..");
const COPIED = ["admission", "format/schemas/common.schema.json", "docs/decisions.md", "docs/product.md", "docs/concepts.md", "docs/privacy.md", "docs/architecture.md", "docs/repositories.md"];
const TABLE = "admission/admission-table.json";
const TABLE_SCHEMA = "admission/schemas/admission-table.schema.json";
const MINIMAL = "admission/examples/admission-table/valid/minimal.yaml";
const FACTS = "admission/vectors/answers/facts.yaml";
const WORDS = "admission/vectors/answers/correct-answer-words.yaml";

// A copy of spec's files with each [file, from, to] edit applied: from null writes the file anew
// with to, to null deletes it.
function trialCopy(edits) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "admission-check-"));
  for (const file of COPIED) fs.cpSync(path.join(spec, file), path.join(root, file), { recursive: true });
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
    return checkAdmission(root).errors.map((e) => `${e.file}:${e.line}: ${e.message}`);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

// Every error matches pattern, and there are count of them.
function expectAll(edits, pattern, count) {
  const errors = errorsOf(edits);
  assert.equal(errors.length, count, `expected ${count} errors, got:\n${errors.join("\n")}`);
  for (const error of errors) assert.match(error, pattern);
}

// The line of the text that holds the rule's row.
const ruleLine = (rule) => fs.readFileSync(path.join(spec, "admission/README.md"), "utf8").split("\n").findIndex((line) => line.startsWith(`| \`${rule}\` |`)) + 1;

function expectOnly(edits, pattern) {
  const errors = errorsOf(edits);
  assert.equal(errors.length, 1, `expected one error, got:\n${errors.join("\n")}`);
  assert.match(errors[0], pattern);
}

const cellOf = (table, provider, route, category) => table.cells.findIndex((c) => c.provider === provider && c.ai_route === route && c.age_category === category);

// An edit of the table as an object, written back as the file is written.
function tableEdit(change) {
  const table = JSON.parse(fs.readFileSync(path.join(spec, TABLE), "utf8"));
  change(table);
  return [TABLE, null, `${JSON.stringify(table, null, 2)}\n`];
}

test("spec's own admission/ passes, and the stats count what it holds", () => {
  const root = trialCopy([]);
  try {
    const { errors, stats } = checkAdmission(root);
    assert.deepEqual(errors, []);
    assert.equal(stats.schemas, 2);
    assert.equal(stats.providers, 3);
    assert.equal(stats.cells, 24);
    assert.equal(stats.capabilities, 28);
    assert.ok(stats.examples >= 2 && stats.ruleVectors >= 4 && stats.cases >= 4);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a root with no admission/ has that one error", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "admission-check-"));
  try {
    assert.deepEqual(checkAdmission(root).errors, [{ file: "admission", line: 0, message: "the admission table's folder is not there" }]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a file the layout does not know is an error, and so is a case not in kebab-case", () => {
  expectOnly([["admission/notes.txt", null, "notes\n"]], /^admission\/notes\.txt:0: no file of the layout/);
  expectOnly([["admission/vectors/answers/Facts.yaml", null, "a: b\n"]], /^admission\/vectors\/answers\/Facts\.yaml:0: no file of the layout/);
  expectOnly([["admission/examples/admission-table/broken/case.yaml", null, "a: b\n"]], /no file of the layout/);
});

test("VERSION is MAJOR.MINOR and a newline, and the $id of each schema names it", () => {
  const errors = errorsOf([["admission/VERSION", "0.3\n", "0.03\n"]]);
  assert.ok(errors.includes("admission/VERSION:1: the table's version is MAJOR.MINOR and a newline, with no leading zeros"), errors.join("\n"));
  expectAll([["admission/VERSION", null, "0.4\n"]], /^admission\/schemas\/(admission-table|answer-vector)\.schema\.json:3: \$id is https:\/\/altnovatrail\.github\.io\/spec\/admission\/0\.4\/[a-z-]+\.schema\.json: the prefix, the version in admission\/VERSION/, 2);
  const missing = errorsOf([["admission/VERSION", "", null]]);
  assert.ok(missing.includes("admission/VERSION:0: no VERSION: the table's version, MAJOR.MINOR and a newline"), missing.join("\n"));
});

test("a schema follows the conventions of the format's, and marks nothing x-open", () => {
  expectOnly([[TABLE_SCHEMA, '"description": "The provider\'s name, as privacy 5.3 names it."', '"description": "The provider\'s name, as privacy 5.3 names it.", "x-open": true']], /x-open: admission\/ has no open view/);
  expectOnly([[TABLE_SCHEMA, '"$ref": "#/$defs/capability_rule"', '"$ref": "rule.schema.json"']], /no schema rule\.schema\.json in admission\/schemas\//);
  expectOnly([["admission/schemas/answer-vector.schema.json", "", null]], /^admission\/schemas:0: no answer-vector\.schema\.json, which the text names/);
});

test("the age categories are the format's", () => {
  expectOnly([[TABLE_SCHEMA, '"from_consent_to_18",\n        "adult"', '"adult",\n        "from_consent_to_18"']], /the age categories are the format's/);
});

test("the table is strict JSON that passes its schema", () => {
  expectOnly([[TABLE, '"providers": {', '"providers": {,']], /^admission\/admission-table\.json:1: not JSON/);
  expectOnly([[TABLE, '"google": {\n      "name": "Google"\n    },', '"google": {\n      "name": "Google"\n    },\n    "google": {\n      "name": "Google"\n    },']], /a key that its object has already/);
  const route = errorsOf([tableEdit((t) => (t.cells[0].ai_route = "platform"))]);
  assert.ok(route.some((error) => /^admission\/admission-table\.json:\d+: does not pass its schema: enum at #\/cells\/0\/ai_route/.test(error)), route.join("\n"));
  assert.equal(new Set(route).size, route.length, "each error once");
  expectOnly([[TABLE, "", null]], /^admission\/admission-table\.json:0: no table/);
});

test("the table breaks no rule of a table", () => {
  expectOnly([tableEdit((t) => t.cells.push({ ...t.cells[0] }))], /admission-table\.unique-cells: a second cell of anthropic, own_key and under_13, after cells\/0/);
  expectOnly([tableEdit((t) => t.capabilities.push({ ...t.capabilities[0] }))], /admission-table\.unique-capabilities: a second rule of handwriting_reading and under_13/);
  expectAll([tableEdit((t) => delete t.providers.google)], /admission-table\.known-providers: google: no provider of providers/, 8);
  expectAll([tableEdit((t) => delete t.facts.minor_safeguards)], /admission-table\.known-facts: minor_safeguards: no fact of the dictionary/, 6);
});

test("the table cites what spec's documents hold", () => {
  expectOnly([tableEdit((t) => (t.cells[cellOf(t, "openai", "own_key", "adult")].terms[0].row = "Open AI"))], /Open AI: no row of the table of privacy 5\.3/);
  expectOnly([tableEdit((t) => (t.cells[0].basis = ["R999"]))], /R999: no such number in its register/);
  expectOnly([tableEdit((t) => (t.cells[0].basis = ["П-999"]))], /П-999: no such number in its register/);
  expectOnly([tableEdit((t) => (t.capabilities[0].basis = ["privacy 5.9"]))], /privacy 5\.9: docs\/privacy\.md has no section 5\.9/);
});

test("an example passes its schema or names the error it gives, and a valid table breaks no rule", () => {
  expectOnly([["admission/examples/admission-table/invalid/no-basis.yaml", "# error: required at #/cells/0", "# error: type at #/cells/0"]], /no-basis\.yaml:1: gives no type at #\/cells\/0; it gives required/);
  expectOnly([[MINIMAL, "    basis: [privacy 5.1, П-3]", "    basis: [privacy 5.1, П-3]\n  - provider: example\n    ai_route: own_key\n    age_category: adult\n    admission: open\n    terms: [{row: OpenAI, read: \"2026-11-03\"}]\n    basis: [privacy 5.2]\n  - provider: example\n    ai_route: own_key\n    age_category: adult\n    admission: closed\n    terms: [{row: OpenAI, read: \"2026-11-03\"}]\n    basis: [П-4]"]], /minimal\.yaml:0: admission-table\.unique-cells/);
  expectOnly([["admission/examples/answer-of/valid/case.yaml", null, "a: b\n"]], /an example of answer-of, which has no schema/);
  expectOnly([[MINIMAL, "providers:", "providers: &a\n  x: z\nother:"]], /minimal\.yaml:\d+: yaml\.no-anchors/);
});

test("a vector of a rule breaks that rule and no other, and each rule of the text has its vectors", () => {
  const vector = "admission/vectors/rules/admission-table.known-facts/fact-not-in-the-dictionary.yaml";
  expectOnly([[vector, "facts: [data_processing_agreement, minimal_retention]", "facts: [data_processing_agreement]"]], /breaks no admission-table\.known-facts/);
  expectOnly([[vector, "  - provider: example\n", "  - provider: other\n"]], /breaks admission-table\.known-providers too/);
  const open = errorsOf([[vector, "admission: open_with_facts", "admission: open"]]);
  assert.ok(open.some((error) => /fact-not-in-the-dictionary\.yaml:0: does not pass the schema of a table: not at #\/cells\/0/.test(error)), open.join("\n"));
  expectOnly([[vector, "basis: [privacy 5.1, П-3]", "basis: [privacy 5.1, П-999]"]], /cells\/0\/basis\/1: П-999: no such number in its register/);
  expectOnly([[vector, "providers:", "providers: !!map"]], /yaml\.no-tags/);
  const removed = errorsOf([["admission/vectors/rules/admission-table.known-facts", "", null]]);
  assert.deepEqual(removed, [`admission/README.md:${ruleLine("admission-table.known-facts")}: admission-table.known-facts has no vectors in admission/vectors/rules/admission-table.known-facts/`]);
  const unknown = errorsOf([["admission/vectors/rules/admission-table.short-names/case.yaml", null, fs.readFileSync(path.join(spec, MINIMAL), "utf8")]]);
  assert.deepEqual(unknown, ["admission/vectors/rules/admission-table.short-names:0: admission-table.short-names: no rule the text lists"]);
});

test("the rules of the text are the rules admission-check knows", () => {
  const errors = errorsOf([["admission/README.md", "| `admission-table.known-facts` | A fact that a cell names MUST be a key of `facts`. |", "| `admission-table.known-names` | A name MUST be known. |"]]);
  const line = ruleLine("admission-table.known-facts");
  assert.ok(errors.includes(`admission/README.md:${line}: admission-table.known-names: no rule admission-check knows`), errors.join("\n"));
  assert.ok(errors.includes(`admission/README.md:${line}: admission-table.known-names has no vectors in admission/vectors/rules/admission-table.known-names/`), errors.join("\n"));
  assert.ok(errors.includes("admission/README.md:0: admission-table.known-facts: a rule admission-check knows, and the text lists it not"), errors.join("\n"));
  assert.ok(errors.includes("admission/vectors/rules/admission-table.known-facts:0: admission-table.known-facts: no rule the text lists"), errors.join("\n"));
  const at = ruleLine("admission-table.known-facts");
  assert.deepEqual(errorsOf([["admission/README.md", "| `admission-table.known-facts` |", "| `admission-table.known-facts` |\n| `Known` | A row. |\n| `admission-table.known-facts` |"]]), [
    `admission/README.md:${at + 1}: "Known": a rule's ID is <part>.<name>, each in kebab-case`,
    `admission/README.md:${at + 2}: the rule admission-table.known-facts again, after line ${at}`,
  ]);
  expectOnly([["admission/README.md", "", null]], /^admission\/README\.md:0: no text/);
});

test("a vector of answers gives the answer section 6 computes", () => {
  expectOnly([[FACTS, "      fact: zero_data_retention\n  # The safeguards", "      fact: minor_safeguards\n  # The safeguards"]], /^admission\/vectors\/answers\/facts\.yaml:0: cases\/2: the answer is .*"fact":"zero_data_retention".*, and the vector gives .*"fact":"minor_safeguards"/);
  // With the other vector of fact_missing gone, the one left breaks a rule, so it gives no answers,
  // and that reason has none.
  assert.deepEqual(errorsOf([[FACTS, "    alpha: {name: Alpha}\n", "    gamma: {name: Gamma}\n"], [WORDS, "", null]]), [
    "admission/vectors/answers:0: no vector of answers gives the refusal fact_missing",
    "admission/vectors/answers/facts.yaml:0: table/cells/0/provider: admission-table.known-providers: alpha: no provider of providers",
  ]);
  const schema = errorsOf([[FACTS, "    answer:\n      admitted: false\n      reason: fact_missing\n      cell: {provider: alpha, ai_route: platform_ai, age_category: under_13}\n      fact: data_processing_agreement", "    answer:\n      admitted: true\n      reason: fact_missing\n      cell: {provider: alpha, ai_route: platform_ai, age_category: under_13}\n      fact: data_processing_agreement"]]);
  assert.ok(schema.includes("admission/vectors/answers/facts.yaml:0: does not pass the schema of a vector of answers: not at #/cases/0/answer: must NOT be valid"), schema.join("\n"));
  expectOnly([[FACTS, '      terms: [{row: OpenAI, read: "2026-11-03"}]', '      terms: [{row: Mistral, read: "2026-11-03"}]']], /table\/cells\/0\/terms\/0\/row: Mistral: no row of the table of privacy 5\.3/);
  expectOnly([["admission/vectors/answers/open-cells.yaml", "table:", "table: &t"]], /open-cells\.yaml:\d+: yaml\.no-anchors/);
});

test("the facts of a case name only providers and facts of its table", () => {
  const errors = errorsOf([[FACTS, "      beta:\n        minor_safeguards: [under_13]", "      gamma:\n        minor_safeguard: [under_13]"]]);
  assert.deepEqual(errors, [
    "admission/vectors/answers/facts.yaml:0: cases/3/facts/gamma/minor_safeguard: no fact of the table's dictionary",
    "admission/vectors/answers/facts.yaml:0: cases/3/facts/gamma: no provider of the table",
  ]);
});

test("the age categories cannot be held to the format's when its common schema cannot be read", () => {
  expectOnly([["format/schemas/common.schema.json", null, "{"]], /admission-table\.schema\.json:0: the age categories cannot be held to the format's: format\/schemas\/common\.schema\.json cannot be read \(.*\); run just format-check/);
});

test("the vectors of answers give an admission and every reason of a refusal", () => {
  const errors = errorsOf([["admission/vectors/answers/closed-cells.yaml", "", null]]);
  assert.deepEqual(errors, ["admission/vectors/answers:0: no vector of answers gives the refusal cell_closed"]);
  const none = errorsOf([
    ["admission/vectors/answers/closed-cells.yaml", "", null],
    ["admission/vectors/answers/capability-first.yaml", "", null],
    ["admission/vectors/answers/facts.yaml", "", null],
    ["admission/vectors/answers/open-cells.yaml", "", null],
    [WORDS, "", null],
  ]);
  assert.deepEqual(none, [
    "admission/vectors/answers:0: no vector of answers gives an admission",
    "admission/vectors/answers:0: no vector of answers gives the refusal capability_closed",
    "admission/vectors/answers:0: no vector of answers gives the refusal cell_closed",
    "admission/vectors/answers:0: no vector of answers gives the refusal fact_missing",
  ]);
});

test("the command prints ok on spec's own admission/, and the errors of a broken copy", () => {
  const main = path.join(spec, "tools/admission/main.mjs");
  const ok = spawnSync(process.execPath, [main], { encoding: "utf8" });
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /^admission-check: ok — 2 schemas; the table: 3 providers, 4 deployment facts, 28 rules of capabilities and 24 cells; /);
  const usage = spawnSync(process.execPath, [main, "extra"], { encoding: "utf8" });
  assert.equal(usage.status, 2);
  assert.match(usage.stderr, /^usage: node tools\/admission\/main\.mjs/);
  // A broken copy prints each error and a count, and sets the exit code.
  const root = trialCopy([["admission/notes.txt", null, "notes\n"]]);
  const printed = mock.method(console, "error", () => {});
  try {
    admissionCheck(root);
    assert.equal(process.exitCode, 1);
    assert.deepEqual(
      printed.mock.calls.map((call) => call.arguments[0]),
      ["admission/notes.txt:0: no file of the layout of admission/ (admission/README.md, section 3)", "admission-check: 1 error"],
    );
  } finally {
    printed.mock.restore();
    process.exitCode = 0;
    fs.rmSync(root, { recursive: true, force: true });
  }
});
