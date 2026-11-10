// consent-age-check: spec's own consent-age/, the table of the age of digital consent (R134), by the
// layout of its text, consent-age/README.md, section 3:
//
//   node tools/consent-age/main.mjs
//
// It checks VERSION, an integer; each schema against the conventions of the module format's
// schemas (format/README.md, section 5) under the prefix of the part, with no x-open, and against
// the 2020-12 meta-schema; that the table's field format holds the version in VERSION; the rules the
// text lists against those reading.mjs knows, in their order; each example against its schema; each
// vector of reading, whose cases it reads as section 5 of the text gives (reading.mjs) and
// compares; and each vector of the category, whose table section 5 accepts and whose cases it
// computes as section 6 gives. Between them, the vectors of reading accept a table and refuse one by
// the schema and by each rule, and those of the category give every category and both answers to
// asking the age again (section 8). A file the layout does not know is an error. Last, it reads the
// table itself, consent-age.yaml, as section 5 gives, with the table of the release before for
// consent-age.ages-kept (tools/release/previous.mjs). Prints each error as file:line: message, the
// line 0 when there is none, and exits 1 when there is one.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { checkConventions, compileSchemas, isKebabCase, isSchemaName, readSchema } from "../format-check/schemas.mjs";
import { checkExample } from "../format-check/cases.mjs";
import { readModuleFile } from "../format-check/yaml.mjs";
import { byCodeUnits, git, isMain } from "../shared.mjs";
import { checkFormatField, describe, filesUnder, printCheck, readRules, readVersion as readVersionFile, uniqueErrors, yamlProblems } from "../parts.mjs";
import { previousReleaseTag } from "../release/previous.mjs";
import { ADULT, AGES_KEPT, FROM_13_TO_CONSENT, FROM_CONSENT_TO_18, RULES, SCHEMA, UNDER_13, caseOf, readingOf } from "./reading.mjs";

export const FOLDER = "consent-age";
export const CONSENT_AGE_PART = { folder: FOLDER, prefix: "https://altnovatrail.github.io/spec/consent-age/", open: false };
const TABLE_TERM = "consent-age";
const READING_TERM = "reading-vector";
const CATEGORY_TERM = "category-vector";
const TABLE = "consent-age.yaml";
const VECTOR_KINDS = { reading: READING_TERM, category: CATEGORY_TERM };
const VERSION = /^([1-9]\d*)\n$/;
const VERSION_WORDS = { missing: "no VERSION: the part's version, an integer and a newline", malformed: "the part's version is an integer from 1 and a newline, with no leading zero" };

// The errors of root's consent-age/ and what it holds: { errors: [{ file, line, message }], stats }.
// previousOf(root) gives the release before, { tag, table } with table null when it has no
// consent-age/, or null when there is none; it throws when it cannot tell.
export function checkConsentAge(root, { previousOf = previousConsentAge } = {}) {
  const errors = [];
  const report = (file, line, message) => errors.push({ file, line, message });
  const stats = { schemas: 0, examples: 0, rules: 0, vectors: 0, cases: 0, countries: 0, entries: 0, previous: null };
  if (!fs.existsSync(path.join(root, FOLDER))) {
    report(FOLDER, 0, "the folder of the age of digital consent is not there");
    return { errors, stats };
  }
  const layout = readLayout(root, report);
  const version = readVersionFile(root, `${FOLDER}/VERSION`, VERSION, VERSION_WORDS, report);

  const schemas = layout.schemas.map((name) => readSchema(root, name, CONSENT_AGE_PART));
  checkConventions(schemas, version);
  for (const schema of schemas) for (const problem of schema.problems) report(schema.file, problem.line, problem.message);
  const { validators } = compileSchemas(schemas);
  stats.schemas = schemas.length;
  for (const term of [TABLE_TERM, READING_TERM, CATEGORY_TERM]) {
    if (!layout.schemas.includes(`${term}.schema.json`)) report(`${FOLDER}/schemas`, 0, `no ${term}.schema.json, which the text names`);
  }
  checkFormatField(schemas, version, FOLDER, TABLE_TERM, report);
  stats.rules = readRules(root, FOLDER, RULES, "consent-age-check", report).length;

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

  const validateTable = validators.get(TABLE_TERM);
  const outcomes = new Set();
  for (const { file, kind } of layout.vectors) {
    const check = kind === "reading" ? readingVectorProblems : categoryVectorProblems;
    const { problems, cases } = check(fs.readFileSync(path.join(root, file)), validators.get(VECTOR_KINDS[kind]), validateTable);
    for (const problem of problems) report(file, problem.line, problem.message);
    for (const each of cases) outcomes.add(outcomeOf(kind, each));
    stats.vectors++;
    stats.cases += cases.length;
  }
  if (validators.has(READING_TERM) && validateTable) {
    for (const outcome of ["accepted", SCHEMA, ...RULES]) {
      if (outcomes.has(`reading:${outcome}`)) continue;
      const what = outcome === "accepted" ? "accepts a table" : outcome === SCHEMA ? "refuses a table by the schema" : `refuses a table by ${outcome}`;
      report(`${FOLDER}/vectors/reading`, 0, `no vector of reading ${what} (${FOLDER}/README.md, section 8)`);
    }
  }
  if (validators.has(CATEGORY_TERM) && validateTable) {
    for (const outcome of [UNDER_13, FROM_13_TO_CONSENT, FROM_CONSENT_TO_18, ADULT, "ask_again:true", "ask_again:false"]) {
      if (outcomes.has(`category:${outcome}`)) continue;
      const what = outcome.startsWith("ask_again:") ? `answers ${outcome.slice("ask_again:".length)} to asking the age again` : `gives the category ${outcome}`;
      report(`${FOLDER}/vectors/category`, 0, `no vector of the category ${what} (${FOLDER}/README.md, section 8)`);
    }
  }

  // The table itself, against the release before. A table whose release before cannot be read is
  // not read: consent-age.ages-kept would hold for nothing.
  let previous = null;
  let known = true;
  try {
    previous = previousOf(root);
  } catch (error) {
    report(FOLDER, 0, `the release before cannot be read, for consent-age.ages-kept: ${error.message}`);
    known = false;
  }
  // The table of the release before is read only once its schema accepts it: a table of another
  // shape is no history to hold this one to, and the check names it rather than throw.
  if (previous?.table && validateTable && !validateTable(previous.table)) {
    report(FOLDER, 0, `the table of ${previous.tag} does not pass ${FOLDER}/schemas/${TABLE_TERM}.schema.json, for consent-age.ages-kept: ${uniqueErrors(validateTable.errors).map(describe).join("; ")}`);
    known = false;
  }
  // The summary names the release only when it had a table to hold this one to.
  stats.previous = previous?.table ? previous.tag : null;
  const table = readTable(root, report);
  if (table !== undefined && known && validateTable) readTheTable(validateTable, table, previous, report, stats);

  errors.sort((a, b) => byCodeUnits(a.file, b.file) || a.line - b.line || byCodeUnits(a.message, b.message));
  return { errors, stats };
}

// The outcome a case of a vector shows, to find what no vector shows.
function outcomeOf(kind, each) {
  if (kind === "reading") return `reading:${each.refused_by ?? "accepted"}`;
  return Object.hasOwn(each, "ask_again") ? `category:ask_again:${each.ask_again}` : `category:${each.category}`;
}

// The table of root's consent-age/ as YAML reads it, or undefined when it cannot be read.
function readTable(root, report) {
  const file = `${FOLDER}/${TABLE}`;
  if (!fs.existsSync(path.join(root, file)) || !fs.statSync(path.join(root, file)).isFile()) {
    report(file, 0, "no table");
    return undefined;
  }
  const read = readModuleFile(fs.readFileSync(path.join(root, file)));
  const problems = yamlProblems(read);
  for (const { line, message } of problems) report(file, line, message);
  return problems.length ? undefined : read.value;
}

// Reads the table, with the release before, { tag, table } or null, and reports what refuses it.
function readTheTable(validate, table, previous, report, stats) {
  const file = `${FOLDER}/${TABLE}`;
  const reading = readingOf(validate, table, previous?.table ?? null);
  if (reading.accepted) {
    stats.countries = Object.keys(table.countries).length;
    stats.entries = Object.values(table.countries).reduce((sum, entries) => sum + entries.length, 0);
    return;
  }
  for (const name of reading.names) {
    if (reading.refused_by === SCHEMA) report(file, 0, `does not pass ${FOLDER}/schemas/${TABLE_TERM}.schema.json: ${name || "the root"}`);
    else report(file, 0, `${reading.refused_by}: ${name}, ${FOLDER}/README.md, section 5${reading.refused_by === AGES_KEPT ? `, against ${previous.tag}` : ""}`);
  }
}

// The release before root's HEAD, for consent-age.ages-kept: { tag, table } with the table as that
// release has it, null when it has no consent-age/, and null when there is no release before.
// Throws when that table cannot be read.
export function previousConsentAge(root) {
  const tag = previousReleaseTag(root, [FOLDER]);
  if (!tag) return null;
  return { tag, table: consentAgeAt(root, tag) };
}

// The table at a revision of the repository at root as YAML reads it, or null when the revision has
// no consent-age/. A revision whose table is missing or breaks the YAML rules has none to compare
// with, and throws: consent-age.ages-kept would hold for nothing.
export function consentAgeAt(root, revision) {
  if (git(root, ["ls-tree", revision, "--", `${FOLDER}/`]).trim() === "") return null;
  const file = `${FOLDER}/${TABLE}`;
  if (git(root, ["ls-tree", revision, "--", file]).trim() === "") throw new Error(`${revision} has ${FOLDER}/ and no ${file}`);
  const read = readModuleFile(git(root, ["show", `${revision}:${file}`], { encoding: "buffer" }));
  const problems = yamlProblems(read);
  if (problems.length) throw new Error(`${file} at ${revision} cannot be read: ${problems.map(({ line, message }) => `line ${line}: ${message}`).join("; ")}`);
  return read.value;
}

// The files of consent-age/, by the layout of the text: { schemas: [name], examples: [{ file,
// term, kind }], vectors: [{ file, kind }] }. Reports a file it does not know; the table is the
// part's, which the reading names.
function readLayout(root, report) {
  const layout = { schemas: [], examples: [], vectors: [] };
  const isCase = (name) => name.endsWith(".yaml") && isKebabCase(name.slice(0, -".yaml".length));
  for (const file of filesUnder(root, FOLDER)) {
    const parts = file.split("/").slice(1);
    if (parts.length === 1 && ["README.md", "VERSION", TABLE].includes(parts[0])) continue;
    if (parts.length === 2 && parts[0] === "schemas" && isSchemaName(parts[1])) layout.schemas.push(parts[1]);
    else if (parts.length === 4 && parts[0] === "examples" && isKebabCase(parts[1]) && ["valid", "invalid"].includes(parts[2]) && isCase(parts[3])) {
      layout.examples.push({ file, term: parts[1], kind: parts[2] });
    } else if (parts.length === 3 && parts[0] === "vectors" && Object.hasOwn(VECTOR_KINDS, parts[1]) && isCase(parts[2])) layout.vectors.push({ file, kind: parts[1] });
    else report(file, 0, `no file of the layout of ${FOLDER}/ (${FOLDER}/README.md, section 3)`);
  }
  layout.schemas.sort(byCodeUnits);
  return layout;
}

// A vector file as YAML reads it, against its schema: { problems, value } with value undefined
// when the file breaks the YAML rules or the schema.
function readVector(bytes, validate, what) {
  const read = readModuleFile(bytes);
  const problems = yamlProblems(read);
  if (problems.length || !validate) return { problems, value: undefined };
  if (!validate(read.value)) return { problems: uniqueErrors(validate.errors).map((error) => ({ line: 0, message: `does not pass the schema of a vector of ${what}: ${describe(error)}` })), value: undefined };
  return { problems, value: read.value };
}

// A vector of reading: it follows the YAML rules and passes its schema, and each case gives what
// reading.mjs computes; the table of the release before, where a case has one, passes the table's
// schema. { problems, cases: [the cases it holds] }.
function readingVectorProblems(bytes, validate, validateTable) {
  const { problems, value } = readVector(bytes, validate, "reading");
  if (value === undefined || !validateTable) return { problems, cases: [] };
  value.cases.forEach(({ table, previous, ...wanted }, index) => {
    if (previous !== undefined && !validateTable(previous)) {
      problems.push({ line: 0, message: `cases/${index}/previous: a table of a release is one the schema accepts: ${uniqueErrors(validateTable.errors).map(describe).join("; ")}` });
      return;
    }
    const computed = readingOf(validateTable, table, previous ?? null);
    if (!isDeepStrictEqual(computed, { ...wanted })) problems.push({ line: 0, message: `cases/${index}: the reading gives ${JSON.stringify(computed)}, and the vector ${JSON.stringify(wanted)}` });
  });
  return { problems, cases: value.cases };
}

// A vector of the category: it follows the YAML rules and passes its schema, section 5 accepts its
// table, and each case gives what section 6 computes. { problems, cases: [the cases it holds] }.
function categoryVectorProblems(bytes, validate, validateTable) {
  const { problems, value } = readVector(bytes, validate, "the category");
  if (value === undefined || !validateTable) return { problems, cases: [] };
  const reading = readingOf(validateTable, value.table);
  if (!reading.accepted) return { problems: [...problems, { line: 0, message: `table: section 5 refuses the table of a vector of the category, by ${reading.refused_by}: ${reading.names.join(", ")}` }], cases: [] };
  value.cases.forEach((each, index) => {
    for (const [field, computed] of Object.entries(caseOf(value.table, each))) {
      if (computed !== each[field]) problems.push({ line: 0, message: `cases/${index}: section 6 gives ${field} ${JSON.stringify(computed)}, and the vector ${JSON.stringify(each[field])}` });
    }
  });
  return { problems, cases: value.cases };
}

// Checks root's consent-age/ and prints what it finds, setting the exit code to 1 on an error.
export function consentAgeCheck(root, options = {}) {
  printCheck("consent-age-check", checkConsentAge(root, options), (stats) => {
    const against = stats.previous ? `, against ${stats.previous}` : ", with no table of a release before";
    return `${stats.schemas} schemas, ${stats.rules} rules, ${stats.examples} examples, ${stats.vectors} vectors with ${stats.cases} cases; the table: ${stats.countries} countries, ${stats.entries} entries${against}`;
  });
}

if (isMain(import.meta.url)) {
  if (process.argv.length > 2) {
    console.error("usage: node tools/consent-age/main.mjs");
    process.exit(2);
  }
  consentAgeCheck(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."));
}
