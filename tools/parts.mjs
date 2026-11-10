// What the checks of spec's normative parts with a version of their own share — the admission table
// (tools/admission/main.mjs, R96), the deployment configuration (tools/deployment/main.mjs, R85),
// the legal texts (tools/legal/main.mjs, R130) and the age of digital consent
// (tools/consent-age/main.mjs, R134): the files of a part's folder, its VERSION, the problems of a
// YAML file, ajv's errors and the paths they name, and how a check prints what it finds.

import fs from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { readText } from "./format-check/cases.mjs";
import { byCodeUnits } from "./shared.mjs";

// Every file under dir of root, by its path from root with forward slashes, in the order of code
// units.
export function filesUnder(root, dir) {
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

// The version in a part's VERSION file of root, as the first group of form matches it, or null when
// it cannot be read: missing is reported at line 0 when there is no file — nothing, or a folder of
// that name —, and malformed at line 1 when form does not match.
export function readVersion(root, file, form, { missing, malformed }, report) {
  if (!fs.existsSync(path.join(root, file)) || !fs.statSync(path.join(root, file)).isFile()) {
    report(file, 0, missing);
    return null;
  }
  const match = form.exec(fs.readFileSync(path.join(root, file), "utf8"));
  if (!match) {
    report(file, 1, malformed);
    return null;
  }
  return match[1];
}

// The problems of a file that readModuleFile read: what is not YAML, and each YAML rule broken.
export function yamlProblems({ violations, notYaml }) {
  return [...notYaml.map(({ line, message }) => ({ line, message: `not YAML: ${message}` })), ...violations.map(({ rule, line, message }) => ({ line, message: `${rule}: ${message}` }))];
}

// ajv's errors, each described once: ajv repeats an error at a place for each branch that met it.
export function uniqueErrors(errors) {
  const seen = new Set();
  return errors.filter((error) => !seen.has(describe(error)) && seen.add(describe(error)));
}

export function describe(error) {
  return `${error.keyword} at #${encodeURI(error.instancePath)}: ${error.message}`;
}

// The paths that ajv's errors name, each once, in the order of code units: the names of the fields
// from the root joined by ".", an index of a list among them; a missing or unknown field at the path
// it would have, a name a map does not allow at the path it has, and any other error at the place it
// stands. An if is left out: the error of its then or its else names the same place, or one below.
export function namesOf(errors) {
  const paths = new Set();
  for (const error of errors) {
    if (error.keyword === "if") continue;
    const names = error.instancePath
      .split("/")
      .slice(1)
      .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"));
    if (error.propertyName !== undefined) names.push(error.propertyName);
    else if (error.keyword === "propertyNames") names.push(error.params.propertyName);
    else if (error.keyword === "required") names.push(error.params.missingProperty);
    else if (error.keyword === "unevaluatedProperties") names.push(error.params.unevaluatedProperty);
    paths.add(names.join("."));
  }
  return [...paths].sort(byCodeUnits);
}

// The field format of the part's file holds the version in VERSION, and nothing else: the schema of
// term, the file's, has it as a const.
export function checkFormatField(schemas, version, folder, term, report) {
  const schema = schemas.find((each) => each.name === `${term}.schema.json`);
  if (!schema?.json || version === null) return;
  if (schema.json.properties?.format?.const !== Number(version)) report(schema.file, schema.lineOf(["properties", "format", "const"]), `the field format is the const ${version}, the version in ${folder}/VERSION`);
}

// The rules the text of the part in folder lists, read as format-check reads them, each against
// known, the IDs of the rules its reading knows, in their order; check names the check in what it
// reports. Returns the rules the text lists.
export function readRules(root, folder, known, check, report) {
  const readme = `${folder}/README.md`;
  if (!fs.existsSync(path.join(root, readme))) {
    report(readme, 0, "no text");
    return [];
  }
  const { rules, problems } = readText(fs.readFileSync(path.join(root, readme), "utf8"));
  // A part has no layout of a module: readText's complaint of that is the format's alone.
  for (const problem of problems) if (problem.line > 0) report(readme, problem.line, problem.message);
  const ids = rules.map((rule) => rule.id);
  for (const rule of rules) if (!known.includes(rule.id)) report(readme, rule.line, `${rule.id}: no rule ${check} knows`);
  for (const rule of known) if (!ids.includes(rule)) report(readme, 0, `${rule}: a rule ${check} knows, and the text lists it not`);
  // The rules are read in the order of the table, and the first one broken refuses what is read:
  // the order is part of what they say.
  const listed = ids.filter((id) => known.includes(id));
  if (!isDeepStrictEqual(listed, known.filter((rule) => ids.includes(rule)))) report(readme, rules[0].line, `the rules stand in the order reading.mjs reads them, ${known.join(", ")}`);
  return rules;
}

// Prints what the check named name found, { errors, stats }: each error as file:line: message and
// their count, setting the exit code to 1, or the line ok with what summary says of the stats.
export function printCheck(name, { errors, stats }, summary) {
  for (const { file, line, message } of errors) console.error(`${file}:${line}: ${message}`);
  if (errors.length) {
    console.error(`${name}: ${errors.length} error${errors.length === 1 ? "" : "s"}`);
    process.exitCode = 1;
    return;
  }
  console.log(`${name}: ok — ${summary(stats)}`);
}
