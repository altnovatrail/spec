// The schemas of the module format, format/schemas/<term>.schema.json: read, checked against the
// conventions of the format text, section 5 (R45 and its amendment of 2026-10-22), and compiled by
// ajv, the JSON Schema 2020-12 validator that checks the examples and the vectors against them.
//
// ajv's strict mode is no check of the conventions: it accepts nullable, definitions, dependencies
// and $dynamicRef, and none of those is the format's. So the conventions are checked on the
// schemas as written, with a walk that knows every place a 2020-12 keyword holds a subschema;
// json-schema-traverse, ajv's own, does not know prefixItems, unevaluatedProperties or
// dependentSchemas.

import fs from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { LineCounter, parseDocument } from "yaml";
import { patternProblem } from "./patterns.mjs";

export const DIALECT = "https://json-schema.org/draft/2020-12/schema";
export const ID_PREFIX = "https://altnovatrail.github.io/spec/format/";

// The keywords a schema may use, by what their values hold (format/README.md, section 5). Left out
// of 2020-12: $anchor, $dynamicRef, $dynamicAnchor and $vocabulary, since a reference names only
// $defs; minContains and maxContains, whose failure ajv names "contains"; unevaluatedItems, whose
// meeting with contains ajv's own test runner skips in the JSON Schema Test Suite; and the content
// keywords, which the format has no use for.
const ONE_SUBSCHEMA = new Set(["not", "if", "then", "else", "items", "contains", "additionalProperties", "propertyNames", "unevaluatedProperties"]);
const SUBSCHEMA_LIST = new Set(["allOf", "anyOf", "oneOf", "prefixItems"]);
const SUBSCHEMA_MAP = new Set(["$defs", "properties", "patternProperties", "dependentSchemas"]);
const DATA = new Set([
  "$ref",
  "$comment",
  "type",
  "enum",
  "const",
  "multipleOf",
  "maximum",
  "exclusiveMaximum",
  "minimum",
  "exclusiveMinimum",
  "maxLength",
  "minLength",
  "pattern",
  "maxItems",
  "minItems",
  "uniqueItems",
  "maxProperties",
  "minProperties",
  "required",
  "dependentRequired",
  "title",
  "description",
  "default",
  "deprecated",
  "readOnly",
  "writeOnly",
  "examples",
  "format",
]);
const ROOT_ONLY = new Set(["$schema", "$id"]);
const KEYWORDS = new Set([...ONE_SUBSCHEMA, ...SUBSCHEMA_LIST, ...SUBSCHEMA_MAP, ...DATA, ...ROOT_ONLY, "x-open"]);

// Where a field's subschema stands, which carries a description and may carry x-open.
const FIELDS = new Set(["properties", "patternProperties", "additionalProperties"]);
// Where an object's place is, besides the root: the subschema there describes a value of its own.
const PLACES = new Set([...FIELDS, "items", "prefixItems", "contains"]);
// What a condition holds is no field and no place.
const CONDITIONS = new Set(["if", "not"]);

// Reads format/schemas/<name>: { name, term, file, json, lineOf, problems }. json is null when the
// file is not JSON; lineOf(path) is the line of the value at a path of keys and indexes.
export function readSchema(root, name) {
  const file = `format/schemas/${name}`;
  const text = fs.readFileSync(path.join(root, file), "utf8");
  const schema = { name, term: name.slice(0, -".schema.json".length), file, json: null, lineOf: () => 1, problems: [] };
  try {
    schema.json = JSON.parse(text);
  } catch (error) {
    schema.problems.push({ line: 1, message: `not JSON: ${error.message}` });
    return schema;
  }
  // JSON is YAML, and yaml keeps where each value is. JSON.parse keeps the last of two equal keys
  // without a word; yaml names the second.
  const lines = new LineCounter();
  const document = parseDocument(text, { uniqueKeys: true, lineCounter: lines, logLevel: "error" });
  schema.lineOf = (at) => {
    for (let length = at.length; length >= 0; length--) {
      const node = document.getIn(at.slice(0, length), true);
      if (node?.range) return lines.linePos(node.range[0]).line;
    }
    return 1;
  };
  for (const error of document.errors) {
    if (error.code === "DUPLICATE_KEY") schema.problems.push({ line: lines.linePos(error.pos[0]).line, message: "a key that its object has already" });
  }
  return schema;
}

// Checks every schema against the conventions, given all of them, for the references between them,
// and the format's version, or null when it cannot be read. Adds what it finds to each schema's
// problems.
export function checkConventions(schemas, version) {
  const byName = new Map(schemas.filter((s) => s.json !== null).map((s) => [s.name, s]));
  const roots = conditionDefinitions(byName);
  for (const schema of byName.values()) {
    const report = (at, message) => schema.problems.push({ line: schema.lineOf(at), message });
    const json = schema.json;
    if (!isObject(json)) {
      report([], "a schema is an object");
      continue;
    }
    if (json.$schema !== DIALECT) report(["$schema"], `$schema is ${DIALECT}`);
    // With no version to compare with, format/VERSION has an error of its own, and $id is compared
    // with what does not depend on it.
    const id = `${ID_PREFIX}${version ?? "<MAJOR.MINOR>"}/${schema.name}`;
    const idHolds = version === null ? typeof json.$id === "string" && json.$id.startsWith(ID_PREFIX) && json.$id.endsWith(`/${schema.name}`) : json.$id === id;
    if (!idHolds) report(["$id"], `$id is ${id}: the prefix, the version in format/VERSION and the file's name`);
    for (const keyword of ["title", "description"]) if (!isText(json[keyword])) report([], `the root has ${keyword}`);
    for (const node of subschemas(json, roots)) checkSubschema(node, schema, byName, report);
  }
}

// The definitions that serve only as conditions: reached by $ref from an if or a not, and from
// nothing else. What they hold is a condition too, so their fields need no description and their
// objects no closing. A definition becomes one only when every reference to it comes from a
// condition, and its own references then come from one too: so the set only grows, and the loop ends.
function conditionDefinitions(byName) {
  let roots = new Set();
  for (;;) {
    const fromCondition = new Set();
    const fromElsewhere = new Set();
    for (const schema of byName.values()) {
      for (const { schema: node, inCondition } of subschemas(schema.json, roots)) {
        const target = isObject(node) ? resolveRef(node.$ref, schema, byName) : null;
        if (target) (inCondition ? fromCondition : fromElsewhere).add(target.schema);
      }
    }
    const next = new Set([...fromCondition].filter((definition) => !fromElsewhere.has(definition)));
    if (next.size === roots.size) return roots;
    roots = next;
  }
}

// Every subschema of a schema, depth first: { schema, at, under, inCondition }, where at is its
// path of keys and indexes, under the keyword it stands under, and inCondition whether it is part of
// a condition: held by an if or a not, or by one of the definitions that roots names.
function* subschemas(schema, roots = new Set(), at = [], under = null, inCondition = false) {
  const condition = inCondition || roots.has(schema);
  yield { schema, at, under, inCondition: condition };
  if (!isObject(schema)) return;
  for (const [keyword, value] of Object.entries(schema)) {
    const inner = condition || CONDITIONS.has(keyword);
    if (ONE_SUBSCHEMA.has(keyword)) yield* subschemas(value, roots, [...at, keyword], keyword, inner);
    else if (SUBSCHEMA_LIST.has(keyword) && Array.isArray(value)) {
      for (const [index, item] of value.entries()) yield* subschemas(item, roots, [...at, keyword, index], keyword, inner);
    } else if (SUBSCHEMA_MAP.has(keyword) && isObject(value)) {
      for (const [name, item] of Object.entries(value)) yield* subschemas(item, roots, [...at, keyword, name], keyword, inner);
    }
  }
}

function checkSubschema({ schema, at, under, inCondition }, file, byName, report) {
  const isRoot = at.length === 0;
  const isField = FIELDS.has(under) && !inCondition;
  const isPlace = isRoot || (PLACES.has(under) && !inCondition);
  if ((under === "properties" || under === "$defs") && !isSnakeCase(at.at(-1))) report(at, `${at.at(-1)}: a name in snake_case`);
  // What additionalProperties holds when it is no schema, its parent names.
  const noMapSchema = under === "additionalProperties" && !isObject(schema);
  if (isField && !noMapSchema && !(isObject(schema) && isText(schema.description))) report(at, "a field's subschema has a description");
  if (schema === false && !noMapSchema && under !== "unevaluatedProperties") report(at, "false stands only as the value of unevaluatedProperties");
  if (!isObject(schema)) return;

  for (const keyword of Object.keys(schema)) {
    if (!KEYWORDS.has(keyword)) report([...at, keyword], keyword.startsWith("x-") ? `${keyword}: the format's one annotation is x-open` : `${keyword}: no keyword of the format`);
    else if (ROOT_ONLY.has(keyword) && !isRoot) report([...at, keyword], `${keyword} stands only at the root`);
  }
  if ("x-open" in schema) {
    if (schema["x-open"] !== true) report([...at, "x-open"], "x-open is true, or absent");
    if (!FIELDS.has(under)) report([...at, "x-open"], "x-open stands only in a field's subschema: under properties, patternProperties or additionalProperties");
  }
  if ("$ref" in schema) {
    const problem = refProblem(schema.$ref, file, byName);
    if (problem) report([...at, "$ref"], problem);
  }
  if (typeof schema.pattern === "string") {
    const problem = patternProblem(schema.pattern);
    if (problem) report([...at, "pattern"], `pattern ${JSON.stringify(schema.pattern)}: ${problem}`);
  }
  if (isObject(schema.patternProperties)) {
    for (const key of Object.keys(schema.patternProperties)) {
      const problem = patternProblem(key);
      if (problem) report([...at, "patternProperties", key], `patternProperties ${JSON.stringify(key)}: ${problem}`);
    }
  }
  if ("additionalProperties" in schema) {
    if (!isObject(schema.additionalProperties)) report([...at, "additionalProperties"], "additionalProperties is a map's schema of its values: a closed object has unevaluatedProperties: false");
    else if (!("propertyNames" in schema)) report(at, "a map, with additionalProperties, has propertyNames");
  }
  if ("unevaluatedProperties" in schema) {
    if (schema.unevaluatedProperties !== false) report([...at, "unevaluatedProperties"], "unevaluatedProperties is false");
    if (!isPlace) report([...at, "unevaluatedProperties"], "unevaluatedProperties stands only at an object's place: a part that closed the object would refuse the fields of its other parts");
  }
  if (isPlace) checkPlace(schema, at, file, byName, report);
}

// The object at a place is closed there, by unevaluatedProperties: false, whatever parts describe
// it; a map is closed by its additionalProperties. A property that an if or a not names is declared
// by a part that always applies, too: ajv counts the properties of an if that failed as evaluated
// when there is an else, where 2020-12 does not, and module-kit's validator would refuse a value
// that spec's check let through.
function checkPlace(schema, at, file, byName, report) {
  let isObjectSchema = false;
  let isMap = false;
  const declared = new Set();
  // Each condition with the schema it is in, where its own references resolve.
  const conditions = new Map();
  forEachPart(schema, file, byName, ({ part, always, inFile }) => {
    if (isObject(part.properties) || isObject(part.patternProperties)) isObjectSchema = true;
    if (part.type === "object" || (Array.isArray(part.type) && part.type.includes("object"))) isObjectSchema = true;
    if (isObject(part.additionalProperties)) isMap = true;
    if (always && isObject(part.properties)) for (const name of Object.keys(part.properties)) declared.add(name);
    for (const keyword of CONDITIONS) if (isObject(part[keyword])) conditions.set(part[keyword], inFile);
  });
  if (isObjectSchema && !isMap && schema.unevaluatedProperties !== false) {
    report(at, "an object, open at its place: the place has unevaluatedProperties: false");
  }
  const named = new Set();
  for (const [condition, inFile] of conditions) {
    forEachPart(condition, inFile, byName, ({ part }) => {
      if (isObject(part.properties)) for (const name of Object.keys(part.properties)) named.add(name);
    });
  }
  for (const name of named) {
    if (!declared.has(name)) report(at, `${name}: named under if or not, and declared by no part that always applies at its place`);
  }
}

// Calls visit with { part, always, inFile } for a subschema and each part that applies in its place:
// its $ref, and the branches of allOf, anyOf, oneOf, then, else and dependentSchemas, followed into
// other schemas; inFile is the schema the part is in. always is true for the subschema itself and
// what its $ref and allOf reach. A part reached once by a branch that need not apply is visited
// again when a part that always applies reaches it too.
function forEachPart(schema, file, byName, visit) {
  const seen = new Map();
  const walk = (part, inFile, always) => {
    if (!isObject(part) || seen.get(part) === true || (seen.has(part) && !always)) return;
    seen.set(part, always);
    visit({ part, always, inFile });
    if (typeof part.$ref === "string") {
      const target = resolveRef(part.$ref, inFile, byName);
      if (target) walk(target.schema, target.file, always);
    }
    if (Array.isArray(part.allOf)) for (const branch of part.allOf) walk(branch, inFile, always);
    for (const keyword of ["anyOf", "oneOf"]) if (Array.isArray(part[keyword])) for (const branch of part[keyword]) walk(branch, inFile, false);
    for (const keyword of ["then", "else"]) walk(part[keyword], inFile, false);
    if (isObject(part.dependentSchemas)) for (const branch of Object.values(part.dependentSchemas)) walk(branch, inFile, false);
  };
  walk(schema, file, true);
}

// A reference takes one of three forms: #/$defs/<name>, <file>.schema.json, or
// <file>.schema.json#/$defs/<name>. Anything else — a path, an absolute URI — could tie the schema
// to one version of the format without anyone noticing, as ajv resolves "../0.1/…" too.
function refProblem(ref, file, byName) {
  if (typeof ref !== "string") return "$ref is a string";
  const forms = "#/$defs/<name>, <file>.schema.json or <file>.schema.json#/$defs/<name>";
  const target = parseRef(ref, file.name);
  if (!target) return `$ref ${JSON.stringify(ref)}: a reference is ${forms}`;
  const schema = byName.get(target.name);
  if (!schema) return `$ref ${JSON.stringify(ref)}: no schema ${target.name} in format/schemas/`;
  if (target.definition !== null && !isObject(schema.json?.$defs?.[target.definition])) return `$ref ${JSON.stringify(ref)}: ${target.name} defines no ${target.definition}`;
  return null;
}

// { name, definition } for a reference of one of the three forms, or null. definition is null for
// a whole schema.
function parseRef(ref, inName) {
  const hash = ref.indexOf("#");
  const name = hash === -1 ? ref : ref.slice(0, hash);
  const fragment = hash === -1 ? null : ref.slice(hash + 1);
  if (name !== "" && !isSchemaName(name)) return null;
  if (fragment === null) return name === "" ? null : { name, definition: null };
  const prefix = "/$defs/";
  if (!fragment.startsWith(prefix)) return null;
  const definition = fragment.slice(prefix.length);
  if (!isSnakeCase(definition)) return null;
  return { name: name === "" ? inName : name, definition };
}

function resolveRef(ref, file, byName) {
  const target = typeof ref === "string" ? parseRef(ref, file.name) : null;
  const schema = target && byName.get(target.name);
  if (!schema || !isObject(schema.json)) return null;
  const found = target.definition === null ? schema.json : schema.json.$defs?.[target.definition];
  return isObject(found) ? { schema: found, file: schema } : null;
}

// The names of the schemas a schema refers to.
function referencedNames(schema) {
  const names = new Set();
  for (const { schema: node } of subschemas(schema.json)) {
    if (!isObject(node) || typeof node.$ref !== "string") continue;
    const target = parseRef(node.$ref, schema.name);
    if (target && target.name !== schema.name) names.add(target.name);
  }
  return names;
}

// Compiles the schemas with no problems, after checking every schema against the 2020-12
// meta-schema. Returns the validator of each term that compiled, by term; what goes wrong is added
// to the schema's problems. A schema that refers, directly or through others, to one with problems
// gets one line, not the MissingRefError of each reference.
export function compileSchemas(schemas) {
  const warnings = [];
  const note = (...words) => warnings.push(words.join(" "));
  // What ajv logs while it reads a schema is that schema's problem: nothing it logs goes unreported.
  const attempt = (schema, action) => {
    warnings.length = 0;
    let result;
    try {
      result = action();
    } catch (error) {
      schema.problems.push({ line: 1, message: `does not compile: ${error.message}` });
    }
    for (const warning of warnings) schema.problems.push({ line: 1, message: `ajv: ${warning}` });
    return result;
  };
  // Every option the check relies on, written out: all errors, not the first; format an annotation
  // only (2020-12 validation, 7.2.1); strictTypes and strictTuples off, since their default, "log",
  // prints warnings for conventions the format does not have.
  const ajv = new Ajv2020({
    allErrors: true,
    validateFormats: false,
    strictTypes: false,
    strictTuples: false,
    logger: { log: note, warn: note, error: note },
  });
  ajv.addKeyword("x-open");

  const sound = new Map();
  for (const schema of schemas) {
    if (!isObject(schema.json) || schema.json.$schema !== DIALECT) continue;
    const valid = attempt(schema, () => ajv.validateSchema(schema.json));
    if (valid === false) {
      for (const error of ajv.errors) {
        schema.problems.push({ line: schema.lineOf(pathOf(error.instancePath)), message: `the 2020-12 meta-schema: ${error.instancePath || "the root"} ${error.message}` });
      }
    }
    if (schema.problems.length === 0) sound.set(schema.name, schema);
  }

  // A schema compiles only when every schema it reaches is sound: drop, until none is left to drop,
  // each one that refers to a schema not kept.
  const references = new Map([...sound.values()].map((schema) => [schema.name, [...referencedNames(schema)]]));
  const kept = new Set(sound.keys());
  for (let dropped = true; dropped; ) {
    dropped = false;
    for (const name of kept) {
      const broken = references.get(name).filter((other) => !kept.has(other));
      if (broken.length === 0) continue;
      sound.get(name).problems.push({ line: 1, message: `not compiled: it refers to ${broken.join(", ")}, which has errors or is not compiled` });
      kept.delete(name);
      dropped = true;
    }
  }

  // Each schema is added, then compiled after the schemas it refers to, so that what ajv logs while
  // compiling one is that one's and not a schema it reaches first.
  const added = [...kept].filter((name) => attempt(sound.get(name), () => ajv.addSchema(sound.get(name).json)) !== undefined);
  const order = [];
  const placed = new Set();
  const place = (name) => {
    if (placed.has(name)) return;
    placed.add(name);
    for (const other of references.get(name)) if (added.includes(other)) place(other);
    order.push(name);
  };
  for (const name of added) place(name);

  const validators = new Map();
  for (const name of order) {
    const schema = sound.get(name);
    const before = schema.problems.length;
    const validate = attempt(schema, () => ajv.getSchema(schema.json.$id));
    if (validate && schema.problems.length === before) validators.set(schema.term, validate);
  }
  return validators;
}

// A JSON Pointer as a path of keys, with ~1 and ~0 undone (RFC 6901, 4).
export function pathOf(pointer) {
  if (pointer === "") return [];
  return pointer
    .slice(1)
    .split("/")
    .map((key) => key.replaceAll("~1", "/").replaceAll("~0", "~"));
}

export function isSchemaName(name) {
  return name.endsWith(".schema.json") && isKebabCase(name.slice(0, -".schema.json".length));
}

// lower_case words joined by _, the first beginning with a letter: answer_slots.
export function isSnakeCase(name) {
  return isWords(name, "_");
}

// lower-case words joined by -, the first beginning with a letter: skill-graph.
export function isKebabCase(name) {
  return isWords(name, "-");
}

function isWords(name, separator) {
  if (typeof name !== "string" || !(name[0] >= "a" && name[0] <= "z")) return false;
  return name.split(separator).every((word) => word.length > 0 && [...word].every((char) => (char >= "a" && char <= "z") || (char >= "0" && char <= "9")));
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isText(value) {
  return typeof value === "string" && value.trim() !== "";
}
