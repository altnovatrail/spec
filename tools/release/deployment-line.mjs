// deployment-line: a new version of the deployment configuration starts a new line of spec's
// releases (R85), by the rule of part-line.mjs. In spec, `just release-version` passes what
// admission-line.mjs prints through it, with the commit, and it prints the same lines, or refuses:
//
//   ... | node tools/release/admission-line.mjs <commit> | node tools/release/deployment-line.mjs <commit>
//
// The configuration is held from a release of FIRST_DEPLOYMENT_LINE on. Every change of the file's
// shape is a new version (deployment/README.md, section 2), and the release holds it to the shape
// alone: deployment/schemas/deployment.schema.json with its annotations taken out at every level,
// and the IDs of the rules of section 5, in their order, which readText reads as format-check
// does. Under the same version a change of either is refused; one of reading-vector.schema.json,
// of a description, an example or a vector passes. A rule is held by its ID, so a rule that comes
// to allow or refuse another value takes a new ID.

import { readText } from "../format-check/cases.mjs";
import { FIRST_DEPLOYMENT_LINE, deploymentVersion } from "./files.mjs";
import { checkPartLine, checked as partChecked, fileAt, runPartLine } from "./part-line.mjs";
import { byCodeUnits, isMain } from "../shared.mjs";

const SCHEMA = "deployment/schemas/deployment.schema.json";
const README = "deployment/README.md";

export const DEPLOYMENT = {
  file: "deployment/VERSION",
  name: "the deployment configuration",
  decision: "R85",
  firstLine: FIRST_DEPLOYMENT_LINE,
  parse: deploymentVersion,
  below: (now, then) => Number(now) < Number(then),
  rule: "every change of the deployment configuration's shape is a new version",
};

// The keywords that annotate a schema and shape nothing (JSON Schema 2020-12, Validation 9).
const ANNOTATIONS = new Set(["title", "description", "$comment", "examples"]);
// Where a keyword holds a subschema, a list of them or a map of them, as format-check walks them:
// the names of a map, such as a field named title under properties, are no keywords.
const ONE = new Set(["not", "if", "then", "else", "items", "contains", "additionalProperties", "propertyNames", "unevaluatedProperties"]);
const LIST = new Set(["allOf", "anyOf", "oneOf", "prefixItems"]);
const MAP = new Set(["$defs", "properties", "patternProperties", "dependentSchemas"]);

// Whether the release of version, after previous, is held to the configuration's version at all.
export const checked = (outputs) => partChecked(DEPLOYMENT, outputs);

// R85's rule, for the release of version after previous, with the configuration's versions at
// each and what changed of its shape between them, as a phrase, or null.
export function checkDeploymentLine({ version, previous, deploymentNow, deploymentThen, changed = null }) {
  checkPartLine(DEPLOYMENT, { version, previous, now: deploymentNow, then: deploymentThen, changed });
}

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

// What changed of the shape between two versions of the file's schema and of the text, each its
// text or null when the revision has none: a phrase for each that changed, joined, or null.
export function shapeChange({ schemaNow, schemaThen, readmeNow, readmeThen }) {
  const shape = (text, at) => {
    if (text === null) return null;
    try {
      return shapeOf(JSON.parse(text));
    } catch (error) {
      throw new Error(`${SCHEMA} at ${at} is not JSON: ${error.message}`);
    }
  };
  const ids = (text) => JSON.stringify(text === null ? [] : ruleIdsOf(text));
  const changes = [];
  if (shape(schemaNow, "the commit") !== shape(schemaThen, "the release before")) changes.push(`the shape of ${SCHEMA} changed`);
  if (ids(readmeNow) !== ids(readmeThen)) changes.push(`the IDs of the rules of ${README}, section 5, changed`);
  return changes.length ? changes.join(", and ") : null;
}

// What changed of the shape between previous and revision, in the repository at cwd.
export function shapeChangedBetween(revision, previous, cwd = process.cwd()) {
  const at = (revisionOf, file) => fileAt(revisionOf, file, cwd);
  return shapeChange({ schemaNow: at(revision, SCHEMA), schemaThen: at(previous, SCHEMA), readmeNow: at(revision, README), readmeThen: at(previous, README) });
}

if (isMain(import.meta.url)) runPartLine(DEPLOYMENT, shapeChangedBetween);
