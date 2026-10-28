// Each test breaks one thing in a trial copy of fixtures/base — a small format/ with the layout,
// the conventions, the rule tables and the layout of a module of the real one — and expects
// format-check to name it. The last tests read spec's real format/.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { checkFormat } from "../main.mjs";
import { versionProblem } from "../module.mjs";
import { differenceOf, openViewOf } from "../openview.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const base = path.join(here, "fixtures", "base");
const spec = path.join(here, "..", "..", "..");
const SAMPLE = "format/schemas/sample.schema.json";
const MANIFEST = 'module_format_version: "0.1"\ntitle: A trial module\n';
// The text of the license that every module holds (module.license).
const LICENSE = "A license of the trial modules.\n";
const COMMON = "format/schemas/common.schema.json";

// A copy of the base fixture with each [file, from, to] edit applied: from null writes the file
// anew with to, to null deletes it.
function trialCopy(edits) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "format-check-"));
  fs.cpSync(base, root, { recursive: true });
  for (const [file, from, to] of edits) {
    const target = path.join(root, file);
    if (to === null) {
      fs.rmSync(target, { recursive: true });
    } else if (from === null) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, to);
    } else {
      const text = fs.readFileSync(target, "utf8");
      assert.ok(text.includes(from), `the fixture ${file} has no "${from}"`);
      fs.writeFileSync(target, text.replace(from, () => to));
    }
  }
  return root;
}

// The errors of a trial copy, after change(root) when it is given: for what an edit cannot write, a
// symbolic link or an empty folder.
function errorsOf(edits = [], change = undefined) {
  const root = trialCopy(edits);
  try {
    change?.(root);
    return checkFormat(root).errors.map((e) => `${e.file}:${e.line}: ${e.message}`);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function expectOnly(edits, pattern) {
  const errors = errorsOf(edits);
  assert.equal(errors.length, 1, `expected one error, got:\n${errors.join("\n")}`);
  assert.match(errors[0], pattern);
}

// Every error matches one of the patterns, and every pattern one of the errors.
function expectEach(edits, patterns) {
  expectEachOf(errorsOf(edits), patterns);
}

function expectEachOf(errors, patterns) {
  for (const error of errors) assert.ok(patterns.some((p) => p.test(error)), `unexpected:\n${errors.join("\n")}`);
  for (const pattern of patterns) assert.ok(errors.some((e) => pattern.test(e)), `none matches ${pattern}:\n${errors.join("\n")}`);
}

// An edit of the sample schema as JSON rather than as text.
function sampleSchema(change) {
  const schema = JSON.parse(fs.readFileSync(path.join(base, SAMPLE), "utf8"));
  change(schema);
  return [SAMPLE, null, JSON.stringify(schema, null, 2)];
}

function commonSchema(change) {
  const schema = JSON.parse(fs.readFileSync(path.join(base, COMMON), "utf8"));
  change(schema);
  return [COMMON, null, JSON.stringify(schema, null, 2)];
}

const TASK = "format/schemas/task.schema.json";

function taskSchema(change) {
  const schema = JSON.parse(fs.readFileSync(path.join(base, TASK), "utf8"));
  change(schema);
  return [TASK, null, JSON.stringify(schema, null, 2)];
}

test("the base fixture is green, and its invalid examples pin how ajv names an error", () => {
  const root = trialCopy([]);
  try {
    const { errors, stats } = checkFormat(root);
    assert.deepEqual(errors, []);
    assert.deepEqual(stats, { schemas: 8, examples: 15, vectors: 19, rules: 18, openViews: 1, verdicts: 1, leaks: 1, random: 1, templates: 1, tiers: 0, packages: 0, indexes: 0 });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// The layout.

test("VERSION is MAJOR.MINOR and a newline", () => {
  expectOnly([["format/VERSION", null, "0.1"]], /^format\/VERSION:1: the version is MAJOR\.MINOR/);
  expectOnly([["format/VERSION", null, "v0.1\n"]], /^format\/VERSION:1: /);
  expectOnly([["format/VERSION", null, "0.01\n"]], /^format\/VERSION:1: /);
});

test("a schema's $id follows VERSION, and so does the version each manifest names", () => {
  expectEach(
    [["format/VERSION", null, "0.2\n"]],
    [
      /^format\/schemas\/common\.schema\.json:\d+: \$id is .*\/0\.2\/common\.schema\.json/,
      /^format\/schemas\/manifest\.schema\.json:\d+: \$id is .*\/0\.2\/manifest\.schema\.json/,
      /^format\/schemas\/sample\.schema\.json:\d+: \$id is .*\/0\.2\/sample\.schema\.json/,
      /^format\/schemas\/task\.schema\.json:\d+: \$id is .*\/0\.2\/task\.schema\.json/,
      /^format\/schemas\/verdict-vector\.schema\.json:\d+: \$id is .*\/0\.2\/verdict-vector\.schema\.json/,
      /^format\/schemas\/leak-vector\.schema\.json:\d+: \$id is .*\/0\.2\/leak-vector\.schema\.json/,
      /^format\/schemas\/random-vector\.schema\.json:\d+: \$id is .*\/0\.2\/random-vector\.schema\.json/,
      /^format\/schemas\/template-vector\.schema\.json:\d+: \$id is .*\/0\.2\/template-vector\.schema\.json/,
      /^format\/schemas\/(manifest|sample|verdict-vector|leak-vector|random-vector|template-vector|task)\.schema\.json:0: its examples and vectors go unchecked/,
      /(manifest\.yaml|manifest\/valid\/minimal\.yaml):0: names the format version 0\.1: it names 0\.2, as format\/VERSION has it/,
    ],
  );
});

test("a file outside the layout is named", () => {
  expectOnly([["format/notes.txt", null, "notes\n"]], /^format\/notes\.txt:0: format-check does not know it/);
  expectOnly([["format/vectors/widgets/task.yaml", null, "title: A title\n"]], /^format\/vectors\/widgets:0: format-check does not know it/);
  expectOnly([["format/schemas/Sample.json", null, "{}\n"]], /^format\/schemas\/Sample\.json:0: a schema is <term>\.schema\.json/);
});

test("a case is <case>.yaml, in kebab-case", () => {
  expectOnly([["format/examples/sample/valid/minimal.yml", null, "title: A sample\n"]], /valid\/minimal\.yml:0: a case is <case>\.yaml/);
  expectOnly([["format/examples/sample/valid/Minimal.yaml", null, "title: A sample\n"]], /valid\/Minimal\.yaml:0: a case is <case>\.yaml/);
  expectOnly([["format/examples/sample/other/minimal.yaml", null, "title: A sample\n"]], /sample\/other:0: examples are in valid\/ or invalid\//);
});

test("a case laid out as a module stands where the format has one", () => {
  expectOnly([["format/examples/sample/valid/whole/sample.yaml", null, "title: A sample\n"]], /sample\/valid\/whole:0: a case is <case>\.yaml: an example laid out as a module is in examples\/module\/valid\//);
  expectOnly([["format/examples/module/valid/smallest.yaml", null, MANIFEST]], /module\/valid\/smallest\.yaml:0: an example of a whole module is a folder laid out as a module/);
  expectOnly([["format/examples/module/invalid/no-title/manifest.yaml", null, MANIFEST]], /module\/invalid:0: a whole module has no invalid examples/);
  expectOnly([["format/vectors/rules/module.layout/a-file.yaml", null, MANIFEST]], /module\.layout\/a-file\.yaml:0: a case of a rule of a whole module is a folder laid out as a module/);
  expectOnly([["format/vectors/rules/yaml.no-tags/a-folder/manifest.yaml", null, "title: !!str A title\n"]], /yaml\.no-tags\/a-folder:0: a case of a YAML rule is a file/);
});

// The rules of the text and their vectors.

test("a rule the text lists has test vectors", () => {
  expectOnly([["format/README.md", "| `sample.known-tag` |", "| `sample.other` | Another rule. |\n| `sample.known-tag` |"]], /^format\/README\.md:\d+: sample\.other has no test vectors/);
});

test("a folder of vectors has its rule in the text", () => {
  expectOnly([["format/vectors/rules/sample.unlisted/a-case.yaml", null, "title: A sample\n"]], /^format\/vectors\/rules\/sample\.unlisted:0: format\/README\.md lists no rule sample\.unlisted/);
});

test("a rule listed twice is named", () => {
  expectOnly([["format/README.md", "| `sample.known-tag` |", "| `sample.known-tag` | Again. |\n| `sample.known-tag` |"]], /^format\/README\.md:\d+: the rule sample\.known-tag again/);
});

test("the YAML rules of the text are those format-check checks", () => {
  expectEach(
    [["format/README.md", "| `yaml.no-tags` | The file MUST NOT contain tags. |\n", ""]],
    [/^format\/README\.md:0: format-check checks yaml\.no-tags, and the text does not list it/, /^format\/vectors\/rules\/yaml\.no-tags:0: format\/README\.md lists no rule yaml\.no-tags/],
  );
  expectEach(
    [["format/README.md", "| `yaml.no-tags` |", "| `yaml.no-comments` | The file MUST NOT contain comments. |\n| `yaml.no-tags` |"]],
    [/format-check does not check yaml\.no-comments/, /yaml\.no-comments has no test vectors/],
  );
});

test("the text is there", () => {
  expectOnly([["format/README.md", "", null]], /^format\/README\.md:0: the text of the format is missing/);
});

// Schemas: reading.

test("a schema is JSON, with no key twice", () => {
  expectEach([[SAMPLE, '"title": "Sample",', '"title": "Sample"']], [/^format\/schemas\/sample\.schema\.json:1: not JSON/, /sample\.schema\.json:0: its examples and vectors go unchecked/]);
  expectEach([[SAMPLE, '"title": "Sample",', '"title": "Sample",\n  "title": "Sample again",']], [/sample\.schema\.json:\d+: a key that its object has already/, /sample\.schema\.json:0: its examples and vectors go unchecked/]);
});

test("a schema is in 2020-12 and passes its meta-schema", () => {
  const unchecked = /sample\.schema\.json:0: its examples and vectors go unchecked/;
  expectEach([sampleSchema((s) => (s.$schema = "http://json-schema.org/draft-07/schema#"))], [/sample\.schema\.json:2: \$schema is https:\/\/json-schema\.org\/draft\/2020-12\/schema/, unchecked]);
  expectEach([sampleSchema((s) => (s.properties.count.type = "whole"))], [/sample\.schema\.json:\d+: the 2020-12 meta-schema: \/properties\/count\/type/, unchecked]);
});

test("$id and $schema stand only at the root", () => {
  expectEach([sampleSchema((s) => (s.properties.details.$id = "details.json"))], [/sample\.schema\.json:\d+: \$id stands only at the root/, /go unchecked/]);
});

// Schemas: the conventions of section 5.

const unchecked = /^format\/schemas\/sample\.schema\.json:0: its examples and vectors go unchecked/;
const sampleBreaks = (change, pattern) => expectEach([sampleSchema(change)], [pattern, unchecked]);

test("a reference is relative, in one of three forms", () => {
  sampleBreaks((s) => (s.properties.tags.items.$ref = "https://altnovatrail.github.io/spec/format/0.1/common.schema.json#/$defs/tag"), /a reference is #\/\$defs\/<name>, <file>\.schema\.json or <file>\.schema\.json#\/\$defs\/<name>/);
  sampleBreaks((s) => (s.properties.tags.items.$ref = "../0.1/common.schema.json#/$defs/tag"), /a reference is #\/\$defs/);
  sampleBreaks((s) => (s.properties.tags.items.$ref = "common.schema.json#/properties/tag"), /a reference is #\/\$defs/);
  sampleBreaks((s) => (s.properties.tags.items.$ref = "other.schema.json#/$defs/tag"), /no schema other\.schema\.json in format\/schemas\//);
  sampleBreaks((s) => (s.properties.tags.items.$ref = "common.schema.json#/$defs/label"), /common\.schema\.json defines no label/);
});

test("the root has a title and a description, and every field a description", () => {
  sampleBreaks((s) => delete s.title, /the root has title/);
  sampleBreaks((s) => delete s.properties.count.description, /a field's subschema has a description/);
  sampleBreaks((s) => delete s.properties.weights.additionalProperties.description, /a field's subschema has a description/);
  sampleBreaks((s) => delete s.properties.notes.patternProperties["^[a-z]+$"].description, /a field's subschema has a description/);
});

test("a condition needs no description", () => {
  // title is declared at the root, which always applies, so not may name it with no description.
  assert.deepEqual(errorsOf([sampleSchema((s) => (s.not = { properties: { title: { const: "Untitled" } }, required: ["title"] }))]), []);
});

test("only the format's keywords", () => {
  sampleBreaks((s) => (s.properties.count.nullable = true), /nullable: no keyword of the format/);
  sampleBreaks((s) => (s.definitions = {}), /definitions: no keyword of the format/);
  sampleBreaks((s) => (s.properties.tags.minContains = 1), /minContains: no keyword of the format/);
  sampleBreaks((s) => (s.properties.count["x-hidden"] = true), /x-hidden: the format's one annotation is x-open/);
});

test("x-open is true, in a field's subschema", () => {
  sampleBreaks((s) => (s.properties.count["x-open"] = false), /x-open is true, or absent/);
  sampleBreaks((s) => (s["x-open"] = true), /x-open stands only in a field's subschema/);
  sampleBreaks((s) => (s.properties.tags.items["x-open"] = true), /x-open stands only in a field's subschema/);
});

test("x-open stands nowhere under if, not, contains or propertyNames", () => {
  const nothing = /x-open counts for nothing under if, not, contains or propertyNames/;
  sampleBreaks((s) => (s.if.properties.level["x-open"] = true), nothing);
  sampleBreaks((s) => (s.not = { properties: { title: { const: "Untitled", "x-open": true } } }), nothing);
  sampleBreaks((s) => (s.properties.tags.contains = { properties: { a: { type: "string", description: "A field.", "x-open": true } }, unevaluatedProperties: false }), nothing);
  // A definition that serves only as a condition is a condition.
  sampleBreaks((s) => {
    s.$defs = { high: { properties: { level: { const: "high", "x-open": true } } } };
    s.if = { $ref: "#/$defs/high" };
  }, nothing);
  // One that serves only under contains holds no mark either; one that serves a field too may.
  const probe = { properties: { a: { type: "string", description: "A field.", "x-open": true } } };
  const underContains = (s) => {
    s.$defs = { probe };
    s.properties.tags.contains = { $ref: "#/$defs/probe", unevaluatedProperties: false };
  };
  sampleBreaks(underContains, nothing);
  const alsoAField = (s) => {
    underContains(s);
    s.properties.probe = { $ref: "#/$defs/probe", unevaluatedProperties: false, description: "A probe." };
  };
  assert.deepEqual(errorsOf([sampleSchema(alsoAField)]), []);
});

test("an object is closed at its place, and only there", () => {
  sampleBreaks((s) => delete s.properties.details.unevaluatedProperties, /an object, open at its place: the place has unevaluatedProperties: false/);
  sampleBreaks((s) => delete s.properties.item.unevaluatedProperties, /an object, open at its place/);
  expectEach([sampleSchema((s) => (s.properties.details.unevaluatedProperties = true))], [/unevaluatedProperties is false/, /an object, open at its place/, unchecked]);
  expectEach(
    [commonSchema((s) => (s.$defs.base.unevaluatedProperties = false))],
    [/common\.schema\.json:\d+: unevaluatedProperties stands only at an object's place/, /sample\.schema\.json:1: not compiled: it refers to common\.schema\.json/, unchecked],
  );
});

test("an object closed by its parts is open at its place", () => {
  // A $ref to an object and nothing more is the place's object, so the place closes it.
  sampleBreaks((s) => (s.properties.base = { $ref: "common.schema.json#/$defs/base", description: "A bare base." }), /an object, open at its place/);
});

test("additionalProperties is a map's schema, with propertyNames", () => {
  sampleBreaks((s) => (s.properties.details.additionalProperties = false), /additionalProperties is a map's schema of its values/);
  sampleBreaks((s) => delete s.properties.weights.propertyNames, /a map, with additionalProperties, has propertyNames/);
});

test("false stands only as the value of unevaluatedProperties", () => {
  sampleBreaks((s) => (s.properties.count.not = false), /false stands only as the value of unevaluatedProperties/);
});

test("names are in snake_case", () => {
  sampleBreaks((s) => (s.properties.Count = { type: "integer", description: "Another count." }), /Count: a name in snake_case/);
  expectEach([commonSchema((s) => (s.$defs.Base = { type: "string", description: "A base." }))], [/common\.schema\.json:\d+: Base: a name in snake_case/, /sample\.schema\.json:1: not compiled/, unchecked]);
});

test("a pattern stays within the subset", () => {
  sampleBreaks((s) => (s.properties.weights.propertyNames.pattern = "^\\w+$"), /pattern "\^\\\\w\+\$": the escape \\w is no token of the format/);
  sampleBreaks((s) => (s.properties.notes.patternProperties = { "^[a-z].*$": { type: "string", description: "A note." } }), /patternProperties "\^\[a-z\]\.\*\$": a \. that is no letter/);
  sampleBreaks((s) => (s.properties.weights.propertyNames.pattern = "^[a-z]{1,2000}$"), /the count 2000, above 1000/);
});

test("a property an if names is declared by a part that always applies", () => {
  sampleBreaks((s) => (s.if.properties.extra = { const: "x" }), /extra: named under if or not, and declared by no part that always applies/);
  // Declared in a oneOf branch only, it is no better: the branch need not apply.
  sampleBreaks((s) => (s.properties.item.if = { properties: { a: { const: "x" } } }), /a: named under if or not/);
});

test("why: ajv counts a property of an if that failed as evaluated when there is an else", () => {
  // 2020-12 drops the annotations of a subschema that fails, so x is unevaluated here and the value
  // invalid. ajv 8.20.0 accepts it, and its own test runner skips this case of the JSON Schema Test
  // Suite. When ajv changes, this test says so, and the rule of checkPlace can be read again.
  const ajv = new Ajv2020({ allErrors: true });
  const validate = ajv.compile({
    type: "object",
    properties: { kind: { type: "string" } },
    if: { properties: { kind: { const: "a" }, x: { type: "string" } } },
    then: { required: ["kind"] },
    else: { required: ["kind"] },
    unevaluatedProperties: false,
  });
  assert.equal(validate({ kind: "b", x: "q" }), true);
});

test("a schema that refers to a broken one is not compiled, in one line", () => {
  expectEach([commonSchema((s) => delete s.title)], [/common\.schema\.json:\d+: the root has title/, /sample\.schema\.json:1: not compiled: it refers to common\.schema\.json, which has errors/, /sample\.schema\.json:0: its examples and vectors go unchecked/]);
});

// Examples.

test("a valid example passes its schema", () => {
  expectOnly([["format/examples/sample/valid/minimal.yaml", null, "title: A sample\ncount: -1\n"]], /valid\/minimal\.yaml:0: does not pass its schema: minimum at #\/count/);
});

test("a valid example names no error", () => {
  expectOnly([["format/examples/sample/valid/minimal.yaml", null, "# error: type at #\ntitle: A sample\n"]], /valid\/minimal\.yaml:1: a valid example names no error/);
});

test("an invalid example gives the error it names", () => {
  expectOnly([["format/examples/sample/invalid/wrong-count.yaml", "count: many", "count: 2"]], /wrong-count\.yaml:1: passes its schema, and names type at #\/count/);
  expectOnly([["format/examples/sample/invalid/wrong-count.yaml", "type at #/count", "type at #/level"]], /wrong-count\.yaml:1: gives no type at #\/level; it gives type at #\/count/);
  expectOnly([["format/examples/sample/invalid/wrong-count.yaml", "type at #/count", "minimum at #/count"]], /gives no minimum at #\/count/);
});

test("an invalid example's first line names its error, and never what holds the failing keyword", () => {
  expectOnly([["format/examples/sample/invalid/wrong-count.yaml", "# error: type at #/count\n", ""]], /wrong-count\.yaml:1: an invalid example's first line is # error: <keyword> at <location>/);
  expectOnly([["format/examples/sample/invalid/wrong-count.yaml", "type at #/count", "type #/count"]], /wrong-count\.yaml:1: the first line reads/);
  expectOnly([["format/examples/sample/invalid/wrong-count.yaml", "type at #/count", "type at /count"]], /wrong-count\.yaml:1: the first line reads/);
  expectOnly([["format/examples/sample/invalid/unknown-kind.yaml", "oneOf at #/item", "$ref at #/item"]], /unknown-kind\.yaml:1: \$ref is never named/);
  expectOnly([["format/examples/sample/invalid/high-without-count.yaml", "required at #", "if at #"]], /high-without-count\.yaml:1: if is never named/);
});

test("a location is a JSON Pointer in a URI fragment, its percent-encoding undone", () => {
  assert.deepEqual(errorsOf([["format/examples/sample/invalid/wrong-count.yaml", "type at #/count", "type at #/%63ount"]]), []);
  expectOnly([["format/examples/sample/invalid/wrong-count.yaml", "type at #/count", "type at #/%E0%A4%A"]], /is no JSON Pointer in a URI fragment/);
});

test("examples follow the YAML rules", () => {
  expectOnly([["format/examples/sample/valid/minimal.yaml", null, "title: yes\n"]], /valid\/minimal\.yaml:1: yaml\.plain-strings: "yes" reads as another value/);
  expectOnly([["format/examples/sample/invalid/wrong-count.yaml", "count: many", "count: &n many"]], /wrong-count\.yaml:3: yaml\.no-anchors: the anchor &n/);
  expectOnly([["format/examples/sample/valid/minimal.yaml", null, "title: [\n"]], /valid\/minimal\.yaml:\d+: not YAML/);
});

test("an example's term has a schema", () => {
  expectOnly([["format/examples/other/valid/a-case.yaml", null, "title: A case\n"]], /^format\/examples\/other\/valid\/a-case\.yaml:0: no schema other\.schema\.json for the examples of this term/);
});

// Vectors.

test("a vector of a YAML rule breaks that rule and no other", () => {
  expectOnly([["format/vectors/rules/yaml.no-anchors/anchor.yaml", null, "title: &name yes\n"]], /anchor\.yaml:1: breaks yaml\.plain-strings too/);
  expectOnly([["format/vectors/rules/yaml.no-anchors/anchor.yaml", null, "title: A title\n"]], /anchor\.yaml:0: breaks no yaml\.no-anchors/);
  expectOnly([["format/vectors/rules/yaml.no-anchors/anchor.yaml", null, "title: &name [A title\n"]], /anchor\.yaml:\d+: not YAML/);
});

test("a vector of a part's rule follows the YAML rules and passes the part's schema", () => {
  expectOnly([["format/vectors/rules/sample.known-tag/unknown-tag.yaml", null, "tags: [unknown]\n"]], /unknown-tag\.yaml:0: does not pass the schema of sample: required at #/);
  expectOnly([["format/vectors/rules/sample.known-tag/unknown-tag.yaml", null, "title: A sample\ntags: [~]\n"]], /unknown-tag\.yaml:2: yaml\.plain-strings/);
  expectOnly([["format/README.md", "`sample.known-tag`", "`other.known-tag`"], ["format/vectors/rules/sample.known-tag", "", null], ["format/vectors/rules/other.known-tag/unknown-tag.yaml", null, "title: A sample\n"]], /other\.known-tag\/unknown-tag\.yaml:0: no schema other\.schema\.json for the vectors of this part's rule/);
});

// The layout of a module, and the cases laid out as one.

const README = "format/README.md";
const SMALLEST = "format/examples/module/valid/smallest";
const WITH_SAMPLE = "format/examples/module/valid/with-sample";
const IN_A_MODULE = "format/vectors/rules/sample.known-tag/in-a-module";
const waiting = /^format\/README\.md:0: the cases laid out as a module go unchecked until the layout of a module is fixed/;

test("the text has one layout of a module", () => {
  expectEach([[README, "| Path | Part | Holds |", "| File | Part | Holds |"]], [/^format\/README\.md:0: the text has no layout of a module: a table whose first column is headed Path/, waiting]);
  expectEach([[README, "## 11. The manifest", "| Path | Part |\n|---|---|\n| \x60NOTICE\x60 | — |\n\n## 11. The manifest"]], [/^format\/README\.md:\d+: a second layout of a module/]);
});

test("a path of the layout is names joined by /, and may end with <path>, or with <id> and an extension", () => {
  expectEach([[README, "| \x60media/<path>\x60 |", "| \x60media/<name>.png\x60 |"]], [/README\.md:\d+: media\/<name>\.png: format-check knows the placeholders <path>, at the end of a path, and <id>, before the extension of its last name, only/, waiting]);
  expectEach([[README, "| \x60samples/<id>.yaml\x60 |", "| \x60samples/<id>/sample.yaml\x60 |"]], [/README\.md:\d+: samples\/<id>\/sample\.yaml: <id> stands only in the last name of a path/, waiting]);
  expectEach([[README, "| \x60samples/<id>.yaml\x60 |", "| \x60samples/<id>\x60 |"]], [/README\.md:\d+: samples\/<id>: <id> is followed by an extension/, waiting]);
  expectEach([[README, "| \x60samples/<id>.yaml\x60 |", "| \x60<id>.yaml\x60 |"]], [/README\.md:\d+: <id>\.yaml: a path begins with a name/, waiting]);
  expectEach([[README, "| \x60media/<path>\x60 |", "| \x60media/<path>/pictures\x60 |"]], [/README\.md:\d+: media\/<path>\/pictures: <path> stands only at the end of a path/, waiting]);
  expectEach([[README, "| \x60media/<path>\x60 |", "| \x60.media/<path>\x60 |"]], [/README\.md:\d+: \.media\/<path>: a path is names joined by \/, each of letters, digits, \., - and _, and none beginning with \./, waiting]);
  expectEach([[README, "| \x60media/<path>\x60 |", "| \x60media/*.png\x60 |"]], [/README\.md:\d+: media\/\*\.png: a path is names joined by \//, waiting]);
  // A path that is <path> alone would hold every file, and module.layout would refuse none.
  expectEach([[README, "| \x60media/<path>\x60 |", "| \x60<path>\x60 |"]], [/README\.md:\d+: <path>: a path begins with a name/, waiting]);
});

test("no row of the layout overlaps another", () => {
  const notice = "| \x60NOTICE\x60 | — | The notices of the licenses. |";
  expectEach([[README, notice, notice + "\n| \x60NOTICE\x60 | — | Again. |"]], [/README\.md:\d+: the path NOTICE overlaps NOTICE, after line \d+/, waiting]);
  expectEach([[README, notice, notice + "\n| \x60media/dot.png\x60 | — | A picture. |"]], [/README\.md:\d+: the path media\/dot\.png overlaps media\/<path>, after line \d+: one names a file or folder that the other names too/, waiting]);
  expectEach([[README, notice, notice + "\n| \x60NOTICE/<path>\x60 | — | More notices. |"]], [/README\.md:\d+: the path NOTICE\/<path> overlaps NOTICE/, waiting]);
  expectEach([[README, notice, notice + "\n| \x60media/pictures/<path>\x60 | — | Pictures. |"]], [/README\.md:\d+: the path media\/pictures\/<path> overlaps media\/<path>/, waiting]);
  // A placeholder <id> could take any name: a file of the same folder, or <path> there, meets it.
  expectEach([[README, notice, notice + "\n| \x60samples/index.yaml\x60 | — | An index. |"]], [/README\.md:\d+: the path samples\/index\.yaml overlaps samples\/<id>\.yaml/, waiting]);
  expectEach([[README, notice, notice + "\n| \x60samples/<path>\x60 | — | Anything. |"]], [/README\.md:\d+: the path samples\/<path> overlaps samples\/<id>\.yaml/, waiting]);
  expectEach([[README, notice, notice + "\n| \x60samples\x60 | — | A file. |"]], [/README\.md:\d+: the path samples overlaps samples\/<id>\.yaml/, waiting]);
  expectEach([[README, notice, notice + "\n| \x60samples/<id>.yaml\x60 | — | Again. |"]], [/README\.md:\d+: the path samples\/<id>\.yaml overlaps samples\/<id>\.yaml/, waiting]);
  // Another extension is another file.
  assert.deepEqual(errorsOf([[README, notice, notice + "\n| \x60samples/<id>.json\x60 | — | Samples as JSON. |"]]), []);
  // Deeper in its folder, a row meets <id> only by a name with its extension.
  assert.deepEqual(errorsOf([[README, notice, notice + "\n| \x60samples/media/<path>\x60 | — | Media of samples. |\n| \x60samples/README.md\x60 | — | A readme. |"]]), []);
  expectEach([[README, notice, notice + "\n| \x60samples/notes.yaml/<path>\x60 | — | Notes. |"]], [/README\.md:\d+: the path samples\/notes\.yaml\/<path> overlaps samples\/<id>\.yaml/, waiting]);
});

test("a part of the layout is a term with a schema, or —", () => {
  expectEach([[README, "| \x60NOTICE\x60 | — |", "| \x60NOTICE\x60 | Notice |"]], [/README\.md:\d+: "Notice": a part is a term in kebab-case, or —/, waiting]);
  expectEach([[README, "| \x60sample.yaml\x60 | \x60sample\x60 |", "| \x60sample.yaml\x60 | \x60other\x60 |"]], [/README\.md:\d+: the layout names the part other, and there is no schemas\/other\.schema\.json/, waiting]);
  expectEach([[README, "| \x60manifest.yaml\x60 | \x60manifest\x60 |", "| \x60manifest.yml\x60 | \x60manifest\x60 |"]], [/README\.md:\d+: the layout has no manifest\.yaml for the part manifest/, waiting]);
});

test("a whole-module example holds nothing outside the layout, names compared exactly", () => {
  expectOnly([[`${WITH_SAMPLE}/notes.txt`, null, "Notes.\n"]], /with-sample\/notes\.txt:0: module\.layout: stands at no path of the layout of a module/);
  expectOnly([[`${WITH_SAMPLE}/notice`, null, "Notices.\n"]], /with-sample\/notice:0: module\.layout: stands at no path/);
  expectOnly([[`${WITH_SAMPLE}/dot.png`, null, "PNG\n"]], /with-sample\/dot\.png:0: module\.layout: stands at no path/);
  expectEach([[`${SMALLEST}/manifest.yaml`, "", null], [`${SMALLEST}/Manifest.yaml`, null, MANIFEST]], [/smallest:0: module\.manifest: the folder holds no manifest\.yaml/, /smallest\/Manifest\.yaml:0: module\.layout: stands at no path/]);
});

test("what begins with a dot is not the module's, and an empty folder holds nothing", () => {
  const edits = [[`${WITH_SAMPLE}/.hidden`, null, "hidden\n"], [`${WITH_SAMPLE}/.git/config`, null, "[core]\n"], [`${WITH_SAMPLE}/media/.keep`, null, ""]];
  assert.deepEqual(errorsOf(edits, (root) => fs.mkdirSync(path.join(root, WITH_SAMPLE, "extras"))), []);
});

test("a symbolic link breaks module.layout", () => {
  const errors = errorsOf([], (root) => fs.symlinkSync("dot.png", path.join(root, WITH_SAMPLE, "media", "link.png")));
  assert.deepEqual(errors, ["format/examples/module/valid/with-sample/media/link.png:0: module.layout: a symbolic link: a module holds files and folders only"]);
});

test("a file at <id> is named by a local ID and holds it in id", () => {
  assert.deepEqual(errorsOf([[`${WITH_SAMPLE}/samples/a-sample.yaml`, null, "id: a-sample\ntitle: A sample\n"]]), []);
  expectOnly([[`${WITH_SAMPLE}/samples/a-sample.yaml`, null, "id: another\ntitle: A sample\n"]], /with-sample\/samples\/a-sample\.yaml:0: module\.file-ids: holds the id "another": the file of an entry is named by its id, a-sample/);
  // A file the schema refuses breaks that, and its id is not read.
  expectOnly([[`${WITH_SAMPLE}/samples/a-sample.yaml`, null, "id: another\n"]], /with-sample\/samples\/a-sample\.yaml:0: does not pass the schema of sample: required at #/);
  // A name that is no local ID stands at no path: capitals, a device name of Windows, 65 letters.
  for (const name of ["A-sample", "con", "a".repeat(65), "a_sample"]) {
    expectOnly([[`${WITH_SAMPLE}/samples/${name}.yaml`, null, "title: A sample\n"]], new RegExp(`samples/${name}\\.yaml:0: module\\.layout: stands at no path`));
  }
  expectOnly([[`${WITH_SAMPLE}/samples/more/a-sample.yaml`, null, "title: A sample\n"]], /samples\/more\/a-sample\.yaml:0: module\.layout: stands at no path/);
  expectOnly([["format/vectors/rules/module.file-ids/id-unlike-name/samples/a-sample.yaml", null, "id: a-sample\ntitle: A sample\n"]], /module\.file-ids\/id-unlike-name:0: breaks no module\.file-ids/);
});

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const media = (file) => `${WITH_SAMPLE}/media/${file}`;

test("a media file stands at a media path and begins with its format's signature", () => {
  const webp = Buffer.concat([Buffer.from("RIFF"), Buffer.from([0x24, 0, 0, 0]), Buffer.from("WEBPVP8 ")]);
  const good = [["dot.jpg", Buffer.from([0xff, 0xd8, 0xff, 0xe0])], ["dot.webp", webp], ["tag.mp3", Buffer.from("ID3\x04\x00")], ["frame.mp3", Buffer.from([0xff, 0xfb, 0x90, 0x64])], ["pictures/dot.png", PNG]];
  assert.deepEqual(errorsOf(good.map(([file, bytes]) => [media(file), null, bytes])), []);
  const bad = [
    ["dot.jpg", PNG, "JPEG"],
    ["dot.png", Buffer.from([0xff, 0xd8, 0xff]), "PNG"],
    ["dot.webp", Buffer.concat([Buffer.from("RIFF"), Buffer.from([0x24, 0, 0, 0]), Buffer.from("WAVEfmt ")]), "WebP"],
    ["tag.mp3", Buffer.from("ID2\x04"), "MP3"],
    // A reserved bitrate index, a reserved sampling rate, and layer II.
    ["frame.mp3", Buffer.from([0xff, 0xfb, 0xf0, 0x64]), "MP3"],
    ["frame.mp3", Buffer.from([0xff, 0xfb, 0x9c, 0x64]), "MP3"],
    ["frame.mp3", Buffer.from([0xff, 0xfd, 0x90, 0x64]), "MP3"],
    ["frame.mp3", Buffer.from([0xff, 0xfb, 0x90]), "MP3"],
  ];
  for (const [file, bytes, format] of bad) {
    expectOnly([[media(file), null, bytes]], new RegExp(`media/${file.replace(".", "\\.")}:0: module\\.media: does not begin with the signature of ${format}`));
  }
  for (const file of ["Dot.png", "dot.gif", "dot.jpeg", "pictures/Dots/dot.png"]) {
    expectOnly([[media(file), null, PNG]], new RegExp(`module\\.media: ${file.replace(".", "\\.")} is no media path`));
  }
  // An extension that media_path takes and format-check knows no signature of.
  const withGif = commonSchema((s) => (s.$defs.media_path.pattern = s.$defs.media_path.pattern.replace("mp3", "mp3|gif")));
  expectOnly([withGif, [media("dot.gif"), null, PNG]], /media\/dot\.gif:0: module\.media: format-check knows no signature of \.gif/);
});

test("a vector of a rule of a whole module about media breaks it and no other", () => {
  expectOnly([["format/vectors/rules/module.media/png-holding-text/media/dot.png", null, PNG]], /module\.media\/png-holding-text:0: breaks no module\.media/);
});

test("a file of a whole-module example follows the YAML rules and passes its part's schema", () => {
  expectOnly([[`${WITH_SAMPLE}/sample.yaml`, null, "title: yes\n"]], /with-sample\/sample\.yaml:1: yaml\.plain-strings/);
  expectOnly([[`${WITH_SAMPLE}/sample.yaml`, null, "count: 2\n"]], /with-sample\/sample\.yaml:0: does not pass the schema of sample: required at #/);
  expectOnly([[`${SMALLEST}/manifest.yaml`, null, 'module_format_version: "0.1"\n']], /smallest\/manifest\.yaml:0: does not pass the schema of manifest: required at #/);
});

test("a vector of a rule of a whole module breaks that rule and no other", () => {
  expectOnly([["format/vectors/rules/module.manifest/no-manifest/manifest.yaml", null, MANIFEST]], /module\.manifest\/no-manifest:0: breaks no module\.manifest/);
  expectOnly([["format/vectors/rules/module.layout/unknown-file/notes.txt", "", null]], /module\.layout\/unknown-file:0: breaks no module\.layout/);
  expectOnly([["format/vectors/rules/module.layout/unknown-file/manifest.yaml", "", null]], /module\.layout\/unknown-file:0: breaks module\.manifest too: the folder holds no manifest\.yaml/);
  expectOnly([["format/vectors/rules/module.layout/unknown-file/manifest.yaml", null, "title: yes\n"]], /unknown-file\/manifest\.yaml:1: yaml\.plain-strings/);
});

test("a vector of a part's rule laid out as a module follows the rules of a whole module and holds that part", () => {
  expectOnly([[`${IN_A_MODULE}/notes.txt`, null, "Notes.\n"]], /in-a-module\/notes\.txt:0: module\.layout: stands at no path/);
  expectOnly([[`${IN_A_MODULE}/sample.yaml`, "", null]], /in-a-module:0: holds no file of the part sample, whose rule sample\.known-tag it is a case of/);
  expectOnly([[`${IN_A_MODULE}/sample.yaml`, null, "tags: [unknown]\n"]], /in-a-module\/sample\.yaml:0: does not pass the schema of sample: required at #/);
});

test("a manifest names the version in VERSION, but in a case of manifest.format-version", () => {
  const other = /names the format version 0\.2: it names 0\.1, as format\/VERSION has it, or it breaks manifest\.format-version/;
  expectOnly([["format/examples/manifest/valid/minimal.yaml", "0.1", "0.2"]], new RegExp(`^format/examples/manifest/valid/minimal\\.yaml:0: ${other.source}`));
  expectOnly([[`${SMALLEST}/manifest.yaml`, "0.1", "0.2"]], new RegExp(`smallest/manifest\\.yaml:0: ${other.source}`));
  expectOnly([[`${IN_A_MODULE}/manifest.yaml`, "0.1", "0.2"]], new RegExp(`in-a-module/manifest\\.yaml:0: ${other.source}`));
  expectOnly([["format/vectors/rules/manifest.format-version/unknown-version.yaml", "0.0", "0.1"]], /unknown-version\.yaml:0: names the format version 0\.1, which a reader of 0\.1 reads: a case of manifest\.format-version names one that it does not read/);
  // An invalid example breaks one thing: the version, when it shows it, or else not the version.
  assert.deepEqual(errorsOf([["format/examples/manifest/invalid/version-with-v.yaml", null, "# error: pattern at #/module_format_version\nmodule_format_version: v0.1\ntitle: A trial module\n"]]), []);
  expectOnly([["format/examples/manifest/invalid/no-title.yaml", null, '# error: required at #\nmodule_format_version: "0.2"\n']], /no-title\.yaml:0: names the format version 0\.2/);
  // A case of manifest.format-version laid out as a module.
  assert.deepEqual(errorsOf([["format/vectors/rules/manifest.format-version/in-a-module/manifest.yaml", null, 'module_format_version: "0.0"\ntitle: A trial module\n'], ["format/vectors/rules/manifest.format-version/in-a-module/LICENSE", null, LICENSE]]), []);
  expectOnly([["format/vectors/rules/manifest.format-version/in-a-module/manifest.yaml", null, MANIFEST], ["format/vectors/rules/manifest.format-version/in-a-module/LICENSE", null, LICENSE]], /format-version\/in-a-module\/manifest\.yaml:0: names the format version 0\.1, which a reader of 0\.1 reads/);
});

test("a case of manifest.format-version names a version outside the window of section 2", () => {
  const caseOf = (version, named) => versionProblem({ module_format_version: named }, version, "manifest.format-version");
  // While the format is v0, a reader reads its current version only.
  assert.match(caseOf("0.3", "0.3"), /which a reader of 0\.3 reads/);
  for (const named of ["0.2", "0.4", "1.0"]) assert.equal(caseOf("0.3", named), null, named);
  // From v1 on, the minor versions of the current major up to the reader's, and the previous major, never v0.
  for (const named of ["1.0", "1.2", "2.0", "2.1"]) assert.match(caseOf("2.1", named), /which a reader of 2\.1 reads/, named);
  for (const named of ["2.2", "3.0", "0.9"]) assert.equal(caseOf("2.1", named), null, named);
  assert.equal(caseOf("1.0", "0.5"), null);
  // Every other manifest names format/VERSION's version itself.
  assert.match(versionProblem({ module_format_version: "2.0" }, "2.1", null), /names the format version 2\.0: it names 2\.1/);
});

test("the rules of a whole module in the text are those format-check checks, and it lists manifest.format-version", () => {
  expectEach([[README, "| \x60module.layout\x60 | Every file of a module MUST stand at a path of the layout. |\n", ""]], [/^format\/README\.md:0: format-check checks module\.layout, and the text does not list it/, /^format\/vectors\/rules\/module\.layout:0: format\/README\.md lists no rule module\.layout/]);
  expectEach([[README, "| \x60module.layout\x60 |", "| \x60module.other\x60 | Another rule. |\n| \x60module.layout\x60 |"]], [/README\.md:\d+: format-check does not check module\.other: tools\/format-check\/module\.mjs has to/, /README\.md:\d+: module\.other has no test vectors/]);
  expectEach([[README, "| \x60manifest.format-version\x60 | The manifest MUST name a format version that the reader reads. |\n", ""]], [/^format\/README\.md:0: format-check checks the cases of manifest\.format-version, and the text does not list it/, /^format\/vectors\/rules\/manifest\.format-version:0: format\/README\.md lists no rule manifest\.format-version/]);
});

// The vectors of the open view.

const OPEN = "format/vectors/open-view/sample/title-and-tags";

test("a vector of the open view gives the open view of its part, whatever the order of keys", () => {
  expectOnly([[`${OPEN}/open-view.yaml`, null, "title: A sample\ntags: [first]\ncount: 2\n"]], /title-and-tags\/open-view\.yaml:0: is not the open view of part\.yaml: they differ at #\/count/);
  expectOnly([[`${OPEN}/open-view.yaml`, null, "title: A sample\n"]], /they differ at #\/tags/);
  expectOnly([[`${OPEN}/open-view.yaml`, null, "title: A sample\ntags: [second]\n"]], /they differ at #\/tags\/0/);
  expectOnly([[`${OPEN}/open-view.yaml`, null, "title: A sample\ntags: first\n"]], /they differ at #\/tags/);
  assert.deepEqual(errorsOf([[`${OPEN}/open-view.yaml`, null, "tags: [first]\ntitle: A sample\n"]]), []);
});

test("a vector of the open view: the part passes its schema, and both files follow the YAML rules", () => {
  expectOnly([[`${OPEN}/part.yaml`, null, "title: A sample\ncount: -1\n"]], /title-and-tags\/part\.yaml:0: does not pass the schema of sample: minimum at #\/count/);
  expectOnly([[`${OPEN}/part.yaml`, null, "title: yes\n"]], /title-and-tags\/part\.yaml:1: yaml\.plain-strings/);
  expectOnly([[`${OPEN}/open-view.yaml`, null, "title: yes\n"]], /title-and-tags\/open-view\.yaml:1: yaml\.plain-strings/);
});

test("a vector of the open view is a folder of a part of the layout, with part.yaml and open-view.yaml alone", () => {
  const holds = /title-and-tags:0: a vector of the open view holds part\.yaml and open-view\.yaml, and nothing else/;
  expectOnly([[`${OPEN}/notes.txt`, null, "Notes.\n"]], holds);
  expectOnly([[`${OPEN}/open-view.yaml`, "", null]], holds);
  expectOnly([["format/vectors/open-view/sample/a-case.yaml", null, "title: A sample\n"]], /open-view\/sample\/a-case\.yaml:0: a vector of the open view is a folder <case>\//);
  expectOnly([["format/vectors/open-view/Sample/a-case/part.yaml", null, "title: A sample\n"]], /open-view\/Sample:0: vectors of the open view are in open-view\/<part>\/<case>\//);
  const other = ["format/vectors/open-view/other/a-case", ["part.yaml", "open-view.yaml"]];
  expectOnly(other[1].map((name) => [`${other[0]}/${name}`, null, "title: A sample\n"]), /open-view\/other\/a-case:0: other is no part of the layout of a module/);
});

test("the open view counts a mark only where its subschema applies and passes", () => {
  const marks = sampleSchema((s) => {
    s.properties.item["x-open"] = true;
    s.properties.item.oneOf[0].properties.a["x-open"] = true;
    // A mark in the branch of kind b counts only for an item of kind b.
    s.properties.item.oneOf[1].properties.kind["x-open"] = true;
    s.properties.details["x-open"] = true;
    s.properties.notes["x-open"] = true;
    s.properties.notes.patternProperties["^[a-z]+$"]["x-open"] = true;
    s.properties.weights["x-open"] = true;
    s.properties.weights.additionalProperties["x-open"] = true;
    // then applies when level is high.
    s.then.properties = { count: { type: "integer", description: "How many there are, open when the sample is hard.", "x-open": true } };
  });
  const part = "title: A sample\nlevel: high\ncount: 2\nitem:\n  id: one\n  kind: a\n  a: text\ndetails:\n  note: Closed.\nnotes:\n  first: Open.\nweights:\n  heavy: 3\n";
  // details keeps its place with nothing open in it, as {}.
  const view = "title: A sample\ncount: 2\nitem:\n  a: text\ndetails: {}\nnotes:\n  first: Open.\nweights:\n  heavy: 3\n";
  const files = (p, v) => [marks, [`${OPEN}/part.yaml`, null, p], [`${OPEN}/open-view.yaml`, null, v]];
  assert.deepEqual(errorsOf(files(part, view)), []);
  expectOnly(files(part.replace("level: high", "level: low"), view), /they differ at #\/count/);
});

test("the open view follows anyOf and prefixItems, and a reference to a whole schema", () => {
  const marks = sampleSchema((s) => {
    s.properties.pair = { type: "array", prefixItems: [{ type: "string" }, { type: "object", properties: { left: { type: "integer", description: "Open.", "x-open": true }, right: { type: "integer", description: "Closed." } }, unevaluatedProperties: false }], items: { type: "integer" }, description: "A pair, then numbers.", "x-open": true };
    s.properties.either = { anyOf: [{ type: "object", properties: { p: { type: "string", description: "Open in the first branch.", "x-open": true } } }, { type: "object", properties: { q: { type: "string", description: "Closed in the second." } } }], unevaluatedProperties: false, description: "One of two shapes.", "x-open": true };
    s.properties.whole = { $ref: "common.schema.json#/$defs/tag", description: "A tag, through common.", "x-open": true };
  });
  const part = "title: A sample\npair: [first, {left: 1, right: 2}, 3, 4]\neither: {p: open, q: closed}\nwhole: a-tag\n";
  const view = "title: A sample\npair: [first, {left: 1}, 3, 4]\neither: {p: open}\nwhole: a-tag\n";
  const files = (p, v) => [marks, [`${OPEN}/part.yaml`, null, p], [`${OPEN}/open-view.yaml`, null, v]];
  assert.deepEqual(errorsOf(files(part, view)), []);
  expectOnly(files(part, view.replace("pair: [first, {left: 1}, 3, 4]", "pair: [first, {left: 1}, 3]")), /they differ at #\/pair/);
  expectOnly(files(part, view.replace("pair: [first, {left: 1}, 3, 4]", "pair: {first: 1}")), /they differ at #\/pair/);
});

// dependentSchemas beside unevaluatedProperties trips ajv 8.20.0 (the next test), so its walk is
// tested on its own, with every subschema passing.
test("the open view follows dependentSchemas when its key is present, and a reference to a whole schema", () => {
  const json = { $id: "https://x.test/0.1/x.schema.json", properties: { count: { "x-open": true }, level: {}, other: { $ref: "y.schema.json", "x-open": true } }, dependentSchemas: { count: { properties: { level: { "x-open": true } } } } };
  const other = { $id: "https://x.test/0.1/y.schema.json", properties: { inner: { "x-open": true }, hidden: {} } };
  const byName = new Map([["x.schema.json", { name: "x.schema.json", json }], ["y.schema.json", { name: "y.schema.json", json: other }]]);
  const ctx = { byName, schemaAt: () => () => true };
  assert.deepEqual(openViewOf({ count: 1, level: "low", other: { inner: 1, hidden: 2 } }, "x.schema.json", ctx), { count: 1, level: "low", other: { inner: 1 } });
  assert.deepEqual(openViewOf({ level: "low" }, "x.schema.json", ctx), {});
  assert.throws(() => openViewOf({ other: {} }, "x.schema.json", { byName: new Map([["x.schema.json", { name: "x.schema.json", json }]]), schemaAt: ctx.schemaAt }), /the reference y\.schema\.json names no schema/);
  const branching = { $id: "https://x.test/0.1/x.schema.json", oneOf: [{ properties: { a: { "x-open": true } } }] };
  assert.throws(() => openViewOf({ a: 1 }, "x.schema.json", { byName: new Map([["x.schema.json", { name: "x.schema.json", json: branching }]]), schemaAt: () => undefined }), /the subschema https:\/\/x\.test\/0\.1\/x\.schema\.json#\/oneOf\/0 cannot be validated/);
  // An if with neither then nor else brings nothing, and is not validated.
  const lone = { $id: "https://x.test/0.1/x.schema.json", properties: { a: { "x-open": true } }, if: { required: ["a"] } };
  assert.deepEqual(openViewOf({ a: 1 }, "x.schema.json", { byName: new Map([["x.schema.json", { name: "x.schema.json", json: lone }]]), schemaAt: () => undefined }), { a: 1 });
  assert.equal(differenceOf([1, { a: 1 }], [1, { a: 1 }]), null);
  assert.deepEqual(differenceOf({ a: [1] }, { a: [2] }), ["a", 0]);
  assert.deepEqual(differenceOf({ a: 1 }, { b: 1 }), ["a"]);
});

test("why: ajv drops the properties of a place beside dependentSchemas whose key is absent, and beside $ref with oneOf", () => {
  // 2020-12 counts the properties of the place as evaluated in both, and the value is valid; ajv
  // 8.20.0 refuses it. The schemas of the format use neither (RUN.md, T28). When ajv changes, this
  // test says so.
  const ajv = new Ajv2020({ allErrors: true });
  ajv.addSchema({ $id: "https://x.test/c.json", $defs: { base: { type: "object", properties: { id: { type: "string" }, kind: { type: "string" } } } } });
  const dependent = ajv.compile({ type: "object", properties: { title: { type: "string" }, count: { type: "integer" } }, dependentSchemas: { count: { properties: { title: { minLength: 1 } } } }, unevaluatedProperties: false });
  assert.equal(dependent({ title: "t" }), false);
  const branches = ajv.compile({ $id: "https://x.test/s.json", $ref: "c.json#/$defs/base", oneOf: [{ properties: { kind: { const: "a" } } }, { properties: { kind: { const: "b" } } }], unevaluatedProperties: false });
  assert.equal(branches({ id: "x", kind: "a" }), true);
  assert.equal(branches({ id: "x", kind: "b" }), false);
});

test("the open view of a part whose schema has errors goes unchecked with it", () => {
  expectEach([sampleSchema((s) => (s.properties.count.type = "whole"))], [/sample\.schema\.json:\d+: the 2020-12 meta-schema/, unchecked]);
});

// The vectors of verdicts.

const VERDICT = "format/vectors/verdicts/number/whole-number.yaml";
const SLOT_READING = '{value: "7", verdict: correct}';
const ITEM_VERDICT = "    verdict: correct";

test("a vector of verdicts gives the verdicts of section 15, an answer slot's and the item's", () => {
  expectOnly([[VERDICT, SLOT_READING, '{value: "6", verdict: correct}']], /whole-number\.yaml:0: reading 1, answer slot 1: "6" gets not_yet, not correct$/);
  expectOnly([[VERDICT, SLOT_READING, '{value: "07", verdict: unreadable, reason: blank}'], [VERDICT, ITEM_VERDICT, "    verdict: unreadable"]], /"07" gets unreadable \(notation\), not unreadable \(blank\)$/);
  expectOnly([[VERDICT, ITEM_VERDICT, "    verdict: not_yet"]], /whole-number\.yaml:0: reading 1: its answer slots make the item correct, not not_yet$/);
});

test("a vector of verdicts passes its schema, reads every answer slot, and checks each by its folder's kind", () => {
  expectEach(
    [[VERDICT, SLOT_READING, '{value: "7", verdict: correct, reason: blank}']],
    [/whole-number\.yaml:0: does not pass the schema of verdict vectors: not at #\/readings\/0\/answer_slots\/0/, /whole-number\.yaml:0: does not pass the schema of verdict vectors: if at #\/readings\/0\/answer_slots\/0/, /whole-number\.yaml:0: does not pass the schema of verdict vectors: unevaluatedProperties at #\/readings\/0\/answer_slots\/0/],
  );
  expectOnly([[VERDICT, `      - ${SLOT_READING}\n`, `      - ${SLOT_READING}\n      - ${SLOT_READING}\n`]], /reading 1 reads 2 answer slots, and the item has 1$/);
  expectOnly([[VERDICT, "item:", "item:\n  title: !!str A title"]], /whole-number\.yaml:\d+: yaml\.no-tags/);
  expectEach(
    [taskSchema((s) => s.$defs.check.properties.kind.enum.push("fraction")), [VERDICT, 'check: {kind: number, key: "7"}', 'check: {kind: fraction, key: "7"}']],
    [/whole-number\.yaml:0: answer slot 1 is checked by fraction: a vector of number checks every answer slot by number$/, /task\.schema\.json:0: the check kind fraction has no vectors of verdicts in format\/vectors\/verdicts\/fraction\/$/],
  );
});

test("the vectors of verdicts are files in a folder for each check kind of the task's schema that gives verdicts", () => {
  expectOnly([["format/vectors/verdicts/whole-number.yaml", null, "item: {}\n"]], /verdicts\/whole-number\.yaml:0: vectors of verdicts are in verdicts\/<kind>\/<case>\.yaml/);
  expectOnly([["format/vectors/verdicts/number/a-folder/case.yaml", null, "item: {}\n"]], /number\/a-folder:0: a vector of verdicts is a file, <case>\.yaml$/);
  expectOnly([["format/vectors/verdicts/colour/red.yaml", null, "item: {}\n"]], /verdicts\/colour:0: no check kind of format\/schemas\/task\.schema\.json that gives verdicts is colour$/);
  expectOnly([[VERDICT, null, null]], /task\.schema\.json:0: the check kind number has no vectors of verdicts in format\/vectors\/verdicts\/number\/$/);
});

test("format-check computes the verdicts of every check kind of the task's schema, and a rubric gives none", () => {
  expectOnly([taskSchema((s) => s.$defs.check.properties.kind.enum.push("colour"))], /task\.schema\.json:0: format-check computes no verdict of the check kind colour: tools\/format-check\/verdicts\.mjs has to$/);
  assert.deepEqual(errorsOf([taskSchema((s) => s.$defs.check.properties.kind.enum.push("rubric"))]), []);
  expectOnly([taskSchema((s) => s.$defs.check.properties.kind.enum.push("rubric")), ["format/vectors/verdicts/rubric/essay.yaml", null, "item: {}\n"]], /verdicts\/rubric:0: no check kind of .* that gives verdicts is rubric$/);
});

test("a vector of verdicts names the trap that each wrong value matches, and none for another value", () => {
  const withTrap = [VERDICT, 'check: {kind: number, key: "7"}', 'check: {kind: number, key: "7", trap_values: [{value: "6", trap: off-by-one}]}'];
  expectOnly([withTrap, [VERDICT, SLOT_READING, '{value: "6", verdict: not_yet}'], [VERDICT, ITEM_VERDICT, "    verdict: not_yet"]], /whole-number\.yaml:0: reading 1, answer slot 1: "6" matches the trap off-by-one, not no trap$/);
  expectOnly([withTrap, [VERDICT, SLOT_READING, '{value: "5", verdict: not_yet, trap: off-by-one}'], [VERDICT, ITEM_VERDICT, "    verdict: not_yet"]], /"5" matches no trap, not the trap off-by-one$/);
  assert.deepEqual(errorsOf([withTrap, [VERDICT, SLOT_READING, '{value: "6 ", verdict: not_yet, trap: off-by-one}'], [VERDICT, ITEM_VERDICT, "    verdict: not_yet"]]), []);
  // A trap value that is right breaks task.trap-values: the item of a vector is one that a task may hold.
  expectOnly([[VERDICT, 'check: {kind: number, key: "7"}', 'check: {kind: number, key: "7", trap_values: [{value: "7", trap: off-by-one}]}']], /answer slot 1 breaks task\.trap-values: the item of a vector is one that a task may hold$/);
  expectEach(
    [[VERDICT, SLOT_READING, '{value: "7", verdict: correct, trap: off-by-one}']],
    [/does not pass the schema of verdict vectors: const at #\/readings\/0\/answer_slots\/0\/verdict/, /does not pass the schema of verdict vectors: if at #\/readings\/0\/answer_slots\/0/, /does not pass the schema of verdict vectors: unevaluatedProperties at #\/readings\/0\/answer_slots\/0/],
  );
});

test("the vectors of verdicts need the schema of verdict vectors, and the check kinds of the task's", () => {
  expectOnly([["format/schemas/verdict-vector.schema.json", null, null]], /^format\/vectors\/verdicts:0: no schema verdict-vector\.schema\.json for the vectors of verdicts$/);
  expectOnly([taskSchema((s) => delete s.$defs.check.properties.kind.enum)], /^format\/vectors\/verdicts:0: format\/schemas\/task\.schema\.json names no check kinds .* the vectors of verdicts go unchecked$/);
});

// The rules of a task that format-check implements, on every task it reads.

const trapTask = (value) => `items:\n  - answer_slots:\n      - binding: anywhere\n        check: {kind: number, key: "7", trap_values: [{value: "${value}", trap: off-by-one}]}\n`;

test("a valid example of a task breaks none of the rules of a task that format-check implements", () => {
  expectOnly([["format/examples/task/valid/right-trap.yaml", null, trapTask("7")]], /task\/valid\/right-trap\.yaml:0: breaks task\.trap-values$/);
  assert.deepEqual(errorsOf([["format/examples/task/valid/wrong-trap.yaml", null, trapTask("6")]]), []);
});

test("a case of a rule of a task that format-check implements breaks it, and a case of another rule none of them", () => {
  const listed = (rule) => ["format/README.md", "| `sample.known-tag` |", `| \`${rule}\` | A rule of a task. |\n| \`sample.known-tag\` |`];
  const vector = (rule, text) => [`format/vectors/rules/${rule}/a-case.yaml`, null, text];
  assert.deepEqual(errorsOf([listed("task.trap-values"), vector("task.trap-values", trapTask("7"))]), []);
  expectOnly([listed("task.trap-values"), vector("task.trap-values", trapTask("6"))], /task\.trap-values\/a-case\.yaml:0: breaks no task\.trap-values$/);
  expectOnly([listed("task.other"), vector("task.other", trapTask("7"))], /task\.other\/a-case\.yaml:0: breaks task\.trap-values$/);
});

test("the tasks of a case laid out as a module are checked against the rules of a task that format-check implements", () => {
  const layout = ["format/README.md", "| `media/<path>` | — | Pictures and sound. |", "| `tasks/<id>.yaml` | `task` | Tasks. |\n| `media/<path>` | — | Pictures and sound. |"];
  const listed = ["format/README.md", "| `sample.known-tag` |", "| `task.trap-values` | A rule of a task. |\n| `sample.known-tag` |"];
  const folder = (at, task) => [[`${at}/manifest.yaml`, null, MANIFEST], [`${at}/LICENSE`, null, LICENSE], [`${at}/tasks/seven.yaml`, null, task]];
  const vectorAt = "format/vectors/rules/task.trap-values/in-a-module";
  assert.deepEqual(errorsOf([layout, listed, ...folder(vectorAt, trapTask("7"))]), []);
  expectOnly([layout, listed, ...folder(vectorAt, trapTask("6"))], /task\.trap-values\/in-a-module:0: breaks no task\.trap-values$/);
  expectOnly([layout, ...folder("format/examples/module/valid/with-a-task", trapTask("7"))], /with-a-task\/tasks\/seven\.yaml:0: breaks task\.trap-values$/);
});

// lesson.no-leaks, the rule of a lesson that format-check implements, on the lessons of a case laid
// out as a module: a trial lesson schema, a layout with tasks and lessons, and a lesson whose title
// comes before its task.
const LESSON_SCHEMA = JSON.stringify({
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://altnovatrail.github.io/spec/format/0.1/lesson.schema.json",
  title: "Lesson",
  description: "A trial lesson: its title, and segments that name tasks.",
  type: "object",
  properties: {
    title: { type: "string", description: "What the lesson is called." },
    segments: {
      type: "array",
      items: { type: "object", properties: { task: { type: "string", description: "A task, by its local ID." } }, unevaluatedProperties: false },
      description: "The segments of the lesson.",
    },
  },
  unevaluatedProperties: false,
});

test("the lessons of a case laid out as a module are checked against lesson.no-leaks, whose cases are folders", () => {
  const layout = ["format/README.md", "| `media/<path>` | — | Pictures and sound. |", "| `tasks/<id>.yaml` | `task` | Tasks. |\n| `lessons/<id>.yaml` | `lesson` | Lessons. |\n| `media/<path>` | — | Pictures and sound. |"];
  const listed = (rule) => ["format/README.md", "| `sample.known-tag` |", `| \`${rule}\` | A rule of a lesson. |\n| \`sample.known-tag\` |`];
  const schema = ["format/schemas/lesson.schema.json", null, LESSON_SCHEMA];
  const seven = 'items:\n  - answer_slots:\n      - binding: anywhere\n        check: {kind: number, key: "7"}\n';
  const folder = (at, title) => [[`${at}/manifest.yaml`, null, MANIFEST], [`${at}/LICENSE`, null, LICENSE], [`${at}/tasks/seven.yaml`, null, seven], [`${at}/lessons/ladder.yaml`, null, `title: ${title}\nsegments:\n  - task: seven\n`]];
  const vectorAt = "format/vectors/rules/lesson.no-leaks/in-a-module";
  assert.deepEqual(errorsOf([layout, schema, listed("lesson.no-leaks"), ...folder(vectorAt, "A ladder of 7 rungs")]), []);
  expectOnly([layout, schema, listed("lesson.no-leaks"), ...folder(vectorAt, "A ladder")], /lesson\.no-leaks\/in-a-module:0: breaks no lesson\.no-leaks$/);
  expectOnly([layout, schema, listed("lesson.other"), ...folder("format/vectors/rules/lesson.other/in-a-module", "A ladder of 7 rungs")], /lesson\.other\/in-a-module\/lessons\/ladder\.yaml:0: breaks lesson\.no-leaks$/);
  expectOnly([layout, schema, ...folder("format/examples/module/valid/with-a-lesson", "A ladder of 7 rungs")], /with-a-lesson\/lessons\/ladder\.yaml:0: breaks lesson\.no-leaks$/);
  expectEach(
    [layout, schema, listed("lesson.no-leaks"), ["format/vectors/rules/lesson.no-leaks/a-case.yaml", null, "title: A ladder\nsegments: []\n"]],
    [/lesson\.no-leaks\/a-case\.yaml:0: a case of lesson\.no-leaks is a folder laid out as a module, <case>\/: the rule spans a lesson and its tasks$/, /README\.md:\d+: lesson\.no-leaks has no test vectors/],
  );
});

// The vectors of the leak check.

const LEAK = "format/vectors/leaks/whole-number.yaml";

test("a vector of the leak check finds in each text what section 20 finds, as a set", () => {
  expectOnly([[LEAK, '    leaks: ["7"]', "    leaks: []"]], /whole-number\.yaml:0: text 1: the leak check finds "7" in "It is 7\.", not nothing$/);
  expectOnly([[LEAK, "    leaks: []", '    leaks: ["7"]']], /whole-number\.yaml:0: text 2: the leak check finds nothing in "It is 17\.", not "7"$/);
  expectOnly([[LEAK, '    leaks: ["7"]', '    leaks: ["7", "seven"]']], /text 1: the leak check finds "7" in "It is 7\.", not "7", "seven"$/);
});

test("a vector of the leak check passes its schema, and its task breaks no rule of a task that format-check implements", () => {
  expectOnly([[LEAK, '    leaks: ["7"]', '    leaks: ["7", "7"]']], /whole-number\.yaml:0: does not pass the schema of leak vectors: uniqueItems at #\/texts\/0\/leaks/);
  expectOnly([[LEAK, "task:", "task:\n  title: !!str A title"]], /whole-number\.yaml:\d+: yaml\.no-tags/);
  expectOnly([[LEAK, 'check: {kind: number, key: "7"}', 'check: {kind: number, key: "7", trap_values: [{value: "7", trap: off-by-one}]}']], /whole-number\.yaml:0: its task breaks task\.trap-values: the task of a vector is one that a module may hold$/);
});

test("the vectors of the leak check are files, and need the schema of leak vectors", () => {
  expectOnly([["format/vectors/leaks/a-folder/case.yaml", null, "task: {}\n"]], /leaks\/a-folder:0: a vector of the leak check is a file, <case>\.yaml$/);
  expectOnly([["format/vectors/leaks/notes.txt", null, "notes\n"]], /leaks\/notes\.txt:0: a case is <case>\.yaml, its name in kebab-case/);
  expectOnly([["format/schemas/leak-vector.schema.json", null, null]], /^format\/vectors\/leaks:0: no schema leak-vector\.schema\.json for the vectors of the leak check$/);
});

// The vectors of the generator.

const RANDOM = "format/vectors/random/go-pcg-1-2.yaml";
const vectorOfRandom = (text) => [RANDOM, null, text];

test("a vector of the generator gives, draw by draw, what section 22 computes on its stream", () => {
  expectOnly([[RANDOM, 'value: "14192431797130687760"', 'value: "14192431797130687761"']], /go-pcg-1-2\.yaml:0: draw 1: integer gives 14192431797130687760, not 14192431797130687761$/);
  const start = 'state: {high: "1", low: "2"}\ndraws:\n';
  assert.deepEqual(errorsOf([vectorOfRandom(`${start}  - below: {bound: "10", value: "1"}\n  - between: {from: "-5", to: "5", value: "-5"}\n  - fraction: {value: 0.5}\n  - permutation: {count: 3, value: [0, 1, 2]}\n`)]), [
    "format/vectors/random/go-pcg-1-2.yaml:0: draw 1: below gives 7, not 1",
    "format/vectors/random/go-pcg-1-2.yaml:0: draw 2: between gives 1, not -5",
    "format/vectors/random/go-pcg-1-2.yaml:0: draw 3: fraction gives 0.5085473976760264, not 0.5",
    "format/vectors/random/go-pcg-1-2.yaml:0: draw 4: permutation gives [1,0,2], not [0,1,2]",
  ]);
});

test("a vector of the generator derives its state from its seed and names, and takes only what the functions take", () => {
  expectOnly([vectorOfRandom('seed: "7"\nnames: [a]\nstate: {high: "1", low: "7"}\ndraws:\n  - integer: {value: "0"}\n')], /go-pcg-1-2\.yaml:0: the seed and the names derive the state \{high: \d+, low: 7\}, not \{high: 1, low: 7\}$/);
  expectOnly([vectorOfRandom('state: {high: "18446744073709551616", low: "2"}\ndraws:\n  - integer: {value: "0"}\n')], /go-pcg-1-2\.yaml:0: the high word, 18446744073709551616, is past 2\^64 − 1$/);
  expectOnly([vectorOfRandom('state: {high: "1", low: "2"}\ndraws:\n  - below: {bound: "0", value: "0"}\n  - integer: {value: "0"}\n')], /draw 1: below takes a bound from 1 to 2\^64 − 1, and gives an integer below it, not 0 and 0$/);
  expectOnly([vectorOfRandom('state: {high: "1", low: "2"}\ndraws:\n  - integer: {value: "99999999999999999999"}\n')], /draw 1: its value, 99999999999999999999, is past 2\^64 − 1$/);
  expectOnly([vectorOfRandom('state: {high: "1", low: "2"}\ndraws:\n  - permutation: {count: 2147483647, value: [0]}\n')], /draw 1: permutation orders 2147483647 integers, and its value lists 1$/);
  const withChoice = ["format/schemas/random-vector.schema.json", '"permutation": {', '"choice": { "type": "object", "unevaluatedProperties": false, "description": "A function of a later version." },\n        "permutation": {'];
  expectOnly([withChoice, vectorOfRandom('state: {high: "1", low: "2"}\ndraws:\n  - choice: {}\n  - integer: {value: "0"}\n')], /draw 1: format-check knows no function choice$/);
  expectOnly([vectorOfRandom('state: {high: "1", low: "2"}\ndraws:\n  - between: {from: "5", to: "4", value: "5"}\n')], /draw 1: between takes signed integers of 64 bits, the first not above the second and at most 2\^63 − 1 integers from it to the second, not 5 and 4$/);
  expectOnly([vectorOfRandom('state: {high: "1", low: "2"}\ndraws:\n  - between: {from: "-9223372036854775808", to: "9223372036854775807", value: "0"}\n')], /draw 1: between takes signed integers/);
  expectOnly([vectorOfRandom('seed: "7"\nstate: {high: "1", low: "2"}\ndraws:\n  - integer: {value: "0"}\n')], /does not pass the schema of vectors of the generator: dependentRequired at #/);
});

test("the vectors of the generator are files, and need the schema of such vectors", () => {
  expectOnly([["format/vectors/random/a-folder/case.yaml", null, "state: {}\n"]], /random\/a-folder:0: a vector of the generator is a file, <case>\.yaml$/);
  expectEach(
    [["format/schemas/random-vector.schema.json", null, null]],
    [
      /^format\/vectors\/random:0: no schema random-vector\.schema\.json for the vectors of the generator$/,
      /template-vector\.schema\.json:\d+: \$ref "random-vector\.schema\.json#\/\$defs\/unsigned": no schema random-vector\.schema\.json/,
      /template-vector\.schema\.json:0: its examples and vectors go unchecked/,
    ],
  );
});

// The vectors of templates, and templates checked through their instances.

const TEMPLATE = "format/vectors/templates/three.yaml";
// A template with one answer slot: its parameters, as lines of YAML, its key and what else its check
// holds.
const templateTask = (parameters, key, extra = "") => `template:\n  parameters:\n${parameters}\nitems:\n  - answer_slots:\n      - binding: anywhere\n        check: {kind: number, key: "${key}"${extra}}\n`;
const constrained = (constraint, task) => task.replace("  parameters:", `  constraint: "${constraint}"\n  parameters:`);

test("a vector of templates lists the instance that each seed picks, as section 23 counts and replaces them", () => {
  expectOnly([[TEMPLATE, 'key: "2"', 'key: "20"']], /three\.yaml:0: attempt 1: the instance is not the template with these numbers: they differ at #\/items\/0\/answer_slots\/0\/check\/key$/);
  expectOnly([[TEMPLATE, "numbers: {a: 2}", "numbers: {a: 1}"]], /three\.yaml:0: attempt 1: the seed picks the instance a = 2, not a = 1$/);
  expectOnly([[TEMPLATE, "count: 3", "count: 4"]], /three\.yaml:0: the template has 3 instances, not 4$/);
  expectOnly([[TEMPLATE, 'seed: "0"', 'seed: "18446744073709551616"']], /three\.yaml:0: attempt 1: the seed, 18446744073709551616, is past 2\^64 − 1$/);
});

test("a vector of templates passes its schema, and its template breaks no rule of a task on any instance", () => {
  expectOnly([[TEMPLATE, 'check: {kind: number, key: "{a}"}', 'check: {kind: number, key: "{b}"}']], /three\.yaml:0: its template breaks task\.placeholders, #\/items\/0\/answer_slots\/0\/check\/key: \{b\} names no parameter, derived number or result of the solver: the template of a vector is one that a module may hold$/);
  expectOnly([[TEMPLATE, 'check: {kind: number, key: "{a}"}', 'check: {kind: number, key: "{a}", trap_values: [{value: "{a}", trap: off-by-one}]}']], /three\.yaml:0: its template breaks task\.trap-values, on the instance a = 1: the template/);
  expectOnly([[TEMPLATE, "      id: three\n      items:", "      id: three\n      template: {parameters: {a: {from: 1, to: 3}}}\n      items:"]], /three\.yaml:0: does not pass the schema of vectors of templates: not at #\/attempts\/0\/instance/);
});

// A vector of a template whose solver finds its key: the fixture's task schema opens no field, so the
// solver gets nothing.
const SOLVED = "format/vectors/templates/solved.yaml";
const solvedVector = (check = 'check: {kind: number, key: "{twice}"}', instanceCheck = 'check: {kind: number, key: "4"}', more = "inputs: []\n") => [
  SOLVED,
  null,
  `task:\n  id: solved\n  template:\n    parameters:\n      a: {from: 1, to: 3}\n    solver:\n      program: |\n        def solve(numbers):\n            return {"twice": 2 * numbers["a"]}\n      results: [twice]\n  items:\n    - answer_slots:\n        - binding: anywhere\n          ${check}\ncount: 3\n${more}attempts:\n  - seed: "0"\n    numbers: {a: 2, twice: 4}\n    instance:\n      id: solved\n      items:\n        - answer_slots:\n            - binding: anywhere\n              ${instanceCheck}\n`,
];
const editOf = ([file, , text], from, to) => [file, null, text.replace(from, to)];

test("a vector of a template with a solver gives its results, and what the solver gets", () => {
  assert.deepEqual(errorsOf([solvedVector()]), []);
  expectOnly([editOf(solvedVector(), "inputs: []", "inputs: [a]")], /solved\.yaml:0: the solver gets nothing, not a$/);
  expectEach([editOf(solvedVector(), "inputs: []\n", "")], [/solved\.yaml:0: does not pass the schema of vectors of templates: required at #: must have required property 'inputs'$/, /solved\.yaml:0: does not pass the schema of vectors of templates: if at #/]);
  expectEach([[TEMPLATE, "count: 3", "count: 3\ninputs: []"]], [/three\.yaml:0: does not pass the schema of vectors of templates: not at #: must NOT be valid$/, /three\.yaml:0: does not pass the schema of vectors of templates: if at #/]);
  expectOnly([editOf(solvedVector(), "{a: 2, twice: 4}", "{a: 2}")], /solved\.yaml:0: attempt 1: the numbers give no result twice of the solver$/);
  expectOnly([editOf(solvedVector(), "{a: 2, twice: 4}", "{a: 2, twice: 5}")], /solved\.yaml:0: attempt 1: the instance is not the template with these numbers: they differ at #\/items\/0\/answer_slots\/0\/check\/key$/);
  expectOnly([editOf(solvedVector(), "{a: 2, twice: 4}", "{a: 1, twice: 4}")], /solved\.yaml:0: attempt 1: the seed picks the instance a = 2, not a = 1$/);
});

test("spec passes over what a solver's results hold, until a vector gives them", () => {
  const trapOfFour = ", trap_values: [{value: \"4\", trap: off-by-one}]";
  // On the instances, the key is the solver's, so the trap value goes unchecked; the attempt's
  // instance has it, and is checked.
  expectOnly([solvedVector(`check: {kind: number, key: "{twice}"${trapOfFour}}`, `check: {kind: number, key: "4"${trapOfFour}}`)], /solved\.yaml:0: attempt 1: the instance breaks task\.trap-values$/);
  const example = (text) => ["format/examples/task/valid/solved.yaml", null, text];
  const solvedTask = (check) => `id: solved\ntemplate:\n  parameters:\n    a: {from: 1, to: 3}\n  solver: {program: "def solve(numbers): pass", results: [twice]}\nitems:\n  - answer_slots:\n      - binding: anywhere\n        ${check}\n`;
  assert.deepEqual(errorsOf([example(solvedTask(`check: {kind: number, key: "{twice}"${trapOfFour}}`))]), [], "a trap value against a key that only the solver knows");
  expectOnly([example(solvedTask('check: {kind: number, key: "{twice}", trap_values: [{value: "{a}", trap: off-by-one}, {value: "{a}", trap: off-by-one}]}'))], /solved\.yaml:0: breaks task\.trap-values, on the instance a = 1$/);
  expectOnly([example(solvedTask('check: {kind: number, key: "{a}", trap_values: [{value: "{twice}", trap: off-by-one}, {value: "{a}", trap: off-by-one}]}'))], /solved\.yaml:0: breaks task\.trap-values, on the instance a = 1$/);
  const shown = solvedTask('check: {kind: number, key: "{twice}"}').replace("  - answer_slots:\n      - binding: anywhere\n        check", '  - line:\n      - text: "= {twice}"\n      - binding: box\n        check');
  expectOnly([example(shown)], /solved\.yaml:0: breaks task\.placeholders, #\/items\/0\/line\/0\/text: \{twice\} is a result of the solver, which stands only in a key/);
});

test("the vectors of templates are files, and need the schema of such vectors", () => {
  expectOnly([["format/vectors/templates/a-folder/case.yaml", null, "task: {}\n"]], /templates\/a-folder:0: a vector of templates is a file, <case>\.yaml$/);
  expectOnly([["format/schemas/template-vector.schema.json", null, null]], /^format\/vectors\/templates:0: no schema template-vector\.schema\.json for the vectors of templates$/);
});

test("a template is checked through its instances, as a valid example and as a case of a rule", () => {
  const example = (name, text) => [`format/examples/task/valid/${name}.yaml`, null, text];
  const twoByTwo = "    a: {from: 1, to: 2}\n    b: {from: 1, to: 2}";
  const trapOfB = ', trap_values: [{value: "{b}", trap: off-by-one}]';
  assert.deepEqual(errorsOf([example("fine", constrained("a != b", templateTask(twoByTwo, "{a}", trapOfB)))]), []);
  expectOnly([example("alike", templateTask(twoByTwo, "{a}", trapOfB))], /alike\.yaml:0: breaks task\.trap-values, on the instance a = 1, b = 1$/);
  const shortKeys = taskSchema((schema) => {
    schema.$defs.check.properties.key.maxLength = 3;
  });
  expectOnly([shortKeys, example("long", templateTask("    a: {from: 999, to: 1000}", "{a}"))], /long\.yaml:0: breaks task\.instances, on the instance a = 1000: maxLength at #\/items\/0\/answer_slots\/0\/check\/key/);
  expectOnly([example("plain", 'items:\n  - answer_slots:\n      - binding: anywhere\n        check: {kind: number, key: "{a}"}\n')], /plain\.yaml:0: breaks task\.placeholders$/);
  expectOnly([example("chained", constrained("0 < a < 3", templateTask("    a: {from: 1, to: 2}", "{a}")))], /chained\.yaml:0: breaks task\.template-expressions, the constraint: < and <: comparisons do not chain$/);
  const listed = ["format/README.md", "| `sample.known-tag` |", "| `task.template-instances` | A rule of a template. |\n| `sample.known-tag` |"];
  const vector = (text) => ["format/vectors/rules/task.template-instances/a-case.yaml", null, text];
  assert.deepEqual(errorsOf([listed, vector(constrained("a > 2", templateTask("    a: {from: 1, to: 2}", "{a}")))]), []);
  expectOnly([listed, vector(templateTask("    a: {from: 1, to: 2}", "{a}"))], /a-case\.yaml:0: breaks no task\.template-instances$/);
});

test("a lesson that names a template is searched for the key of every instance", () => {
  const layout = ["format/README.md", "| `media/<path>` | — | Pictures and sound. |", "| `tasks/<id>.yaml` | `task` | Tasks. |\n| `lessons/<id>.yaml` | `lesson` | Lessons. |\n| `media/<path>` | — | Pictures and sound. |"];
  const schema = ["format/schemas/lesson.schema.json", null, LESSON_SCHEMA];
  const at = "format/examples/module/valid/with-a-template";
  const folder = (title) => [
    [`${at}/manifest.yaml`, null, MANIFEST],
    [`${at}/LICENSE`, null, LICENSE],
    [`${at}/tasks/seven.yaml`, null, templateTask("    a: {from: 6, to: 7}", "{a}")],
    [`${at}/lessons/ladder.yaml`, null, `title: ${title}\nsegments:\n  - task: seven\n`],
  ];
  assert.deepEqual(errorsOf([layout, schema, ...folder("A ladder of 8 rungs")]), []);
  expectOnly([layout, schema, ...folder("A ladder of 7 rungs")], /with-a-template\/lessons\/ladder\.yaml:0: breaks lesson\.no-leaks$/);
});

test("common defines local_id and media_path, by which <id> and module.media read names", () => {
  expectEach([commonSchema((s) => delete s.$defs.local_id)], [/common\.schema\.json:0: defines no local_id, by which the layout's <id> and module\.media read names/, /sample\.schema\.json:\d+: \$ref "common\.schema\.json#\/\$defs\/local_id": common\.schema\.json defines no local_id/, unchecked]);
  // Without media_path, module.media goes unchecked, and its vector breaks nothing that is said.
  expectOnly([commonSchema((s) => delete s.$defs.media_path)], /common\.schema\.json:0: defines no media_path/);
});

// The real vectors: each case shows what its name says, so that a vector an editor saved again does
// not quietly become another.

const vectors = path.join(spec, "format", "vectors", "rules");
const caseOf = (file) => fs.readFileSync(path.join(vectors, file));

test("spec's vectors hold the bytes their names say", () => {
  assert.deepEqual([...caseOf("yaml.encoding/byte-order-mark.yaml").subarray(0, 3)], [0xef, 0xbb, 0xbf]);
  const latin = caseOf("yaml.encoding/latin-1.yaml");
  assert.ok(latin.includes(0xe9) && !latin.includes(0xc3), "latin-1.yaml holds é as the one byte 0xE9");
  assert.ok(caseOf("yaml.characters/written-noncharacter.yaml").includes(Buffer.from([0xef, 0xb7, 0x90])), "U+FDD0 as UTF-8");
  const escapes = {
    "yaml.characters/escaped-surrogate.yaml": '"\\ud800"',
    "yaml.characters/escaped-surrogate-pair.yaml": '"\\ud83d\\ude00"',
    "yaml.characters/long-escaped-surrogate.yaml": '"\\U0000D800"',
    "yaml.characters/escaped-noncharacter.yaml": '"\\uFFFE"',
    "yaml.characters/astral-noncharacter.yaml": '"\\U0010FFFF"',
    "yaml.characters/noncharacter-in-key.yaml": '"\\uFDD0":',
    "yaml.characters/escaped-slash.yaml": '"a\\/b"',
    "yaml.unique-keys/escaped-key.yaml": '"\\u0074itle":',
  };
  for (const [file, text] of Object.entries(escapes)) assert.ok(caseOf(file).toString("latin1").includes(text), `${file} holds ${text}`);
});

test("spec's pictures are PNG, as their names say, and the vectors of module.media hold what theirs say", () => {
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const bytesOf = (file, count) => [...fs.readFileSync(path.join(spec, "format", file)).subarray(0, count)];
  for (const file of ["examples/module/valid/with-media-and-notice/media/pictures/dot.png", "examples/module/valid/with-tasks/media/pictures/dot.png", "vectors/rules/module.layout/media-at-root/dot.png", "vectors/rules/module.media/name-in-capitals/media/Pictures/dot.png", "vectors/rules/module.media/jpeg-holding-png/media/pictures/dot.jpg"]) {
    assert.deepEqual(bytesOf(file, 8), png, file);
  }
  const media = "vectors/rules/module.media";
  assert.deepEqual(bytesOf(`${media}/png-holding-jpeg/media/pictures/dot.png`, 3), [0xff, 0xd8, 0xff]);
  assert.equal(Buffer.from(bytesOf(`${media}/webp-holding-wave/media/pictures/dot.webp`, 12)).toString("latin1").replace(/^RIFF.{4}/s, ""), "WAVE");
  assert.equal(Buffer.from(bytesOf(`${media}/gif/media/pictures/dot.gif`, 6)).toString("latin1"), "GIF89a");
  assert.equal(fs.readFileSync(path.join(spec, "format", `${media}/mp3-holding-text/media/sounds/bell.mp3`), "utf8"), "A bell rings.\n");
});

test("spec's vectors of yaml.plain-strings hold the words their names say", () => {
  for (const word of ["y", "n", "yes", "no", "on", "off", "true", "false", "null"]) {
    const value = caseOf(`yaml.plain-strings/${word}.yaml`).toString().split(": ")[1].trim();
    assert.equal(value.toLowerCase(), word);
    assert.notEqual(value, ["true", "false", "null"].includes(word) ? word : null, `${word}.yaml writes ${word} in another case`);
  }
});

// What the review of T25 found, each kept by a test.

test("with no VERSION, a schema with no $id is named, and nothing crashes", () => {
  expectEach(
    [["format/VERSION", "", null], commonSchema((s) => delete s.$id), sampleSchema((s) => delete s.$id)],
    [/^format\/VERSION:0: the format's version is missing/, /common\.schema\.json:\d+: \$id is .*<MAJOR\.MINOR>\/common\.schema\.json/, /sample\.schema\.json:\d+: \$id is .*<MAJOR\.MINOR>\/sample\.schema\.json/, unchecked],
  );
});

test("a condition in another schema reads its own references there", () => {
  // common's base names kind in an if, through a definition of common; sample has a cond of its own.
  const edits = [
    commonSchema((s) => {
      s.$defs.cond = { properties: { kind: { const: "a" } } };
      s.$defs.base.if = { $ref: "#/$defs/cond" };
      s.$defs.base.then = { required: ["id"] };
    }),
    sampleSchema((s) => (s.$defs = { cond: { properties: { other: { const: "x", description: "A definition no if names." } } } })),
  ];
  assert.deepEqual(errorsOf(edits), []);
});

test("a definition that serves only as a condition is a condition", () => {
  assert.deepEqual(errorsOf([sampleSchema((s) => {
    s.$defs = { high: { properties: { level: { const: "high" }, details: { properties: { note: { const: "x" } } } }, required: ["level"] } };
    s.if = { $ref: "#/$defs/high" };
  })]), []);
});

test("a part a branch reaches first still counts when a part that always applies reaches it", () => {
  assert.deepEqual(errorsOf([sampleSchema((s) => {
    s.$defs = { a: { properties: { extra: { type: "string", description: "An extra." } } }, b: { anyOf: [{ $ref: "#/$defs/a" }, { required: ["title"] }] } };
    s.allOf = [{ $ref: "#/$defs/b" }, { $ref: "#/$defs/a" }];
    s.if.properties.extra = { const: "x" };
  })]), []);
});

test("only a table headed ID lists rules", () => {
  assert.deepEqual(errorsOf([["format/README.md", "## 7. Format rules", "| File | What it holds |\n|---|---|\n| \x60task.yaml\x60 | A task. |\n\n## 7. Format rules"]]), []);
  expectOnly([["format/README.md", "| \x60sample.known-tag\x60 |", "| \x60Sample.Tag\x60 | Another. |\n| \x60sample.known-tag\x60 |"]], /README\.md:\d+: "Sample\.Tag": a rule's ID is <part>\.<name>/);
});

test("a schema that reaches a broken one through another is not compiled, in one line", () => {
  expectEach(
    [commonSchema((s) => delete s.title), ["format/schemas/other.schema.json", null, JSON.stringify({ $schema: "https://json-schema.org/draft/2020-12/schema", $id: "https://altnovatrail.github.io/spec/format/0.1/other.schema.json", title: "Other", description: "Another part.", $ref: "sample.schema.json", unevaluatedProperties: false })]],
    [/common\.schema\.json:\d+: the root has title/, /sample\.schema\.json:1: not compiled: it refers to common\.schema\.json/, /other\.schema\.json:1: not compiled: it refers to sample\.schema\.json/, unchecked],
  );
});

// The vectors of packages and of tiers (sections 9, 12 and 25; RUN.md, T34): fixtures/packages adds
// to the base fixture the schemas of a canonical view, an inventory and the two kinds of vectors, a
// vector of tiers and a vector of the package of the smallest trial module.

const packages = path.join(here, "fixtures", "packages");
const PACKAGE = "format/vectors/packages/smallest";
const TIERS = "format/vectors/tiers/chain.yaml";

// The edits that write a fixture's format/ into a trial copy.
function fixtureEdits(fixture) {
  const edits = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(path.join(fixture, dir), { withFileTypes: true })) {
      const file = path.posix.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else edits.push([file, null, fs.readFileSync(path.join(fixture, file), "utf8")]);
    }
  };
  walk("format");
  return edits;
}

// The edits that write fixtures/packages into a trial copy.
const packageFixture = () => fixtureEdits(packages);

test("the fixture of packages is green: its examples build canonical views, and its vectors hold", () => {
  const root = trialCopy(packageFixture());
  try {
    const { errors, stats } = checkFormat(root);
    assert.deepEqual(errors, []);
    assert.deepEqual([stats.schemas, stats.tiers, stats.packages], [12, 1, 1]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a vector of tiers gives the tier that section 12 computes for each skill", () => {
  expectOnly([...packageFixture(), [TIERS, "second: 2", "second: 3"]], /chain\.yaml:0: the tiers are not those of section 12: they differ at #\/skill_tiers\/second/);
  expectOnly([...packageFixture(), [TIERS, "first: {}", "first: {prerequisites: [second]}"]], /chain\.yaml:0: the prerequisites of \w+ run in a cycle/);
  expectOnly([...packageFixture(), [TIERS, "first: 1", "first: one"]], /chain\.yaml:0: does not pass the schema of tier vectors: type at #\/skill_tiers\/first/);
  expectOnly([...packageFixture(), ["format/schemas/tier-vector.schema.json", "", null]], /^format\/vectors\/tiers:0: no schema tier-vector\.schema\.json for the vectors of tiers/);
  expectOnly([...packageFixture(), ["format/vectors/tiers/chain/case.yaml", null, "a: 1\n"]], /tiers\/chain:0: a vector of tiers is a file, <case>\.yaml/);
});

test("a vector of packages gives the package that section 25 builds of its module", () => {
  const digest = /digest: "sha256:([0-9a-f]{64})"\n$/;
  const edit = (from, to) => [`${PACKAGE}/package.yaml`, from, to];
  expectOnly([...packageFixture(), edit('title: "A trial module"\ndevice_part', 'title: "Another"\ndevice_part')], /smallest\/package\.yaml:0: server_part is not the canonical view of the module: they differ at #\/server_part\/manifest\/title/);
  expectOnly([...packageFixture(), edit("size: 32", "size: 33")], /smallest\/package\.yaml:0: device_part is not the listing of the device part of the module: they differ at #\/device_part\/license\/size/);
  expectOnly([...packageFixture(), edit("size: 109", "size: 110")], /smallest\/package\.yaml:0: inventory is not the inventory of the module: they differ at #\/inventory\/server_part\/size/);
  const text = fs.readFileSync(path.join(packages, PACKAGE, "package.yaml"), "utf8");
  const given = text.match(digest)[1];
  expectOnly([...packageFixture(), edit(given, "0".repeat(64))], new RegExp(`smallest/package\\.yaml:0: the digest of the package is sha256:${given}, not sha256:0{64}`));
  expectOnly([...packageFixture(), edit("digest: ", "digest: sha256:")], /smallest\/package\.yaml:0: does not pass the schema of package vectors: pattern at /);
});

test("the module of a vector of packages is checked as an example of a whole module, and builds a package", () => {
  expectOnly([...packageFixture(), [`${PACKAGE}/module/LICENSE`, "", null]], /smallest\/module:0: module\.license: the folder holds no LICENSE/);
  expectOnly([...packageFixture(), [`${PACKAGE}/module/manifest.yaml`, 'id: trial/smallest\n', ""]], /smallest\/module:0: the manifest names no id, which the inventory names/);
  expectOnly([...packageFixture(), [`${PACKAGE}/notes.txt`, null, "Notes.\n"]], /packages\/smallest:0: a vector of packages holds the folder module\/ and package\.yaml, and nothing else/);
  expectOnly([...packageFixture(), ["format/vectors/packages/a-file.yaml", null, "a: 1\n"]], /packages\/a-file\.yaml:0: a vector of packages is a folder <case>\//);
  expectOnly([...packageFixture(), ["format/schemas/package-vector.schema.json", "", null]], /^format\/vectors\/packages:0: no schema package-vector\.schema\.json for the vectors of packages/);
  // A layout with errors leaves the vectors of packages unchecked, as it leaves every case laid out as
  // a module.
  expectEach([...packageFixture(), ["format/README.md", "| `sample.yaml` | `sample` |", "| `sample.yaml` | `Sample` |"]], [/README\.md:\d+: "Sample": a part is a term in kebab-case/, /README\.md:0: the cases laid out as a module go unchecked until the layout of a module is fixed/]);
});

test("the canonical view of an example of a whole module passes the schema of a canonical view", () => {
  const view = "format/schemas/canonical-view.schema.json";
  expectOnly([...packageFixture(), [view, '"sample": {', '"other": {']], /with-sample:0: its canonical view does not pass the schema of a canonical view: unevaluatedProperties at #/);
  // Without it, the examples build no canonical view to check, and the schemas that refer to it break.
  expectEach([...packageFixture(), [view, "", null]], [/package-vector\.schema\.json:\d+: \$ref "canonical-view\.schema\.json": no schema canonical-view\.schema\.json/, /tier-vector\.schema\.json:\d+: \$ref "canonical-view\.schema\.json#\/\$defs\/skill_tiers": no schema/, /(package|tier)-vector\.schema\.json:0: its examples and vectors go unchecked/]);
});

test("LICENSE is in every module and not empty, and LICENSE and NOTICE are plain text", () => {
  const notice = "format/examples/module/valid/with-sample/NOTICE";
  expectOnly([["format/examples/module/valid/smallest/LICENSE", null, ""]], /smallest\/LICENSE:0: module\.license: is empty/);
  expectOnly([[notice, null, "﻿Notices.\n"]], /with-sample\/NOTICE:0: module\.plain-text: begins with a byte order mark/);
  expectOnly([[notice, null, "Notices.\r\n"]], /with-sample\/NOTICE:0: module\.plain-text: holds a carriage return at byte 9/);
  const latin = errorsOf([], (root) => fs.writeFileSync(path.join(root, notice), Buffer.from([0x52, 0xe9, 0x0a])));
  assert.deepEqual(latin, ["format/examples/module/valid/with-sample/NOTICE:0: module.plain-text: byte 2 is not UTF-8"]);
});

// spec's real format/, in a copy: a vector of packages whose template has a solver, and an example
// whose canonical view cannot be built.

function realErrorsOf(edits) {
  return realErrorsWith((root) => {
    for (const [file, from, to] of edits) {
      const target = path.join(root, file);
      const text = fs.readFileSync(target, "utf8");
      assert.ok(text.includes(from), `${file} has no "${from}"`);
      fs.writeFileSync(target, text.replace(from, () => to));
    }
  });
}

// The errors of spec's real format/ in a copy, after change(root).
function realErrorsWith(change) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "format-check-real-"));
  try {
    fs.cpSync(path.join(spec, "format"), path.join(root, "format"), { recursive: true });
    change(root);
    return checkFormat(root).errors.map((e) => `${e.file}:${e.line}: ${e.message}`);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test("a vector of packages gives the results of a solver on every instance, and spec takes them as given", () => {
  const solver = "format/vectors/packages/with-solver/package.yaml";
  const first = "      - left: 2\n        to_ben: 3\n        before_ben: 5\n        sweets: 10\n";
  assert.deepEqual(realErrorsOf([]), []);
  // What is wrong with the results given is the vector's, not its module's.
  assert.deepEqual(realErrorsOf([[solver, first, ""]]), ["format/vectors/packages/with-solver/package.yaml:0: the results of the solver of number-thought-of are given for 34 instances, and it has 35"]);
  assert.deepEqual(realErrorsOf([[solver, first, first.replace("        sweets: 10\n", "")]]), ["format/vectors/packages/with-solver/package.yaml:0: the results of the solver of number-thought-of are not all given on instance 0: each of sweets is"]);
  // A wrong result is the vector's: spec cannot tell it, but the digests that pin the server part can.
  const digests = [/with-solver\/package\.yaml:0: inventory is not the inventory of the module: they differ at #\/inventory\/server_part\/digest/, /with-solver\/package\.yaml:0: the digest of the package is sha256:[0-9a-f]{64}, not sha256:b079e37e/];
  expectEachOf(realErrorsOf([[solver, first, first.replace("sweets: 10", "sweets: 11")]]), digests);
  // A result that makes its instance break a rule of a task: a key of 5 is the trap value before_ben.
  expectEachOf(realErrorsOf([[solver, first, first.replace("sweets: 10", "sweets: 5")]]), [...digests, /with-solver\/package\.yaml:0: the instance left = 2, to_ben = 3 of number-thought-of, with the results of its solver that the vector gives, breaks task\.trap-values/]);
});

test("the canonical view holds the tiers when it holds a skill graph, and only then", () => {
  const lessons = "format/vectors/packages/with-lessons/package.yaml";
  assert.deepEqual(realErrorsOf([[lessons, "  skill_tiers:\n    counting-gaps: 1\n    time-calendar: 2\n", ""]]), ["format/vectors/packages/with-lessons/package.yaml:0: does not pass the schema of package vectors: dependentRequired at #/server_part: must have property skill_tiers when property skill_graph is present"]);
});

test("an example whose skills need each other in a cycle builds no canonical view", () => {
  const graph = "format/examples/module/valid/with-skill-graph/skill-graph.yaml";
  const text = fs.readFileSync(path.join(spec, graph), "utf8");
  const [, first] = text.match(/^  ([a-z-]+):$/m);
  const errors = realErrorsOf([[graph, `  ${first}:\n`, `  ${first}:\n    prerequisites: [${first}]\n`]]);
  assert.deepEqual(errors, [`format/examples/module/valid/with-skill-graph:0: its canonical view cannot be built: the prerequisites of ${first} run in a cycle: its tier is no number`]);
});

// The vectors of the module index (sections 9 and 26; RUN.md, T44): fixtures/indexes adds to the
// fixture of packages the schemas of the module index and of its vectors, an example of the index, a
// vector of a first release and a refusal by each rule of the index, and the text lists those rules.

const indexes = path.join(here, "fixtures", "indexes");
const FIRST = "format/vectors/indexes/first-release";
const INDEX_ROWS = [
  "| `module-index.entries-kept` | Every entry of the previous index MUST stand in the new one as it was. |\n",
  "| `module-index.one-package` | A version of a module MUST have one package. |\n",
  "| `module-index.known-withdrawals` | A withdrawal MUST name a version that the new index names. |\n",
];

// The edits that write fixtures/indexes into a trial copy, over the fixture of packages, and the
// rules of the index into its text.
function indexFixture() {
  const section = `## 26. The module index\n\n| ID | Rule |\n|---|---|\n${INDEX_ROWS.join("")}\n## 11. The manifest`;
  return [...packageFixture(), ["format/README.md", "## 11. The manifest", section], ...fixtureEdits(indexes)];
}

const firstEdit = (from, to) => [`${FIRST}/index.yaml`, from, to];

test("the fixture of the module index is green: its example holds, and its vectors build or refuse", () => {
  const root = trialCopy(indexFixture());
  try {
    const { errors, stats } = checkFormat(root);
    assert.deepEqual(errors, []);
    assert.deepEqual([stats.schemas, stats.rules, stats.indexes], [14, 18, 4]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a vector of the module index gives the index that section 26 builds of its release", () => {
  expectOnly([...indexFixture(), firstEdit("        release: v0.1.0", "        release: v0.2.0")], /first-release\/index\.yaml:0: index is not the index that the release builds: they differ at #\/index\/modules\/trial~1smallest\/0\.1\.0\/release/);
  expectOnly([...indexFixture(), firstEdit("release: v0.1.0\nindex", "release: 1\nindex")], /first-release\/index\.yaml:0: does not pass the schema of index vectors: type at #\/release/);
  expectOnly([...indexFixture(), firstEdit('  module_format_version: "0.1"\n  modules', '  module_format_version: "0.2"\n  modules')], /first-release\/index\.yaml:0: index: the index names the format version 0\.2: it names 0\.1/);
  const republished = "format/vectors/indexes/republished/index.yaml";
  expectOnly([...indexFixture(), [republished, 'previous:\n  module_format_version: "0.1"', 'previous:\n  module_format_version: "0.2"']], /republished\/index\.yaml:0: previous: the index names the format version 0\.2, newer than 0\.1, which format\/VERSION has/);
  assert.deepEqual(errorsOf([...indexFixture(), [republished, 'previous:\n  module_format_version: "0.1"', 'previous:\n  module_format_version: "0.0"']]), []);
  expectOnly([...indexFixture(), firstEdit("index:\n", 'withdrawals:\n  trial/smallest:\n    "0.2.0": answer_leak\nindex:\n')], /first-release\/index\.yaml:0: the build is refused, and the case names no refusal: module-index\.known-withdrawals: the release withdraws trial\/smallest 0\.2\.0, which the index does not name/);
});

test("a refusal among the vectors of the index breaks its rule and no other", () => {
  const republished = "format/vectors/indexes/republished/index.yaml";
  expectOnly([...indexFixture(), [republished, `sha256:${"0".repeat(64)}`, "sha256:ed03ae1351e9201bee973e7143609b16cd372cd3f56f4bd471ae727839849ab2"]], /republished\/index\.yaml:0: the build breaks no module-index\.one-package/);
  const another = "format/vectors/indexes/another-reason/index.yaml";
  expectOnly([...indexFixture(), [another, '"0.1.0": answer_leak\n', '"0.1.0": answer_leak\n    "0.3.0": wrong_key\n']], /another-reason\/index\.yaml:0: breaks module-index\.known-withdrawals too: the release withdraws trial\/smallest 0\.3\.0/);
});

test("each rule of the index has a refusal among its vectors, and none in vectors/rules/", () => {
  expectOnly([...indexFixture(), ["format/vectors/indexes/republished", "", null]], /^format\/README\.md:\d+: module-index\.one-package has no refusal among the vectors of the module index in format\/vectors\/indexes\//);
  expectOnly([...indexFixture(), ["format/vectors/rules/module-index.one-package/case.yaml", null, "a: 1\n"]], /module-index\.one-package:0: a rule of the module index refuses to build an index: its vectors are refusals among the vectors of the index, in vectors\/indexes\//);
  // A format with a schema of the module index lists its rules; one without lists none (the base fixture).
  expectEach([...indexFixture(), ["format/README.md", INDEX_ROWS.join(""), ""]], [/README\.md:0: format-check checks module-index\.entries-kept, and the text does not list it/, /README\.md:0: format-check checks module-index\.one-package, and the text does not list it/, /README\.md:0: format-check checks module-index\.known-withdrawals, and the text does not list it/, /index\.yaml:0: format\/README\.md lists no rule module-index\./]);
  expectEach([...indexFixture(), ["format/README.md", INDEX_ROWS[1], ""]], [/^format\/README\.md:0: format-check checks module-index\.one-package, and the text does not list it/, /republished\/index\.yaml:0: format\/README\.md lists no rule module-index\.one-package/]);
  expectEach([...indexFixture(), ["format/README.md", INDEX_ROWS[2], `${INDEX_ROWS[2]}| \`module-index.other\` | Another rule. |\n`]], [/README\.md:\d+: format-check does not check module-index\.other: tools\/format-check\/index\.mjs has to/, /README\.md:\d+: module-index\.other has no refusal among the vectors of the module index/]);
});

test("a vector of the module index is a folder of modules/ and index.yaml, and its modules are held as examples", () => {
  expectOnly([...indexFixture(), [`${FIRST}/notes.txt`, null, "Notes.\n"]], /indexes\/first-release:0: a vector of the module index holds the folder modules\/ and index\.yaml, and nothing else/);
  expectOnly([...indexFixture(), ["format/vectors/indexes/a-file.yaml", null, "a: 1\n"]], /indexes\/a-file\.yaml:0: a vector of the module index is a folder <case>\//);
  expectOnly([...indexFixture(), [`${FIRST}/modules/notes.txt`, null, "Notes.\n"]], /first-release\/modules\/notes\.txt:0: modules\/ holds a folder <name>\/ for each module of the release, its name in kebab-case, laid out as a module, and nothing else/);
  expectOnly([...indexFixture(), [`${FIRST}/modules/Smallest/manifest.yaml`, null, "a: 1\n"]], /first-release\/modules\/Smallest:0: modules\/ holds a folder <name>\/ for each module of the release, its name in kebab-case/);
  expectOnly([...indexFixture(), [`${FIRST}/modules/smallest/LICENSE`, "", null]], /first-release\/modules\/smallest:0: module\.license: the folder holds no LICENSE/);
  expectOnly([...indexFixture(), [`${FIRST}/modules/smallest/manifest.yaml`, "id: trial/smallest\n", ""]], /first-release\/modules\/smallest:0: the manifest names no id, which the inventory names/);
  expectOnly([...indexFixture(), ["format/schemas/index-vector.schema.json", "", null]], /^format\/vectors\/indexes:0: no schema index-vector\.schema\.json for the vectors of the module index/);
  expectEach([...indexFixture(), ["format/README.md", "| `sample.yaml` | `sample` |", "| `sample.yaml` | `Sample` |"]], [/README\.md:\d+: "Sample": a part is a term in kebab-case/, /README\.md:0: the cases laid out as a module go unchecked until the layout of a module is fixed/]);
});

test("a valid example of the module index names the format version in VERSION and lists teaches in order", () => {
  const example = "format/examples/module-index/valid/one.yaml";
  expectOnly([...indexFixture(), [example, "[core.reading, core.writing]", "[core.writing, core.reading]"]], /one\.yaml:0: the teaches of trial\/smallest 0\.1\.0 are not in the order of code units: core\.reading, core\.writing/);
  expectOnly([...indexFixture(), [example, 'module_format_version: "0.1"\nmodules', 'module_format_version: "0.2"\nmodules']], /one\.yaml:0: the index names the format version 0\.2: it names 0\.1, as format\/VERSION has it/);
});

// spec's real format/, in a copy: the anchor skills of an entry, and a module with a solver in a
// vector of the index.

test("an entry of the index lists the anchor skills that its version teaches, and a module with a solver is no module of a release", () => {
  const first = "format/vectors/indexes/first-release/index.yaml";
  const taught = "teaches: [core.division-with-remainder, core.multiplication-table]";
  assert.deepEqual(realErrorsOf([[first, taught, "teaches: [core.multiplication-table]"]]), [`${first}:0: index is not the index that the release builds: they differ at #/index/modules/example~1times-tables/0.1.0/teaches`]);
  const solver = realErrorsWith((root) => fs.cpSync(path.join(root, "format/vectors/packages/with-solver/module"), path.join(root, "format/vectors/indexes/first-release/modules/with-solver"), { recursive: true }));
  assert.deepEqual(solver, ["format/vectors/indexes/first-release/modules/with-solver:0: the template number-thought-of has a solver: spec runs none, so a module of a vector of the index has no solver"]);
});
