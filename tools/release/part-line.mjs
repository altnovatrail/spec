// part-line: a new version of a normative part with a version of its own starts a new line of
// spec's releases, as a new version of the module format does (R44): the admission table (R96;
// admission-line.mjs), the deployment configuration (R85; deployment-line.mjs) and the legal texts
// (R130; legal-line.mjs) hold their releases to it by this one rule, each with its part. release-version passes its lines through each
// part's script, with the commit, and the script prints the same lines, or refuses.
//
// Only a commit that gets a release is checked, and only against a release that carried the part,
// of the part's first line or a later one: the releases before it had none. Then the part's VERSION
// at the commit and at the release before it, previous=, are the same version, in the same line or
// a raised one; or another version, only a higher one and only in a raised line, so that a line
// holds one version of the part. What the part's text makes a new version, changed under the same
// version, is refused too. git runs in the repository the recipe runs it from.
//
// A part is { file, name, decision, firstLine, parse, below, rule }: the path of its VERSION; its
// name in a sentence, "the admission table"; the decision that sets the rule; the first line whose
// releases carry it; parse, the version of the text of its VERSION, or an error; below(now, then),
// whether a version is below another; and rule, what its text makes a new version, in a sentence.
//
// A part whose every change of shape is a new version — the deployment configuration and the legal
// texts — holds its releases to the shape alone, by shapeChange: its schema with its annotations
// taken out at every level, and the IDs of the rules of section 5 of its text, in their order.

import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { readText } from "../format-check/cases.mjs";
import { compareLines } from "./version.mjs";
import { lineOf, readOutputs } from "./format-line.mjs";
import { GIT, byCodeUnits } from "../shared.mjs";

// Whether the release of version, after previous, is held to the part's version at all.
export function checked(part, { version, previous }) {
  return Boolean(version) && Boolean(previous) && compareLines(lineOf(previous), part.firstLine) >= 0;
}

// The rule, for the release of version after previous, with the part's versions at each, now and
// before, and what changed between them that its text makes a new version, as a phrase — "the table
// changed" — or null.
export function checkPartLine(part, { version, previous, now, before, changed = null }) {
  if (now === before) {
    if (changed) throw new Error(`${changed} after ${previous}, and ${part.file} is still ${now}: ${part.rule}, in a new line (${part.decision})`);
    return;
  }
  // A version that went back is refused first, whatever the line: a raised line would not let it
  // pass.
  if (part.below(now, before)) {
    throw new Error(`${part.file} is ${now}, below ${before} at ${previous}: a version of ${part.name} never goes back, and undoing a change is a new version too (${part.decision})`);
  }
  const previousLine = lineOf(previous);
  if (compareLines(lineOf(version), previousLine) <= 0) {
    throw new Error(`${part.file} is ${now}, and at ${previous} it was ${before}: a new version of ${part.name} starts a new line, so raise RELEASE_LINE above ${previousLine} in the same change (${part.decision})`);
  }
}

// A file at a commit or tag, by git in the repository at cwd, or null when the revision has none.
export function fileAt(revision, file, cwd = process.cwd()) {
  const shown = spawnSync(GIT, ["show", `${revision}:${file}`], { cwd, encoding: "utf8" });
  return shown.status === 0 ? shown.stdout : null;
}

// The part's version at a commit or tag.
function versionAt(part, revision, cwd) {
  const text = fileAt(revision, part.file, cwd);
  if (text === null) throw new Error(`no ${part.file} at ${revision}`);
  return part.parse(text);
}

// release-version's lines, input, once the rule has held for the release of commit, in the
// repository at cwd, with changedBetween(commit, previous, cwd) what changed that the part's text
// makes a new version, or null. Throws when the rule does not hold.
export function partLineOutput(part, changedBetween, { input, commit = "", cwd = process.cwd() }) {
  const outputs = readOutputs(input);
  if (checked(part, outputs)) {
    if (!/^[0-9a-f]{40,64}$/.test(commit)) throw new Error(`the commit is '${commit}', not a SHA`);
    checkPartLine(part, { ...outputs, now: versionAt(part, commit, cwd), before: versionAt(part, outputs.previous, cwd), changed: changedBetween(commit, outputs.previous, cwd) });
  }
  return input;
}

// The script of a part: reads release-version's lines from stdin and prints them, or refuses.
// Takes nothing from its command line but the commit.
export function runPartLine(part, changedBetween) {
  try {
    process.stdout.write(partLineOutput(part, changedBetween, { input: fs.readFileSync(0, "utf8"), commit: process.argv[2] }));
  } catch (error) {
    console.error(`release-version: ${error.message}`);
    process.exitCode = 1;
  }
}

// The keywords that annotate a schema and shape nothing (JSON Schema 2020-12, Validation 9).
const ANNOTATIONS = new Set(["title", "description", "$comment", "examples"]);
// Where a keyword holds a subschema, a list of them or a map of them, as format-check walks them:
// the names of a map, such as a field named title under properties, are no keywords.
const ONE = new Set(["not", "if", "then", "else", "items", "contains", "additionalProperties", "propertyNames", "unevaluatedProperties"]);
const LIST = new Set(["allOf", "anyOf", "oneOf", "prefixItems"]);
const MAP = new Set(["$defs", "properties", "patternProperties", "dependentSchemas"]);

// The shape of a schema: the schema with its annotations taken out at every level, as JSON with
// the keys of each object in the order of code units, so that two shapes compare as text.
export function shapeOf(schema) {
  const strip = (node) => {
    if (Array.isArray(node)) return node;
    if (node === null || typeof node !== "object") return node;
    const kept = {};
    for (const key of Object.keys(node).sort(byCodeUnits)) {
      if (ANNOTATIONS.has(key)) continue;
      const value = node[key];
      if (ONE.has(key)) kept[key] = strip(value);
      else if (LIST.has(key) && Array.isArray(value)) kept[key] = value.map(strip);
      else if (MAP.has(key) && value !== null && typeof value === "object" && !Array.isArray(value)) {
        kept[key] = Object.fromEntries(Object.keys(value).sort(byCodeUnits).map((name) => [name, strip(value[name])]));
      } else kept[key] = sortedValue(value);
    }
    return kept;
  };
  return JSON.stringify(strip(schema));
}

// A value that is no subschema, such as an enum or a const, with the keys of its objects in order.
function sortedValue(value) {
  if (Array.isArray(value)) return value.map(sortedValue);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort(byCodeUnits).map((key) => [key, sortedValue(value[key])]));
}

// The IDs of the rules the text lists, in their order.
export function ruleIdsOf(readme) {
  return readText(readme).rules.map((rule) => rule.id);
}

// What changed of the shape between two versions of a part's schema and of its text, each its
// text or null when the revision has none, with shaped the paths of both, { schema, readme }: a
// phrase for each that changed, joined, or null.
export function shapeChange(shaped, { schemaNow, schemaThen, readmeNow, readmeThen }) {
  const shape = (text, at) => {
    if (text === null) return null;
    try {
      return shapeOf(JSON.parse(text));
    } catch (error) {
      throw new Error(`${shaped.schema} at ${at} is not JSON: ${error.message}`);
    }
  };
  const ids = (text) => JSON.stringify(text === null ? [] : ruleIdsOf(text));
  const changes = [];
  if (shape(schemaNow, "the commit") !== shape(schemaThen, "the release before")) changes.push(`the shape of ${shaped.schema} changed`);
  if (ids(readmeNow) !== ids(readmeThen)) changes.push(`the IDs of the rules of ${shaped.readme}, section 5, changed`);
  return changes.length ? changes.join(", and ") : null;
}

// What changed of the shape of the part that shaped names between previous and revision, in the
// repository at cwd.
export function shapeChangedBetween(shaped, revision, previous, cwd = process.cwd()) {
  const at = (revisionOf, file) => fileAt(revisionOf, file, cwd);
  return shapeChange(shaped, { schemaNow: at(revision, shaped.schema), schemaThen: at(previous, shaped.schema), readmeNow: at(revision, shaped.readme), readmeThen: at(previous, shaped.readme) });
}
