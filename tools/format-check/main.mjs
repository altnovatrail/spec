// format-check: the checks of the module format in spec's format/ (R45 and its amendment of
// 2026-10-22, R46; RUN.md, T25 and T26).
//
//   node tools/format-check/main.mjs      spec's own format/, two levels above this file
//
// Finds the files by the layout of the format text, section 3, and checks:
// - VERSION: MAJOR.MINOR (R44);
// - each schema, schemas/<term>.schema.json, against the conventions of section 5 and the 2020-12
//   meta-schema, and that the schemas compile together;
// - each example, examples/<term>/valid/<case>.yaml and invalid/<case>.yaml: the YAML rules of
//   section 4, and its schema — a valid one passes it, an invalid one gives the error its first line
//   names (section 8);
// - each example of a whole module, examples/module/valid/<case>/, laid out as a module: its files
//   by the layout of section 10, the YAML rules and the schema of each file's part, and the rules of
//   a whole module;
// - the rules the text lists, each with test vectors in vectors/rules/<rule>/, and each such folder
//   with its rule: a case of a YAML rule breaks that rule and no other; a case of a rule of a whole
//   module is a folder that breaks that rule and no other; a case of a part's rule follows the YAML
//   rules and passes the part's schema, and one laid out as a module follows the rules of a whole
//   module too (section 9);
// - the format version that each manifest names: the one in VERSION, but in the cases of
//   manifest.format-version, which name one no reader of it reads (section 11).
// Anything else in format/ is an error: what this check does not know would go unchecked, so the
// task that brings it extends the check. Prints one line per error, file:line: message, and exits 1
// if there are any.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { byCodeUnits, isMain } from "../shared.mjs";
import { checkExample, checkModuleCase, checkVector, compareOwnRules, isRuleId, partOf, readText } from "./cases.mjs";
import { listFolder, readLayout } from "./module.mjs";
import { checkConventions, compileSchemas, isKebabCase, isSchemaName, readSchema } from "./schemas.mjs";

const UNKNOWN = "format-check does not know it: the task that brings it to format/ extends the check";
const README = "format/README.md";
// The examples of a whole module, which has no schema of its own.
const MODULE = "module";

export function checkFormat(root) {
  const errors = [];
  const report = (file, line, message) => errors.push({ file, line, message });
  const files = readFiles(root, report);
  const version = readVersion(root, report);
  const schemas = readSchemas(root, files.schemas, version, report);
  const { rules, layout } = readFormatText(root, schemas, report);
  checkCases(root, files, { rules, layout, version, schemas }, report);

  errors.sort((a, b) => byCodeUnits(a.file, b.file) || a.line - b.line || byCodeUnits(a.message, b.message));
  const stats = { schemas: files.schemas.length, examples: files.examples.length, vectors: files.vectors.length, rules: rules?.length ?? 0 };
  return { errors, stats };
}

// format/VERSION, MAJOR.MINOR and a newline (R44), or null.
function readVersion(root, report) {
  const file = "format/VERSION";
  if (!fs.existsSync(path.join(root, file))) {
    report(file, 0, "the format's version is missing");
    return null;
  }
  const text = fs.readFileSync(path.join(root, file), "utf8");
  const version = text.endsWith("\n") ? text.slice(0, -1) : null;
  const parts = version?.split(".") ?? [];
  if (parts.length !== 2 || !parts.every((part) => part === "0" || /^[1-9][0-9]*$/.test(part))) {
    report(file, 1, "the version is MAJOR.MINOR and a newline, such as 0.1");
    return null;
  }
  return version;
}

// The schemas, checked and compiled: { has(term), validatorOf(term) }. A term whose schema did not
// compile has no validator, and its files go unchecked, as is said once.
function readSchemas(root, names, version, report) {
  const schemas = names.map((name) => readSchema(root, name));
  checkConventions(schemas, version);
  const validators = compileSchemas(schemas);
  const byTerm = new Map(schemas.map((schema) => [schema.term, schema]));
  for (const schema of schemas) for (const { line, message } of schema.problems) report(schema.file, line, message);
  const unchecked = new Set();
  return {
    has: (term) => byTerm.has(term),
    validatorOf: (term) => {
      if (validators.has(term)) return validators.get(term);
      if (byTerm.has(term) && !unchecked.has(term)) {
        unchecked.add(term);
        report(byTerm.get(term).file, 0, "its examples and vectors go unchecked until its errors are fixed");
      }
      return undefined;
    },
  };
}

// The rules and the layout of a module that the text lists: rules null when there is no text to
// list them, and layout null when the text has none or it has errors.
function readFormatText(root, schemas, report) {
  if (!fs.existsSync(path.join(root, README))) {
    report(README, 0, "the text of the format is missing");
    return { rules: null, layout: null };
  }
  const text = readText(fs.readFileSync(path.join(root, README), "utf8"));
  for (const { line, message } of [...text.problems, ...compareOwnRules(text.rules)]) report(README, line, message);
  if (!text.layoutRows) return { rules: text.rules, layout: null };
  const { layout, problems } = readLayout(text.layoutRows);
  for (const { line, message } of problems) report(README, line, message);
  const missing = layout.filter((row) => row.part !== null && !schemas.has(row.part));
  for (const row of missing) report(README, row.line, `the layout names the part ${row.part}, and there is no schemas/${row.part}.schema.json`);
  return { rules: text.rules, layout: problems.length === 0 && missing.length === 0 ? layout : null };
}

// The examples and the test vectors, each against its schema and the rules it shows or breaks, and
// the rules of the text against the folders of their vectors.
function checkCases(root, files, { rules, layout, version, schemas }, report) {
  const schemaOf = (term, file, what) => {
    if (!schemas.has(term)) report(file, 0, `no schema ${term}.schema.json for ${what}`);
    return schemas.validatorOf(term);
  };
  let waiting = false;
  const checkFolder = (file, rule) => {
    if (layout) {
      for (const problem of checkModuleCase(path.join(root, file), { rule, layout, validatorOf: schemas.validatorOf, version })) {
        report(problem.file ? `${file}/${problem.file}` : file, problem.line, problem.message);
      }
    } else if (rules && !waiting) {
      waiting = true;
      report(README, 0, "the cases laid out as a module go unchecked until the layout of a module is fixed");
    }
  };

  for (const { file, term, kind, folder } of files.examples) {
    if (folder) {
      checkFolder(file, null);
      continue;
    }
    const validate = schemaOf(term, file, "the examples of this term");
    for (const { line, message } of checkExample(fs.readFileSync(path.join(root, file)), { kind, term, validate, version })) report(file, line, message);
  }
  if (rules) checkRuleFolders(files, rules, report);
  for (const { file, rule, folder } of files.vectors) {
    if (folder) {
      checkFolder(file, rule);
      continue;
    }
    const part = partOf(rule);
    const validate = part === "yaml" ? undefined : schemaOf(part, file, "the vectors of this part's rule");
    for (const { line, message } of checkVector(fs.readFileSync(path.join(root, file)), { rule, validate, version })) report(file, line, message);
  }
}

// Each rule the text lists has vectors, and each folder of vectors has its rule in the text.
function checkRuleFolders(files, rules, report) {
  const listed = new Set(rules.map((rule) => rule.id));
  const withVectors = new Set(files.vectors.map((vector) => vector.rule));
  for (const rule of rules) {
    if (!withVectors.has(rule.id)) report(README, rule.line, `${rule.id} has no test vectors in format/vectors/rules/${rule.id}/`);
  }
  for (const folder of files.ruleFolders) {
    if (!listed.has(folder.rule)) report(folder.file, 0, `format/README.md lists no rule ${folder.rule}`);
  }
}

// The files of format/ by the layout of section 3, and an error for each one outside it. A case is a
// file, <case>.yaml, or a folder laid out as a module, <case>/: an example of a whole module is a
// folder, a case of a YAML rule a file, and a case of a rule of a whole module a folder.
function readFiles(root, report) {
  const files = { schemas: [], examples: [], vectors: [], ruleFolders: [] };
  if (!fs.existsSync(path.join(root, "format"))) {
    report("format", 0, "there is no format/");
    return files;
  }
  const at = { root, report, files };
  for (const entry of entriesOf(root, "format")) {
    if (entry.isFile && (entry.name === "README.md" || entry.name === "VERSION")) continue;
    if (!entry.isFolder) report(entry.file, 0, UNKNOWN);
    else if (entry.name === "schemas") readSchemaFiles(at, entry.file);
    else if (entry.name === "examples") readExampleFiles(at, entry.file);
    else if (entry.name === "vectors") readVectorFiles(at, entry.file);
    else report(entry.file, 0, UNKNOWN);
  }
  return files;
}

function entriesOf(root, dir) {
  return listFolder(path.join(root, dir)).map((entry) => ({ name: entry.name, file: `${dir}/${entry.name}`, isFile: entry.isFile(), isFolder: entry.isDirectory() }));
}

function readSchemaFiles({ root, report, files }, dir) {
  for (const schema of entriesOf(root, dir)) {
    if (schema.isFile && isSchemaName(schema.name)) files.schemas.push(schema.name);
    else report(schema.file, 0, `a schema is <term>.schema.json, its term in kebab-case; ${UNKNOWN}`);
  }
}

function readExampleFiles(at, dir) {
  const { root, report, files } = at;
  for (const term of entriesOf(root, dir)) {
    if (!term.isFolder || !isKebabCase(term.name)) {
      report(term.file, 0, `examples are in examples/<term>/, its term in kebab-case; ${UNKNOWN}`);
      continue;
    }
    for (const kind of entriesOf(root, term.file)) {
      const add = (file, folder) => files.examples.push({ file, term: term.name, kind: kind.name, folder });
      if (!kind.isFolder || (kind.name !== "valid" && kind.name !== "invalid")) report(kind.file, 0, `examples are in valid/ or invalid/; ${UNKNOWN}`);
      else if (term.name !== MODULE) readCases(at, kind.file, { onlyFile: `a case is <case>.yaml: an example laid out as a module is in examples/${MODULE}/valid/` }, add);
      else if (kind.name === "valid") readCases(at, kind.file, { onlyFolder: "an example of a whole module is a folder laid out as a module, <case>/" }, add);
      else report(kind.file, 0, "a whole module has no invalid examples: a module that breaks a rule of a whole module is a test vector of that rule");
    }
  }
}

function readVectorFiles(at, dir) {
  const { root, report, files } = at;
  for (const kind of entriesOf(root, dir)) {
    if (!kind.isFolder || kind.name !== "rules") {
      report(kind.file, 0, UNKNOWN);
      continue;
    }
    for (const folder of entriesOf(root, kind.file)) {
      if (!folder.isFolder || !isRuleId(folder.name)) {
        report(folder.file, 0, `vectors of a rule are in rules/<part>.<name>/, in kebab-case; ${UNKNOWN}`);
        continue;
      }
      files.ruleFolders.push({ file: folder.file, rule: folder.name });
      const add = (file, isFolder) => files.vectors.push({ file, rule: folder.name, folder: isFolder });
      const part = partOf(folder.name);
      const only = { yaml: { onlyFile: "a case of a YAML rule is a file, <case>.yaml: the rule is a file's" }, [MODULE]: { onlyFolder: "a case of a rule of a whole module is a folder laid out as a module, <case>/" } };
      readCases(at, folder.file, only[part] ?? {}, add);
    }
  }
}

// The cases in dir: files <case>.yaml, unless onlyFolder says why a file is none there, and folders
// <case>/, unless onlyFile says why a folder is none; each name in kebab-case.
function readCases({ root, report }, dir, { onlyFile, onlyFolder }, add) {
  for (const entry of entriesOf(root, dir)) {
    const isFileCase = entry.isFile && entry.name.endsWith(".yaml") && isKebabCase(entry.name.slice(0, -".yaml".length));
    const isFolderCase = entry.isFolder && isKebabCase(entry.name);
    if (isFileCase) {
      if (onlyFolder) report(entry.file, 0, onlyFolder);
      else add(entry.file, false);
    } else if (isFolderCase) {
      if (onlyFile) report(entry.file, 0, onlyFile);
      else add(entry.file, true);
    } else if (onlyFile) report(entry.file, 0, `a case is <case>.yaml, its name in kebab-case; ${UNKNOWN}`);
    else if (onlyFolder) report(entry.file, 0, `a case is a folder <case>/, its name in kebab-case; ${UNKNOWN}`);
    else report(entry.file, 0, `a case is <case>.yaml, or a folder <case>/ laid out as a module, its name in kebab-case; ${UNKNOWN}`);
  }
}

if (isMain(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const { errors, stats } = checkFormat(root);
  for (const { file, line, message } of errors) console.log(`${file}:${line}: ${message}`);
  if (errors.length) {
    console.log(`format-check: ${errors.length} error${errors.length === 1 ? "" : "s"}`);
    process.exitCode = 1;
  } else {
    console.log(`format-check: ok — ${stats.schemas} schemas, ${stats.examples} examples, ${stats.vectors} vectors of ${stats.rules} rules`);
  }
}
