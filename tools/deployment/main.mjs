// deployment-check: spec's own deployment/, the format of the deployment configuration (R85), by
// the layout of its text, deployment/README.md, section 3:
//
//   node tools/deployment/main.mjs
//
// It checks VERSION, an integer; each schema against the conventions of the module format's
// schemas (format/README.md, section 5) under the prefix of the deployment configuration, with no
// x-open and with the fields of the file in camelCase, and against the 2020-12 meta-schema; that the
// file's field format holds the version in VERSION; the rules the text lists against those
// reading.mjs knows; each example against its schema; and each vector of reading, whose cases it
// reads as section 5 of the text gives (reading.mjs) and compares. Between them, the vectors accept
// a file and refuse one by the schema and by each rule (section 7). A file the layout does not know
// is an error. Prints each error as file:line: message, the line 0 when there is none, and exits 1
// when there is one.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { checkConventions, compileSchemas, isKebabCase, isSchemaName, readSchema } from "../format-check/schemas.mjs";
import { checkExample } from "../format-check/cases.mjs";
import { readModuleFile } from "../format-check/yaml.mjs";
import { byCodeUnits, isMain } from "../shared.mjs";
import { checkFormatField, describe, filesUnder, printCheck, readRules, readVersion as readVersionFile, uniqueErrors, yamlProblems } from "../parts.mjs";
import { RULES, originOf, readingOf } from "./reading.mjs";

export const FOLDER = "deployment";
// The fields of the file keep the names of R09 app, in camelCase; a vector's are in snake_case
// (deployment/README.md, section 3).
export const DEPLOYMENT_PART = { folder: FOLDER, prefix: "https://altnovatrail.github.io/spec/deployment/", open: false, camelCase: ["deployment.schema.json"] };
const FILE_TERM = "deployment";
const VECTOR_TERM = "reading-vector";
const SCHEMA = "schema";
const VERSION = /^([1-9]\d*)\n$/;

// The errors of root's deployment/ and what it holds: { errors: [{ file, line, message }], stats }.
export function checkDeployment(root) {
  const errors = [];
  const report = (file, line, message) => errors.push({ file, line, message });
  const stats = { schemas: 0, examples: 0, rules: 0, vectors: 0, cases: 0 };
  if (!fs.existsSync(path.join(root, FOLDER))) {
    report(FOLDER, 0, "the deployment configuration's folder is not there");
    return { errors, stats };
  }
  const layout = readLayout(root, report);
  const version = readVersion(root, report);

  const schemas = layout.schemas.map((name) => readSchema(root, name, DEPLOYMENT_PART));
  checkConventions(schemas, version);
  for (const schema of schemas) for (const problem of schema.problems) report(schema.file, problem.line, problem.message);
  const { validators } = compileSchemas(schemas);
  stats.schemas = schemas.length;
  for (const term of [FILE_TERM, VECTOR_TERM]) {
    if (!layout.schemas.includes(`${term}.schema.json`)) report(`${FOLDER}/schemas`, 0, `no ${term}.schema.json, which the text names`);
  }
  checkFormatField(schemas, version, FOLDER, FILE_TERM, report);
  stats.rules = readRules(root, FOLDER, RULES, "deployment-check", report).length;

  for (const { file, term, kind } of layout.examples) {
    // A schema with an error of its own is not compiled: its examples are read by the YAML rules
    // alone, and the schema's error is the one to fix.
    if (!layout.schemas.includes(`${term}.schema.json`)) {
      report(file, 0, `an example of ${term}, which has no schema in ${FOLDER}/schemas`);
      continue;
    }
    const problems = checkExample(fs.readFileSync(path.join(root, file)), { kind, term, validate: validators.get(term), version: null });
    for (const problem of problems) report(file, problem.line, problem.message);
    stats.examples++;
  }

  const outcomes = new Set();
  for (const file of layout.vectors) {
    const { problems, cases } = vectorProblems(fs.readFileSync(path.join(root, file)), validators.get(VECTOR_TERM), validators.get(FILE_TERM));
    for (const problem of problems) report(file, problem.line, problem.message);
    for (const each of cases) outcomes.add(each.refused_by ?? "accepted");
    stats.vectors++;
    stats.cases += cases.length;
  }
  if (validators.has(VECTOR_TERM) && validators.has(FILE_TERM)) {
    for (const outcome of ["accepted", SCHEMA, ...RULES]) {
      if (outcomes.has(outcome)) continue;
      const what = outcome === "accepted" ? "accepts a file" : outcome === SCHEMA ? "refuses a file by the schema" : `refuses a file by ${outcome}`;
      report(`${FOLDER}/vectors/reading`, 0, `no vector of reading ${what} (${FOLDER}/README.md, section 7)`);
    }
  }

  errors.sort((a, b) => byCodeUnits(a.file, b.file) || a.line - b.line || byCodeUnits(a.message, b.message));
  return { errors, stats };
}

// The files of deployment/, by the layout of the text: { schemas: [name], examples: [{ file, term,
// kind }], vectors: [file] }. Reports a file it does not know.
function readLayout(root, report) {
  const layout = { schemas: [], examples: [], vectors: [] };
  const isCase = (name) => name.endsWith(".yaml") && isKebabCase(name.slice(0, -".yaml".length));
  for (const file of filesUnder(root, FOLDER)) {
    const parts = file.split("/").slice(1);
    if (parts.length === 1 && ["README.md", "VERSION"].includes(parts[0])) continue;
    if (parts.length === 2 && parts[0] === "schemas" && isSchemaName(parts[1])) layout.schemas.push(parts[1]);
    else if (parts.length === 4 && parts[0] === "examples" && isKebabCase(parts[1]) && ["valid", "invalid"].includes(parts[2]) && isCase(parts[3])) {
      layout.examples.push({ file, term: parts[1], kind: parts[2] });
    } else if (parts.length === 3 && parts[0] === "vectors" && parts[1] === "reading" && isCase(parts[2])) layout.vectors.push(file);
    else report(file, 0, `no file of the layout of ${FOLDER}/ (${FOLDER}/README.md, section 3)`);
  }
  layout.schemas.sort(byCodeUnits);
  return layout;
}

// The version in deployment/VERSION, an integer as text, or null when it cannot be read.
function readVersion(root, report) {
  return readVersionFile(root, `${FOLDER}/VERSION`, VERSION, { missing: "no VERSION: the format's version, an integer and a newline", malformed: "the format's version is an integer from 1 and a newline, with no leading zero" }, report);
}

// A vector of reading: it follows the YAML rules and passes its schema, the origin of each case is
// written as the URL Standard serializes it, and each case gives what reading.mjs computes.
// { problems, cases: [the cases it holds] }.
function vectorProblems(bytes, validate, validateFile) {
  const read = readModuleFile(bytes);
  const problems = yamlProblems(read);
  if (problems.length || !validate || !validateFile) return { problems, cases: [] };
  if (!validate(read.value)) return { problems: uniqueErrors(validate.errors).map((error) => ({ line: 0, message: `does not pass the schema of a vector of reading: ${describe(error)}` })), cases: [] };
  const { cases } = read.value;
  cases.forEach(({ origin, file, ...wanted }, index) => {
    // A reader is given the origin where app is open: a case with none is no case to read.
    if (originOf(origin) !== origin) {
      problems.push({ line: 0, message: `cases/${index}/origin: ${origin} is not written as its origin is, ${originOf(origin) ?? "which it has not"}` });
      return;
    }
    const computed = readingOf(validateFile, origin, file);
    if (!isDeepStrictEqual(computed, { ...wanted })) {
      problems.push({ line: 0, message: `cases/${index}: the reading gives ${JSON.stringify(computed)}, and the vector ${JSON.stringify(wanted)}` });
    }
  });
  return { problems, cases };
}

// Checks root's deployment/ and prints what it finds, setting the exit code to 1 on an error.
export function deploymentCheck(root) {
  printCheck("deployment-check", checkDeployment(root), (stats) => `${stats.schemas} schemas, ${stats.rules} rules, ${stats.examples} examples, ${stats.vectors} vectors of reading with ${stats.cases} cases`);
}

if (isMain(import.meta.url)) {
  if (process.argv.length > 2) {
    console.error("usage: node tools/deployment/main.mjs");
    process.exit(2);
  }
  deploymentCheck(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."));
}
