// format-check: the checks of the module format in spec's format/ (R45 and its amendment of
// 2026-10-22; RUN.md, T25).
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
// - the rules the text lists, each with test vectors in vectors/rules/<rule>/, and each such folder
//   with its rule: a case of a YAML rule breaks that rule and no other, a case of a part's rule
//   follows the YAML rules and passes the part's schema (section 9).
// Anything else in format/ is an error: what this check does not know would go unchecked, so the
// task that brings it extends the check. Prints one line per error, file:line: message, and exits 1
// if there are any.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { byCodeUnits, isMain } from "../shared.mjs";
import { checkExample, checkVector, compareYamlRules, isRuleId, readRules } from "./cases.mjs";
import { checkConventions, compileSchemas, isKebabCase, isSchemaName, readSchema } from "./schemas.mjs";

const UNKNOWN = "format-check does not know it: the task that brings it to format/ extends the check";

export function checkFormat(root) {
  const errors = [];
  const report = (file, line, message) => errors.push({ file, line, message });
  const layout = readLayout(root, report);
  const stats = { schemas: layout.schemas.length, examples: layout.examples.length, vectors: layout.vectors.length, rules: 0 };

  const version = readVersion(root, report);
  // The rules the text lists, or null when there is no text to list them.
  const readme = "format/README.md";
  let rules = null;
  if (fs.existsSync(path.join(root, readme))) {
    const read = readRules(fs.readFileSync(path.join(root, readme), "utf8"));
    rules = read.rules;
    for (const { line, message } of [...read.problems, ...compareYamlRules(rules)]) report(readme, line, message);
  } else {
    report(readme, 0, "the text of the format is missing");
  }
  stats.rules = rules?.length ?? 0;

  const schemas = layout.schemas.map((name) => readSchema(root, name));
  checkConventions(schemas, version);
  const validators = compileSchemas(schemas);
  const byTerm = new Map(schemas.map((schema) => [schema.term, schema]));
  for (const schema of schemas) for (const { line, message } of schema.problems) report(schema.file, line, message);

  // A term or a part with a schema that did not compile: its files go unchecked, said once.
  const unchecked = new Set();
  const validatorOf = (term, file, what) => {
    if (validators.has(term)) return validators.get(term);
    if (!byTerm.has(term)) report(file, 0, `no schema ${term}.schema.json for ${what}`);
    else if (!unchecked.has(term)) {
      unchecked.add(term);
      report(byTerm.get(term).file, 0, "its examples and vectors go unchecked until its errors are fixed");
    }
    return undefined;
  };

  for (const { file, term, kind } of layout.examples) {
    const validate = validatorOf(term, file, "the examples of this term");
    for (const { line, message } of checkExample(fs.readFileSync(path.join(root, file)), kind, validate)) report(file, line, message);
  }

  if (rules) {
    const listed = new Set(rules.map((rule) => rule.id));
    const withVectors = new Set(layout.vectors.map((vector) => vector.rule));
    for (const rule of rules) {
      if (!withVectors.has(rule.id)) report(readme, rule.line, `${rule.id} has no test vectors in format/vectors/rules/${rule.id}/`);
    }
    for (const folder of layout.ruleFolders) {
      if (!listed.has(folder.rule)) report(folder.file, 0, `format/README.md lists no rule ${folder.rule}`);
    }
  }
  for (const { file, rule } of layout.vectors) {
    const part = rule.split(".")[0];
    const validate = part === "yaml" ? undefined : validatorOf(part, file, "the vectors of this part's rule");
    for (const { line, message } of checkVector(fs.readFileSync(path.join(root, file)), rule, validate)) report(file, line, message);
  }

  errors.sort((a, b) => byCodeUnits(a.file, b.file) || a.line - b.line || byCodeUnits(a.message, b.message));
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

// The files of format/ by the layout of section 3, and an error for each one outside it.
function readLayout(root, report) {
  const layout = { schemas: [], examples: [], vectors: [], ruleFolders: [] };
  const entries = (dir) =>
    fs
      .readdirSync(path.join(root, dir), { withFileTypes: true })
      .sort((a, b) => byCodeUnits(a.name, b.name))
      .map((entry) => ({ name: entry.name, file: `${dir}/${entry.name}`, isFile: entry.isFile(), isFolder: entry.isDirectory() }));
  const unknown = (entry) => report(entry.file, 0, UNKNOWN);
  const cases = (dir, add) => {
    for (const entry of entries(dir)) {
      if (entry.isFile && entry.name.endsWith(".yaml") && isKebabCase(entry.name.slice(0, -".yaml".length))) add(entry.file);
      else if (entry.isFolder && isKebabCase(entry.name)) report(entry.file, 0, "a case laid out as a folder comes with the layout of a module (RUN.md, T26)");
      else report(entry.file, 0, `a case is <case>.yaml, its name in kebab-case; ${UNKNOWN}`);
    }
  };

  if (!fs.existsSync(path.join(root, "format"))) {
    report("format", 0, "there is no format/");
    return layout;
  }
  for (const entry of entries("format")) {
    if (entry.isFile && (entry.name === "README.md" || entry.name === "VERSION")) continue;
    if (!entry.isFolder) unknown(entry);
    else if (entry.name === "schemas") {
      for (const schema of entries(entry.file)) {
        if (schema.isFile && isSchemaName(schema.name)) layout.schemas.push(schema.name);
        else report(schema.file, 0, `a schema is <term>.schema.json, its term in kebab-case; ${UNKNOWN}`);
      }
    } else if (entry.name === "examples") {
      for (const term of entries(entry.file)) {
        if (!term.isFolder || !isKebabCase(term.name)) {
          report(term.file, 0, `examples are in examples/<term>/, its term in kebab-case; ${UNKNOWN}`);
          continue;
        }
        for (const kind of entries(term.file)) {
          if (kind.isFolder && (kind.name === "valid" || kind.name === "invalid")) cases(kind.file, (file) => layout.examples.push({ file, term: term.name, kind: kind.name }));
          else report(kind.file, 0, `examples are in valid/ or invalid/; ${UNKNOWN}`);
        }
      }
    } else if (entry.name === "vectors") {
      for (const kind of entries(entry.file)) {
        if (!kind.isFolder || kind.name !== "rules") {
          unknown(kind);
          continue;
        }
        for (const folder of entries(kind.file)) {
          if (!folder.isFolder || !isRuleId(folder.name)) {
            report(folder.file, 0, `vectors of a rule are in rules/<part>.<name>/, in kebab-case; ${UNKNOWN}`);
            continue;
          }
          layout.ruleFolders.push({ file: folder.file, rule: folder.name });
          cases(folder.file, (file) => layout.vectors.push({ file, rule: folder.name }));
        }
      }
    } else unknown(entry);
  }
  return layout;
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
