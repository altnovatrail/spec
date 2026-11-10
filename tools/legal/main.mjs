// legal-check: spec's own legal/, the legal texts (R130), by the layout of its text,
// legal/README.md, section 3:
//
//   node tools/legal/main.mjs                  checks spec's own legal/
//   node tools/legal/main.mjs --dir <folder>   checks a self-hosted copy's folder (section 8)
//
// It checks VERSION, an integer; each schema against the conventions of the module format's
// schemas (format/README.md, section 5) under the prefix of the legal texts, with no x-open, and
// against the 2020-12 meta-schema; that the passport's field format holds the version in VERSION;
// the rules the text lists against those reading.mjs knows, in their order; each example against
// its schema; and each vector of reading, whose cases it reads as section 5 of the text gives
// (reading.mjs) and compares. Between them, the vectors accept a part and refuse one by the schema
// and by each rule (section 7). A file the layout does not know is an error. Last, it reads the part
// itself — legal.yaml and the files under texts/ — as section 5 gives, with the part of the release
// before for legal.in-force-unchanged (tools/release/previous.mjs).
//
// With --dir, it reads an operator's folder instead, its paths from where it runs: VERSION, which is
// this spec's, legal.yaml and texts/, and nothing else, against this spec's schema of the passport
// and the rules of section 5 but legal.in-force-unchanged, since the copy's operator keeps its own
// history (section 5). Prints each error as file:line: message, the line 0 when there is none, and
// exits 1 when there is one, or 2 on a wrong command line.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { checkConventions, compileSchemas, isKebabCase, isSchemaName, readSchema } from "../format-check/schemas.mjs";
import { checkExample } from "../format-check/cases.mjs";
import { firstInvalidByte, readModuleFile } from "../format-check/yaml.mjs";
import { byCodeUnits, git, isMain } from "../shared.mjs";
import { checkFormatField, describe, filesUnder, printCheck, readRules, readVersion as readVersionFile, uniqueErrors, yamlProblems } from "../parts.mjs";
import { previousReleaseTag } from "../release/previous.mjs";
import { MARKDOWN, RULES, SCHEMA, markdownProblem, readingOf } from "./reading.mjs";

export const FOLDER = "legal";
export const LEGAL_PART = { folder: FOLDER, prefix: "https://altnovatrail.github.io/spec/legal/", open: false };
const PASSPORT_TERM = "legal";
const VECTOR_TERM = "reading-vector";
const PASSPORT = "legal.yaml";
const TEXTS = "texts";
const VERSION = /^([1-9]\d*)\n$/;
const VERSION_WORDS = { missing: "no VERSION: the part's version, an integer and a newline", malformed: "the part's version is an integer from 1 and a newline, with no leading zero" };

// The errors of root's legal/ and what it holds: { errors: [{ file, line, message }], stats }.
// previousOf(root) gives the release before, { tag, part } with part null when it has no legal/,
// or null when there is none; it throws when it cannot tell.
export function checkLegal(root, { previousOf = previousLegal } = {}) {
  const errors = [];
  const report = (file, line, message) => errors.push({ file, line, message });
  const stats = { schemas: 0, examples: 0, rules: 0, vectors: 0, cases: 0, texts: 0, versions: 0, current: 0, previous: null };
  if (!fs.existsSync(path.join(root, FOLDER))) {
    report(FOLDER, 0, "the legal texts' folder is not there");
    return { errors, stats };
  }
  const layout = readLayout(root, report);
  const version = readVersionFile(root, `${FOLDER}/VERSION`, VERSION, VERSION_WORDS, report);

  const schemas = layout.schemas.map((name) => readSchema(root, name, LEGAL_PART));
  checkConventions(schemas, version);
  for (const schema of schemas) for (const problem of schema.problems) report(schema.file, problem.line, problem.message);
  const { validators } = compileSchemas(schemas);
  stats.schemas = schemas.length;
  for (const term of [PASSPORT_TERM, VECTOR_TERM]) {
    if (!layout.schemas.includes(`${term}.schema.json`)) report(`${FOLDER}/schemas`, 0, `no ${term}.schema.json, which the text names`);
  }
  checkFormatField(schemas, version, FOLDER, PASSPORT_TERM, report);
  stats.rules = readRules(root, FOLDER, RULES, "legal-check", report).length;

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
    const { problems, cases } = vectorProblems(fs.readFileSync(path.join(root, file)), validators.get(VECTOR_TERM), validators.get(PASSPORT_TERM));
    for (const problem of problems) report(file, problem.line, problem.message);
    for (const each of cases) outcomes.add(each.refused_by ?? "accepted");
    stats.vectors++;
    stats.cases += cases.length;
  }
  if (validators.has(VECTOR_TERM) && validators.has(PASSPORT_TERM)) {
    for (const outcome of ["accepted", SCHEMA, ...RULES]) {
      if (outcomes.has(outcome)) continue;
      const what = outcome === "accepted" ? "accepts a part" : outcome === SCHEMA ? "refuses a part by the schema" : `refuses a part by ${outcome}`;
      report(`${FOLDER}/vectors/reading`, 0, `no vector of reading ${what} (${FOLDER}/README.md, section 7)`);
    }
  }

  // The part itself, against the release before.
  // A part whose release before cannot be read is not read: legal.in-force-unchanged would hold
  // for nothing.
  let previous = null;
  let known = true;
  try {
    previous = previousOf(root);
  } catch (error) {
    report(FOLDER, 0, `the release before cannot be read, for legal.in-force-unchanged: ${error.message}`);
    known = false;
  }
  stats.previous = previous?.tag ?? null;
  const part = readPart(path.join(root, FOLDER), FOLDER, report);
  if (part && known && validators.has(PASSPORT_TERM)) readThePart(validators.get(PASSPORT_TERM), part, previous, FOLDER, report, stats);

  errors.sort((a, b) => byCodeUnits(a.file, b.file) || a.line - b.line || byCodeUnits(a.message, b.message));
  return { errors, stats };
}

// The errors of a self-hosted copy's folder, dir, which the errors name as shown, checked against
// the schema of the passport of spec at specRoot and the rules of section 5 but
// legal.in-force-unchanged: { errors, stats }.
export function checkLegalDir(dir, specRoot, shown = dir) {
  const errors = [];
  const report = (file, line, message) => errors.push({ file, line, message });
  const stats = { texts: 0, versions: 0, current: 0, version: null };
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    report(shown, 0, "no folder there");
    return { errors, stats };
  }
  // What stands beside VERSION, the passport and texts/ is named file by file; what each of those
  // three is, its reader says.
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => byCodeUnits(a.name, b.name))) {
    if (["VERSION", PASSPORT, TEXTS].includes(entry.name)) continue;
    for (const file of entry.isDirectory() ? filesUnder(dir, entry.name) : [entry.name]) {
      report(`${shown}/${file}`, 0, `no file of a copy's folder, which holds VERSION, ${PASSPORT} and ${TEXTS}/ alone (${FOLDER}/README.md, sections 3 and 8)`);
    }
  }
  const version = readVersionFile(dir, "VERSION", VERSION, VERSION_WORDS, (file, line, message) => report(`${shown}/${file}`, line, message));
  const ours = fs.readFileSync(path.join(specRoot, FOLDER, "VERSION"), "utf8").trim();
  stats.version = ours;
  if (version !== null && version !== ours) report(`${shown}/VERSION`, 1, `the folder is of version ${version}, and this spec's legal/ of ${ours}: check it by the spec of its version`);
  const schema = readSchema(specRoot, `${PASSPORT_TERM}.schema.json`, LEGAL_PART);
  const validate = compileSchemas([schema]).validators.get(PASSPORT_TERM);
  if (!validate) throw new Error(`${schema.file} of this spec does not compile: run just legal-check`);
  const part = readPart(dir, shown, report);
  if (part && version === ours) readThePart(validate, part, null, shown, report, stats);
  errors.sort((a, b) => byCodeUnits(a.file, b.file) || a.line - b.line || byCodeUnits(a.message, b.message));
  return { errors, stats };
}

// The part in the folder dir, { passport, files }, its files shown under shown, or null when it
// cannot be read: the passport, a file, by the YAML rules of the format, and each file under
// texts/, a folder, which is UTF-8, as its bytes, which legal.in-force-unchanged compares.
function readPart(dir, shown, report) {
  const passportFile = path.join(dir, PASSPORT);
  const texts = path.join(dir, TEXTS);
  let readable = true;
  if (!fs.existsSync(passportFile)) {
    report(`${shown}/${PASSPORT}`, 0, "no passport");
    readable = false;
  } else if (!fs.statSync(passportFile).isFile()) {
    report(`${shown}/${PASSPORT}`, 0, "the passport is a file, and this is none");
    readable = false;
  }
  if (fs.existsSync(texts) && !fs.statSync(texts).isDirectory()) {
    report(`${shown}/${TEXTS}`, 0, `${TEXTS}/ is a folder of the versions of the texts, and this is none`);
    readable = false;
  }
  if (!readable) return null;
  const read = readModuleFile(fs.readFileSync(passportFile));
  const problems = yamlProblems(read);
  for (const { line, message } of problems) report(`${shown}/${PASSPORT}`, line, message);
  const files = {};
  if (fs.existsSync(texts)) {
    for (const file of filesUnder(dir, TEXTS)) {
      const bytes = fs.readFileSync(path.join(dir, file));
      if (firstInvalidByte(bytes) >= 0) report(`${shown}/${file}`, 0, "a text is UTF-8");
      files[file] = bytes;
    }
  }
  return problems.length ? null : { passport: read.value, files };
}

// Reads the part, with the release before, { tag, part } or null, and reports what refuses it.
function readThePart(validate, part, previous, shown, report, stats) {
  const reading = readingOf(validate, part, previous?.part ?? null);
  if (reading.current) {
    const texts = Object.values(part.passport.texts);
    stats.texts = texts.length;
    stats.versions = texts.reduce((sum, text) => sum + text.versions.length, 0);
    stats.current = Object.keys(reading.current.texts).length + Object.keys(reading.current.sets).length;
    return;
  }
  for (const name of reading.names) {
    const isFile = name.startsWith(`${TEXTS}/`);
    const file = isFile ? `${shown}/${name}` : `${shown}/${PASSPORT}`;
    if (reading.refused_by === SCHEMA) report(file, 0, `does not pass ${FOLDER}/schemas/${PASSPORT_TERM}.schema.json: ${name || "the root"}`);
    else if (reading.refused_by === MARKDOWN) report(file, 0, `${MARKDOWN}: ${markdownProblem(part.files[name])}`);
    else {
      const against = previous ? `, against ${previous.tag}` : "";
      report(file, 0, `${reading.refused_by}: ${name}${isFile ? "" : `, ${FOLDER}/README.md, section 5`}${against}`);
    }
  }
}

// The release before root's HEAD, for legal.in-force-unchanged: { tag, part } with the part as that
// release has it, null when it has no legal/, and null when there is no release before. Throws
// when that part cannot be read.
export function previousLegal(root) {
  const tag = previousReleaseTag(root, [FOLDER]);
  if (!tag) return null;
  return { tag, part: legalAt(root, tag) };
}

// The part at a revision of the repository at root, { passport, files }, or null when it has no
// legal/: the passport as YAML reads it, and the files under texts/ as their bytes, all of them
// read by one git cat-file. A revision whose passport is missing or breaks the YAML rules has no
// part to compare with, and throws: legal.in-force-unchanged would hold for nothing.
export function legalAt(root, revision) {
  const blobs = git(root, ["ls-tree", "-r", "-z", revision, "--", `${FOLDER}/`])
    .split("\0")
    .filter(Boolean)
    .map((line) => {
      const [meta, file] = line.split("\t");
      const [, type, object] = meta.split(" ");
      return { type, object, file };
    })
    .filter(({ type }) => type === "blob");
  if (blobs.length === 0) return null;
  const contents = blobsOf(git(root, ["cat-file", "--batch"], { encoding: "buffer", input: `${blobs.map(({ object }) => object).join("\n")}\n` }), blobs.length);
  const bytes = new Map(blobs.map(({ file }, index) => [file, contents[index]]));
  const passportFile = `${FOLDER}/${PASSPORT}`;
  if (!bytes.has(passportFile)) throw new Error(`${revision} has ${FOLDER}/ and no ${passportFile}`);
  const read = readModuleFile(bytes.get(passportFile));
  const problems = yamlProblems(read);
  if (problems.length) throw new Error(`${passportFile} at ${revision} cannot be read: ${problems.map(({ line, message }) => `line ${line}: ${message}`).join("; ")}`);
  const files = {};
  for (const [file, content] of bytes) if (file.startsWith(`${FOLDER}/${TEXTS}/`)) files[file.slice(FOLDER.length + 1)] = content;
  return { passport: read.value, files };
}

// The contents of count objects that git cat-file --batch wrote, each "<object> blob <size>\n",
// its bytes and "\n", in the order they were asked for.
function blobsOf(output, count) {
  const contents = [];
  let at = 0;
  for (let index = 0; index < count; index++) {
    const end = output.indexOf(0x0a, at);
    const size = Number(output.subarray(at, end).toString("utf8").split(" ")[2]);
    contents.push(output.subarray(end + 1, end + 1 + size));
    at = end + 1 + size + 1;
  }
  return contents;
}

// The files of legal/, by the layout of the text: { schemas: [name], examples: [{ file, term,
// kind }], vectors: [file] }. Reports a file it does not know; the passport and every file under
// texts/ are the part's, which the reading names.
function readLayout(root, report) {
  const layout = { schemas: [], examples: [], vectors: [] };
  const isCase = (name) => name.endsWith(".yaml") && isKebabCase(name.slice(0, -".yaml".length));
  for (const file of filesUnder(root, FOLDER)) {
    const parts = file.split("/").slice(1);
    if (parts.length === 1 && ["README.md", "VERSION"].includes(parts[0])) continue;
    // The passport and texts/ are the part's: readPart says what is wrong with either.
    if (parts[0] === TEXTS || parts[0] === PASSPORT) continue;
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
function vectorProblems(bytes, validate, validatePassport) {
  const read = readModuleFile(bytes);
  const problems = yamlProblems(read);
  if (problems.length || !validate || !validatePassport) return { problems, cases: [] };
  if (!validate(read.value)) return { problems: uniqueErrors(validate.errors).map((error) => ({ line: 0, message: `does not pass the schema of a vector of reading: ${describe(error)}` })), cases: [] };
  const { cases } = read.value;
  cases.forEach(({ passport, files, previous, ...wanted }, index) => {
    const computed = readingOf(validatePassport, { passport, files }, previous ?? null);
    if (!isDeepStrictEqual(computed, { ...wanted })) {
      problems.push({ line: 0, message: `cases/${index}: the reading gives ${JSON.stringify(computed)}, and the vector ${JSON.stringify(wanted)}` });
    }
  });
  return { problems, cases };
}

// Checks root's legal/ and prints what it finds, setting the exit code to 1 on an error.
export function legalCheck(root, options = {}) {
  printCheck("legal-check", checkLegal(root, options), (stats) => {
    const against = stats.previous ? `, against ${stats.previous}` : ", with no release before";
    return `${stats.schemas} schemas, ${stats.rules} rules, ${stats.examples} examples, ${stats.vectors} vectors of reading with ${stats.cases} cases; the part: ${stats.texts} texts, ${stats.versions} versions, ${stats.current} current${against}`;
  });
}

// Checks a copy's folder and prints what it finds, setting the exit code to 1 on an error.
export function legalCheckDir(dir, specRoot, shown = dir) {
  printCheck("legal-check-dir", checkLegalDir(dir, specRoot, shown), (stats) => `${shown}, version ${stats.version}: ${stats.texts} texts, ${stats.versions} versions, ${stats.current} current`);
}

if (isMain(import.meta.url)) {
  const args = process.argv.slice(2);
  const spec = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  if (args.length === 0) legalCheck(spec);
  else if (args.length === 2 && args[0] === "--dir" && args[1] !== "") {
    // The folder as given, but its trailing slashes; a root of slashes alone is "/".
    let end = args[1].length;
    while (end > 1 && args[1][end - 1] === "/") end--;
    const shown = args[1].slice(0, end);
    legalCheckDir(path.resolve(shown), spec, shown);
  } else {
    console.error("usage: node tools/legal/main.mjs [--dir <folder>]");
    process.exit(2);
  }
}
