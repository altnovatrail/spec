// admission-check: spec's own admission/, the admission table (R96), by the layout of its text,
// admission/README.md, section 3:
//
//   node tools/admission/main.mjs
//
// It checks VERSION; each schema against the conventions of the module format's schemas
// (format/README.md, section 5) under the prefix of the admission table, with no x-open, and
// against the 2020-12 meta-schema; that the codes of the age categories are the format's (R46);
// the table, admission-table.json, against its schema and the rules of the text, and each of its
// terms and citations against spec's documents: the row of privacy 5.3 that a cell reads, and the
// decision, the open question or the section that a rule or a cell rests on; each example against
// its schema, and a valid example of a table against the rules too; each vector of a rule — that it
// passes the schema and breaks that rule and no other; and each vector of answers, whose answers it
// computes as section 6 of the text gives them (answer.mjs) and compares. Every reason of a refusal
// has a vector. A file the layout does not know is an error. Prints each error as file:line:
// message, the line 0 when there is none, and exits 1 when there is one.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { LineCounter, parseDocument } from "yaml";
import { checkConventions, compileSchemas, isKebabCase, isSchemaName, readSchema } from "../format-check/schemas.mjs";
import { checkExample, readText } from "../format-check/cases.mjs";
import { readModuleFile } from "../format-check/yaml.mjs";
import { parseMarkdown } from "../docs-check/markdown.mjs";
import { readRegisters } from "../docs-check/registers.mjs";
import { documents, registers } from "../docs-check/config.mjs";
import { byCodeUnits, isMain } from "../shared.mjs";
import { answerOf } from "./answer.mjs";
import { RULES, tableBreaches } from "./table.mjs";

export const FOLDER = "admission";
export const ADMISSION_PART = { folder: FOLDER, prefix: "https://altnovatrail.github.io/spec/admission/", open: false };
const TABLE = `${FOLDER}/admission-table.json`;
const TABLE_TERM = "admission-table";
const VECTOR_TERM = "answer-vector";
const REASONS = ["capability_closed", "cell_closed", "fact_missing"];
const VERSION = /^((?:0|[1-9]\d*)\.(?:0|[1-9]\d*))\n$/;
const CITATION = /^(?:(R)([1-9][0-9]*)|([ОПТ]-)([1-9][0-9]*)|(product|concepts|privacy|architecture|repositories) ([1-9][0-9]*(?:\.[1-9][0-9]*)*))$/;

// The errors of root's admission/ and what it holds: { errors: [{ file, line, message }], stats }.
export function checkAdmission(root) {
  const errors = [];
  const report = (file, line, message) => errors.push({ file, line, message });
  const stats = { schemas: 0, providers: 0, facts: 0, capabilities: 0, cells: 0, examples: 0, rules: 0, ruleVectors: 0, answerVectors: 0, cases: 0 };
  if (!fs.existsSync(path.join(root, FOLDER))) {
    report(FOLDER, 0, "the admission table's folder is not there");
    return { errors, stats };
  }
  const layout = readLayout(root, report);
  const version = readVersion(root, report);

  const schemas = layout.schemas.map((name) => readSchema(root, name, ADMISSION_PART));
  checkConventions(schemas, version);
  for (const schema of schemas) for (const problem of schema.problems) report(schema.file, problem.line, problem.message);
  const { validators } = compileSchemas(schemas);
  stats.schemas = schemas.length;
  for (const term of [TABLE_TERM, VECTOR_TERM]) {
    if (!layout.schemas.includes(`${term}.schema.json`)) report(`${FOLDER}/schemas`, 0, `no ${term}.schema.json, which the text names`);
  }
  checkAgeCategories(root, schemas, report);

  const docs = readDocuments(root);
  const rules = readRules(root, layout, report);
  stats.rules = rules.length;

  const table = readTable(root, report);
  if (table && validators.has(TABLE_TERM)) {
    const validate = validators.get(TABLE_TERM);
    // ajv repeats an error at a place for each branch that met it: once is enough.
    if (!validate(table.value)) for (const error of uniqueErrors(validate.errors)) report(TABLE, table.lineOf(pathOf(error.instancePath)), `does not pass its schema: ${describe(error)}`);
    else {
      for (const breach of tableBreaches(table.value)) report(TABLE, table.lineOf(breach.at), `${breach.rule}: ${breach.message}`);
      for (const problem of documentProblems(table.value, docs)) report(TABLE, table.lineOf(problem.at), problem.message);
      stats.providers = Object.keys(table.value.providers).length;
      stats.facts = Object.keys(table.value.facts).length;
      stats.capabilities = table.value.capabilities.length;
      stats.cells = table.value.cells.length;
    }
  }

  for (const { file, term, kind } of layout.examples) {
    // A schema with an error of its own is not compiled: its examples are read by the YAML rules
    // alone, and the schema's error is the one to fix.
    if (!layout.schemas.includes(`${term}.schema.json`)) {
      report(file, 0, `an example of ${term}, which has no schema in ${FOLDER}/schemas`);
      continue;
    }
    const validate = validators.get(term);
    const bytes = fs.readFileSync(path.join(root, file));
    const problems = checkExample(bytes, { kind, term, validate, version: null });
    if (!problems.length && validate && kind === "valid" && term === TABLE_TERM) {
      for (const breach of tableBreaches(readModuleFile(bytes).value)) problems.push({ line: 0, message: `${breach.rule}: ${breach.message}` });
    }
    for (const problem of problems) report(file, problem.line, problem.message);
    stats.examples++;
  }

  for (const { file, rule } of layout.ruleVectors) {
    for (const problem of ruleVectorProblems(fs.readFileSync(path.join(root, file)), rule, validators.get(TABLE_TERM), docs)) report(file, problem.line, problem.message);
    stats.ruleVectors++;
  }

  const reasons = new Set();
  for (const file of layout.answerVectors) {
    const { problems, cases } = answerVectorProblems(fs.readFileSync(path.join(root, file)), validators.get(VECTOR_TERM), docs);
    for (const problem of problems) report(file, problem.line, problem.message);
    for (const answer of cases) reasons.add(answer.reason ?? "admitted");
    stats.answerVectors++;
    stats.cases += cases.length;
  }
  for (const reason of ["admitted", ...REASONS]) {
    if (validators.has(VECTOR_TERM) && !reasons.has(reason)) report(`${FOLDER}/vectors/answers`, 0, `no vector of answers gives ${reason === "admitted" ? "an admission" : `the refusal ${reason}`}`);
  }

  errors.sort((a, b) => byCodeUnits(a.file, b.file) || a.line - b.line || byCodeUnits(a.message, b.message));
  return { errors, stats };
}

// The files of admission/, by the layout of the text: { schemas: [name], examples: [{ file, term,
// kind }], ruleVectors: [{ file, rule }], answerVectors: [file], ruleFolders: [rule] }. Reports a file
// it does not know.
function readLayout(root, report) {
  const layout = { schemas: [], examples: [], ruleVectors: [], answerVectors: [], ruleFolders: [] };
  const unknown = (file) => report(file, 0, `no file of the layout of ${FOLDER}/ (${FOLDER}/README.md, section 3)`);
  const isCase = (name) => name.endsWith(".yaml") && isKebabCase(name.slice(0, -".yaml".length));
  for (const file of filesUnder(root, FOLDER)) {
    const parts = file.split("/").slice(1);
    if (parts.length === 1 && ["README.md", "VERSION", "admission-table.json"].includes(parts[0])) continue;
    if (parts.length === 2 && parts[0] === "schemas" && isSchemaName(parts[1])) layout.schemas.push(parts[1]);
    else if (parts.length === 4 && parts[0] === "examples" && isKebabCase(parts[1]) && ["valid", "invalid"].includes(parts[2]) && isCase(parts[3])) {
      layout.examples.push({ file, term: parts[1], kind: parts[2] });
    } else if (parts.length === 3 && parts[0] === "vectors" && parts[1] === "answers" && isCase(parts[2])) layout.answerVectors.push(file);
    else if (parts.length === 4 && parts[0] === "vectors" && parts[1] === "rules" && isCase(parts[3])) {
      layout.ruleVectors.push({ file, rule: parts[2] });
      if (!layout.ruleFolders.includes(parts[2])) layout.ruleFolders.push(parts[2]);
    } else unknown(file);
  }
  layout.schemas.sort(byCodeUnits);
  return layout;
}

// Every file under dir of root, by its path from root with forward slashes, in the order of code
// units.
function filesUnder(root, dir) {
  const files = [];
  const walk = (at) => {
    for (const entry of fs.readdirSync(path.join(root, at), { withFileTypes: true })) {
      const file = `${at}/${entry.name}`;
      if (entry.isDirectory()) walk(file);
      else files.push(file);
    }
  };
  walk(dir);
  return files.sort(byCodeUnits);
}

// The version in admission/VERSION, MAJOR.MINOR, or null when it cannot be read.
function readVersion(root, report) {
  const file = `${FOLDER}/VERSION`;
  if (!fs.existsSync(path.join(root, file))) {
    report(file, 0, "no VERSION: the table's version, MAJOR.MINOR and a newline");
    return null;
  }
  const match = VERSION.exec(fs.readFileSync(path.join(root, file), "utf8"));
  if (!match) {
    report(file, 1, "the table's version is MAJOR.MINOR and a newline, with no leading zeros");
    return null;
  }
  return match[1];
}

// The codes of the age categories are the format's, R46's: the table's schema and the format's
// common schema list the same ones, in the same order. What is wrong with the common schema itself
// is format-check's to say.
function checkAgeCategories(root, schemas, report) {
  const table = schemas.find((schema) => schema.name === `${TABLE_TERM}.schema.json`);
  const ours = table?.json?.$defs?.age_category?.enum;
  if (!ours) return;
  let common;
  try {
    common = JSON.parse(fs.readFileSync(path.join(root, "format/schemas/common.schema.json"), "utf8"));
  } catch (error) {
    report(table.file, 0, `the age categories cannot be held to the format's: format/schemas/common.schema.json cannot be read (${error.message}); run just format-check`);
    return;
  }
  if (!isDeepStrictEqual(ours, common.$defs?.age_category?.enum)) {
    report(table.file, table.lineOf(["$defs", "age_category", "enum"]), "the age categories are the format's, as format/schemas/common.schema.json lists them (R46)");
  }
}

// The rules the text lists, each against table.mjs and the folders of the vectors of rules.
function readRules(root, layout, report) {
  const readme = `${FOLDER}/README.md`;
  if (!fs.existsSync(path.join(root, readme))) {
    report(readme, 0, "no text");
    return [];
  }
  const { rules, problems } = readText(fs.readFileSync(path.join(root, readme), "utf8"));
  // The table has no layout of a module: readText's complaint of that is the format's alone.
  for (const problem of problems) if (problem.line > 0) report(readme, problem.line, problem.message);
  const ids = rules.map((rule) => rule.id);
  for (const rule of rules) {
    if (!RULES.includes(rule.id)) report(readme, rule.line, `${rule.id}: no rule admission-check knows`);
    if (!layout.ruleFolders.includes(rule.id)) report(readme, rule.line, `${rule.id} has no vectors in ${FOLDER}/vectors/rules/${rule.id}/`);
  }
  for (const rule of RULES) if (!ids.includes(rule)) report(readme, 0, `${rule}: a rule admission-check knows, and the text lists it not`);
  for (const folder of layout.ruleFolders) if (!ids.includes(folder)) report(`${FOLDER}/vectors/rules/${folder}`, 0, `${folder}: no rule the text lists`);
  return rules;
}

// The table, read strictly: { value, lineOf } or null. Two equal keys of one object are an error,
// which JSON.parse lets pass.
function readTable(root, report) {
  if (!fs.existsSync(path.join(root, TABLE))) {
    report(TABLE, 0, "no table");
    return null;
  }
  const text = fs.readFileSync(path.join(root, TABLE), "utf8");
  let value;
  try {
    value = JSON.parse(text);
  } catch (error) {
    report(TABLE, 1, `not JSON: ${error.message}`);
    return null;
  }
  const lines = new LineCounter();
  const document = parseDocument(text, { uniqueKeys: true, lineCounter: lines, logLevel: "error" });
  for (const error of document.errors) {
    if (error.code === "DUPLICATE_KEY") report(TABLE, lines.linePos(error.pos[0]).line, "a key that its object has already");
  }
  const lineOf = (at) => {
    for (let length = at.length; length >= 0; length--) {
      const node = document.getIn(at.slice(0, length), true);
      if (node?.range) return lines.linePos(node.range[0]).line;
    }
    return 1;
  };
  return { value, lineOf };
}

// spec's documents that a table cites: the parsed Markdown of each, and their registers.
function readDocuments(root) {
  const files = new Map();
  for (const file of new Set([...Object.values(documents), ...registers.map((register) => register.file)])) {
    if (fs.existsSync(path.join(root, file))) files.set(file, parseMarkdown(fs.readFileSync(path.join(root, file), "utf8")));
  }
  return { files, registers: readRegisters(files, registers, () => {}) };
}

// What a table cites that spec's documents do not hold: a row of privacy 5.3 that a cell's terms
// name, and a decision, an open question or a section that a rule or a cell rests on. [{ at, message }].
export function documentProblems(table, docs) {
  const problems = [];
  const privacy = docs.files.get(documents.privacy);
  const rows = new Set((privacy?.tables ?? []).filter((t) => t.section === "5.3").flatMap((t) => t.rows.map((row) => row.cells[0])));
  table.cells.forEach((cell, index) => {
    cell.terms.forEach((terms, at) => {
      if (!rows.has(terms.row)) problems.push({ at: ["cells", index, "terms", at, "row"], message: `${terms.row}: no row of the table of privacy 5.3` });
    });
  });
  const cite = (list, at) =>
    list.forEach((citation, i) => {
      const problem = citationProblem(citation, docs);
      if (problem) problems.push({ at: [...at, i], message: problem });
    });
  table.capabilities.forEach((rule, index) => cite(rule.basis, ["capabilities", index, "basis"]));
  table.cells.forEach((cell, index) => cite(cell.basis, ["cells", index, "basis"]));
  return problems;
}

function citationProblem(citation, docs) {
  const match = CITATION.exec(citation);
  if (!match) return `${citation}: no citation of a form the schema names`;
  const prefix = match[1] ?? match[3];
  if (prefix) {
    const number = Number(match[2] ?? match[4]);
    if (!docs.registers.get(prefix)?.numbers.has(number)) return `${citation}: no such number in its register`;
    return null;
  }
  const doc = docs.files.get(documents[match[5]]);
  if (!doc?.sections.has(match[6])) return `${citation}: ${documents[match[5]]} has no section ${match[6]}`;
  return null;
}

// A vector of a rule: it follows the YAML rules, passes the schema of a table, and breaks that rule
// and no other. Its terms and citations are spec's documents', as the table's are.
function ruleVectorProblems(bytes, rule, validate, docs) {
  const read = readModuleFile(bytes);
  const problems = yamlProblems(read);
  if (problems.length || !validate) return problems;
  if (!validate(read.value)) return uniqueErrors(validate.errors).map((error) => ({ line: 0, message: `does not pass the schema of a table: ${describe(error)}` }));
  const breaches = tableBreaches(read.value);
  for (const breach of breaches) if (breach.rule !== rule) problems.push({ line: 0, message: `breaks ${breach.rule} too: ${breach.message}` });
  if (RULES.includes(rule) && !breaches.some((breach) => breach.rule === rule)) problems.push({ line: 0, message: `breaks no ${rule}` });
  for (const problem of documentProblems(read.value, docs)) problems.push({ line: 0, message: `${problem.at.join("/")}: ${problem.message}` });
  return problems;
}

// A vector of answers: it follows the YAML rules and passes its schema, its table breaks no rule,
// and each case's answer is the one answer.mjs computes. { problems, cases: [the answers it gives] }.
function answerVectorProblems(bytes, validate, docs) {
  const read = readModuleFile(bytes);
  const problems = yamlProblems(read);
  if (problems.length || !validate) return { problems, cases: [] };
  if (!validate(read.value)) return { problems: uniqueErrors(validate.errors).map((error) => ({ line: 0, message: `does not pass the schema of a vector of answers: ${describe(error)}` })), cases: [] };
  const { table, cases } = read.value;
  const breaches = tableBreaches(table);
  for (const breach of breaches) problems.push({ line: 0, message: `table/${breach.at.join("/")}: ${breach.rule}: ${breach.message}` });
  for (const problem of documentProblems(table, docs)) problems.push({ line: 0, message: `table/${problem.at.join("/")}: ${problem.message}` });
  if (breaches.length) return { problems, cases: [] };
  cases.forEach(({ request, facts, answer }, index) => {
    // A reader refuses facts its table does not know (section 5), so a vector declares none.
    for (const [provider, declared] of Object.entries(facts ?? {})) {
      if (!Object.hasOwn(table.providers, provider)) problems.push({ line: 0, message: `cases/${index}/facts/${provider}: no provider of the table` });
      for (const fact of Object.keys(declared)) {
        if (!Object.hasOwn(table.facts, fact)) problems.push({ line: 0, message: `cases/${index}/facts/${provider}/${fact}: no fact of the table's dictionary` });
      }
    }
    const computed = answerOf(table, request, facts);
    if (!isDeepStrictEqual(sorted(computed), sorted(answer))) {
      problems.push({ line: 0, message: `cases/${index}: the answer is ${JSON.stringify(sorted(computed))}, and the vector gives ${JSON.stringify(sorted(answer))}` });
    }
  });
  return { problems, cases: cases.map((c) => c.answer) };
}

// A value with the keys of each object in the order of code units, so that two answers compare
// whatever the order the vector writes them in.
function sorted(value) {
  if (Array.isArray(value)) return value.map(sorted);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort(byCodeUnits).map((key) => [key, sorted(value[key])]));
}

function yamlProblems({ violations, notYaml }) {
  return [...notYaml.map(({ line, message }) => ({ line, message: `not YAML: ${message}` })), ...violations.map(({ rule, line, message }) => ({ line, message: `${rule}: ${message}` }))];
}

// The path of keys and indexes of an instance path of ajv's: /cells/0/terms → ["cells", 0, "terms"].
function pathOf(pointer) {
  return pointer
    .split("/")
    .slice(1)
    .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"))
    .map((part) => (/^(0|[1-9][0-9]*)$/.test(part) ? Number(part) : part));
}

// ajv's errors, each described once.
function uniqueErrors(errors) {
  const seen = new Set();
  return errors.filter((error) => !seen.has(describe(error)) && seen.add(describe(error)));
}

function describe(error) {
  return `${error.keyword} at #${encodeURI(error.instancePath)}: ${error.message}`;
}

// Checks root's admission/ and prints what it finds, setting the exit code to 1 on an error.
export function admissionCheck(root) {
  const { errors, stats } = checkAdmission(root);
  for (const { file, line, message } of errors) console.error(`${file}:${line}: ${message}`);
  if (errors.length) {
    console.error(`admission-check: ${errors.length} error${errors.length === 1 ? "" : "s"}`);
    process.exitCode = 1;
    return;
  }
  console.log(
    `admission-check: ok — ${stats.schemas} schemas; the table: ${stats.providers} providers, ${stats.facts} deployment facts, ${stats.capabilities} rules of capabilities and ${stats.cells} cells; ${stats.examples} examples, ${stats.ruleVectors} vectors of ${stats.rules} rules, ${stats.answerVectors} vectors of answers with ${stats.cases} cases`,
  );
}

if (isMain(import.meta.url)) {
  if (process.argv.length > 2) {
    console.error("usage: node tools/admission/main.mjs");
    process.exit(2);
  }
  admissionCheck(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."));
}
