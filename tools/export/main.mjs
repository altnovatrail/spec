// export-check: spec's own export/, the format of the export (R135), by the layout of its text,
// export/README.md, section 3:
//
//   node tools/export/main.mjs
//
// It checks VERSION, an integer; each schema against the conventions of the module format's
// schemas (format/README.md, section 5) under the prefix of the part, with no x-open, and against
// the 2020-12 meta-schema; that the field format of each file's schema holds the version in
// VERSION; the rules the text lists against those reading.mjs knows, in their order; each example
// against its schema; and each vector of reading, whose cases — exports, unpacked — it reads as
// section 5 of the text gives (reading.mjs) and compares. Between them, the vectors accept an
// export and refuse one by the schema and by each rule (section 7). A file the layout does not know
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
import { RULES, SCHEMA, readingOf } from "./reading.mjs";

export const FOLDER = "export";
export const EXPORT_PART = { folder: FOLDER, prefix: "https://altnovatrail.github.io/spec/export/", open: false };
// The schemas of the files of an export, by term (section 4), and of a vector of reading.
export const FILE_TERMS = ["manifest", "account", "profile", "device"];
const VECTOR_TERM = "reading-vector";
const VERSION = /^([1-9]\d*)\n$/;
const VERSION_WORDS = { missing: "no VERSION: the part's version, an integer and a newline", malformed: "the part's version is an integer from 1 and a newline, with no leading zero" };

// The errors of root's export/ and what it holds: { errors: [{ file, line, message }], stats }.
export function checkExport(root) {
  const errors = [];
  const report = (file, line, message) => errors.push({ file, line, message });
  const stats = { schemas: 0, examples: 0, rules: 0, vectors: 0, cases: 0 };
  if (!fs.existsSync(path.join(root, FOLDER))) {
    report(FOLDER, 0, "the folder of the format of the export is not there");
    return { errors, stats };
  }
  const layout = readLayout(root, report);
  const version = readVersionFile(root, `${FOLDER}/VERSION`, VERSION, VERSION_WORDS, report);

  const schemas = layout.schemas.map((name) => readSchema(root, name, EXPORT_PART));
  checkConventions(schemas, version);
  for (const schema of schemas) for (const problem of schema.problems) report(schema.file, problem.line, problem.message);
  const { validators } = compileSchemas(schemas);
  stats.schemas = schemas.length;
  for (const term of [...FILE_TERMS, VECTOR_TERM]) {
    if (!layout.schemas.includes(`${term}.schema.json`)) report(`${FOLDER}/schemas`, 0, `no ${term}.schema.json, which the text names`);
  }
  for (const term of FILE_TERMS) checkFormatField(schemas, version, FOLDER, term, report);
  stats.rules = readRules(root, FOLDER, RULES, "export-check", report).length;

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

  const ready = [...FILE_TERMS, VECTOR_TERM].every((term) => validators.has(term));
  const outcomes = new Set();
  for (const file of layout.vectors) {
    const { problems, cases } = vectorProblems(fs.readFileSync(path.join(root, file)), validators, ready);
    for (const problem of problems) report(file, problem.line, problem.message);
    for (const each of cases) outcomes.add(each.refused_by ?? "accepted");
    stats.vectors++;
    stats.cases += cases.length;
  }
  if (ready) {
    for (const outcome of ["accepted", SCHEMA, ...RULES]) {
      if (outcomes.has(outcome)) continue;
      const what = outcome === "accepted" ? "accepts an export" : outcome === SCHEMA ? "refuses an export by the schema" : `refuses an export by ${outcome}`;
      report(`${FOLDER}/vectors/reading`, 0, `no vector of reading ${what} (${FOLDER}/README.md, section 7)`);
    }
  }

  errors.sort((a, b) => byCodeUnits(a.file, b.file) || a.line - b.line || byCodeUnits(a.message, b.message));
  return { errors, stats };
}

// The files of export/, by the layout of the text: { schemas: [name], examples: [{ file, term,
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

// A vector of reading: it follows the YAML rules and passes its schema, and each case gives what
// reading.mjs computes. { problems, cases: [the cases it holds] }.
function vectorProblems(bytes, validators, ready) {
  const read = readModuleFile(bytes);
  const problems = yamlProblems(read);
  const validate = validators.get(VECTOR_TERM);
  if (problems.length || !ready) return { problems, cases: [] };
  if (!validate(read.value)) return { problems: uniqueErrors(validate.errors).map((error) => ({ line: 0, message: `does not pass the schema of a vector of reading: ${describe(error)}` })), cases: [] };
  const { cases } = read.value;
  cases.forEach(({ files, ...wanted }, index) => {
    // The schema of a vector holds files as any value: a case's files are a map from a path to a file.
    if (typeof files !== "object" || files === null || Array.isArray(files)) {
      problems.push({ line: 0, message: `cases/${index}/files: the files of an export are a map from each file's path to the file` });
      return;
    }
    const computed = readingOf(validators, files);
    if (!isDeepStrictEqual(computed, { ...wanted })) problems.push({ line: 0, message: `cases/${index}: the reading gives ${JSON.stringify(computed)}, and the vector ${JSON.stringify(wanted)}` });
  });
  return { problems, cases };
}

// Checks root's export/ and prints what it finds, setting the exit code to 1 on an error.
export function exportCheck(root) {
  printCheck("export-check", checkExport(root), (stats) => `${stats.schemas} schemas, ${stats.rules} rules, ${stats.examples} examples, ${stats.vectors} vectors of reading with ${stats.cases} cases`);
}

if (isMain(import.meta.url)) {
  if (process.argv.length > 2) {
    console.error("usage: node tools/export/main.mjs");
    process.exit(2);
  }
  exportCheck(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."));
}
