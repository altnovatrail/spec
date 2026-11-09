// What the checks of spec's normative parts with a version of their own share — the admission table
// (tools/admission/main.mjs, R96) and the deployment configuration (tools/deployment/main.mjs,
// R85): the files of a part's folder, its VERSION, the problems of a YAML file, ajv's errors, and
// how a check prints what it finds.

import fs from "node:fs";
import path from "node:path";
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
// it cannot be read: missing is reported at line 0 when there is no file, and malformed at line 1
// when form does not match.
export function readVersion(root, file, form, { missing, malformed }, report) {
  if (!fs.existsSync(path.join(root, file))) {
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
