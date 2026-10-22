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

const here = path.dirname(fileURLToPath(import.meta.url));
const base = path.join(here, "fixtures", "base");
const spec = path.join(here, "..", "..", "..");
const SAMPLE = "format/schemas/sample.schema.json";
const MANIFEST = 'module_format_version: "0.1"\ntitle: A trial module\n';
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
  const errors = errorsOf(edits);
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

test("the base fixture is green, and its invalid examples pin how ajv names an error", () => {
  const root = trialCopy([]);
  try {
    const { errors, stats } = checkFormat(root);
    assert.deepEqual(errors, []);
    assert.deepEqual(stats, { schemas: 3, examples: 15, vectors: 15, rules: 14 });
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
      /^format\/schemas\/(manifest|sample)\.schema\.json:0: its examples and vectors go unchecked/,
      /(manifest\.yaml|manifest\/valid\/minimal\.yaml):0: names the format version 0\.1: it names 0\.2, as format\/VERSION has it/,
    ],
  );
});

test("a file outside the layout is named", () => {
  expectOnly([["format/notes.txt", null, "notes\n"]], /^format\/notes\.txt:0: format-check does not know it/);
  expectOnly([["format/vectors/open-view/task.yaml", null, "title: A title\n"]], /^format\/vectors\/open-view:0: format-check does not know it/);
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

test("a path of the layout is names joined by /, and may end with <path>", () => {
  expectEach([[README, "| \x60media/<path>\x60 |", "| \x60media/<id>.png\x60 |"]], [/README\.md:\d+: media\/<id>\.png: format-check knows the placeholder <path> only/, waiting]);
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
  assert.deepEqual(errorsOf([["format/vectors/rules/manifest.format-version/in-a-module/manifest.yaml", null, 'module_format_version: "0.0"\ntitle: A trial module\n']]), []);
  expectOnly([["format/vectors/rules/manifest.format-version/in-a-module/manifest.yaml", null, MANIFEST]], /format-version\/in-a-module\/manifest\.yaml:0: names the format version 0\.1, which a reader of 0\.1 reads/);
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

test("spec's pictures are PNG, as their names say", () => {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (const file of ["examples/module/valid/with-media-and-notice/media/pictures/dot.png", "vectors/rules/module.layout/media-at-root/dot.png"]) {
    assert.deepEqual([...fs.readFileSync(path.join(spec, "format", file)).subarray(0, 8)], signature, file);
  }
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
