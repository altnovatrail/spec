// licenses-check: the licenses of the packages an npm lock file lists.
//
//   node tools/licenses/main.mjs                                       spec's own tools/
//   node tools/licenses/main.mjs --lock=<file> [--exceptions=<file>]   another repository's
//   node tools/licenses/main.mjs --allowed                             the allowed list
//
// Checks that every package's license, an SPDX expression, is satisfied by the allowed list in
// config.mjs, or that the package is a named exception. Prints one line per problem and exits 1
// if there are any, or 2 when it cannot check at all. With no options the lock file is
// tools/package-lock.json, beside this script, and the exceptions are config.mjs's. With --lock
// it is another repository's lock file, a path inside the folder the script runs from, and the
// exceptions are those its file names, or none: config.mjs's are spec's own. --allowed prints the list, one
// SPDX identifier a line, for another repository's check to take rather than copy (R39).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { byCodeUnits, isMain } from "../shared.mjs";
import { allowed as ALLOWED, exceptions as EXCEPTIONS } from "./config.mjs";

export function checkLicenses(lock, { allowed = ALLOWED, exceptions = EXCEPTIONS } = {}) {
  // npm 5 and 6 wrote lockfileVersion 1, whose tree is under dependencies alone: read for
  // packages, it would hold none and pass. "1: The lockfile version used by npm v5 and v6", and
  // packages "maps package locations to an object containing the information about that package"
  // (npm Docs, package-lock.json, v11, read 2026-10-21).
  if (!isObject(lock) || !isObject(lock.packages)) {
    const version = isObject(lock) ? (lock.lockfileVersion ?? "none") : "none";
    return {
      problems: [`the lock file has no packages, lockfileVersion ${version}: a lock file of npm 7 or later is read, one of npm 5 or 6 is refused`],
      packages: 0,
    };
  }
  const problems = [];
  const seen = new Set();
  let packages = 0;
  for (const [where, entry] of Object.entries(lock.packages)) {
    if (where === "") continue;
    if (!isObject(entry)) {
      problems.push(`${where}: not a package's entry`);
      continue;
    }
    if (entry.link) continue;
    packages++;
    // node_modules/a/node_modules/@s/b is @s/b; a path without node_modules is a package of the
    // project's own, a workspace, and goes by its path unless it names itself.
    const nested = where.lastIndexOf("node_modules/");
    const name = entry.name ?? (nested < 0 ? where : where.slice(nested + "node_modules/".length));
    const id = `${name}@${entry.version ?? "?"}`;
    const license = entry.license ?? null;
    if (Object.hasOwn(exceptions, name)) {
      seen.add(name);
      const expected = exceptions[name].license;
      if (license !== expected) {
        problems.push(`${id}: the exception expects ${expected ?? "no license"}, the lock file says ${license ?? "none"}`);
      }
      continue;
    }
    if (license === null) {
      problems.push(`${id}: no license in the lock file`);
      continue;
    }
    let ok;
    try {
      ok = satisfies(parse(license), allowed);
    } catch (error) {
      problems.push(`${id}: ${license}: ${error.message}`);
      continue;
    }
    if (!ok) problems.push(`${id}: ${license} is not on the allowed list`);
  }
  for (const name of Object.keys(exceptions)) {
    if (!seen.has(name)) problems.push(`${name}: an exception for a package the lock file no longer has`);
  }
  return { problems, packages };
}

// The exceptions another repository names in its file: a JSON object of packages, each with the
// license its lock file says — null when it says none — and why it is accepted, the decision that
// brings it in among it, as config.mjs gives spec's own (R12). Anything else in the file stops
// the check rather than being skipped.
export function readExceptions(text, file) {
  const read = parseJson(text, file);
  if (!isObject(read)) throw new Error(`${file}: not an object of packages`);
  for (const [name, exception] of Object.entries(read)) {
    const fields = isObject(exception) ? Object.keys(exception).sort(byCodeUnits).join(",") : "";
    const license = exception?.license;
    const reason = exception?.reason;
    if (
      name === "" ||
      fields !== "license,reason" ||
      !(license === null || (typeof license === "string" && license !== "")) ||
      typeof reason !== "string" ||
      reason.trim() === ""
    ) {
      throw new Error(`${file}: ${JSON.stringify(name)}: an exception is { "license": what the lock file says, or null, "reason": why }, and nothing else`);
    }
  }
  return read;
}

// A file's JSON; JSON that does not parse names its file.
export function parseJson(text, file) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${file}: not JSON: ${error.message}`);
  }
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// An SPDX expression as a tree: { id, exception } leaves, { and: [...] } and { or: [...] } nodes.
// Operators are all upper case or all lower case, as SPDX 3.0.1 (Annex B) has them; and is AND.
const OPERATORS = { AND: "AND", and: "AND", OR: "OR", or: "OR", WITH: "WITH", with: "WITH" };

export function parse(expression) {
  const tokens = (expression.match(/\(|\)|[^\s()]+/g) ?? []).map((token) => OPERATORS[token] ?? token);
  let at = 0;
  const peek = () => tokens[at];
  const next = () => tokens[at++];

  const any = () => {
    const parts = [all()];
    while (peek() === "OR") {
      next();
      parts.push(all());
    }
    return parts.length === 1 ? parts[0] : { or: parts };
  };
  const all = () => {
    const parts = [one()];
    while (peek() === "AND") {
      next();
      parts.push(one());
    }
    return parts.length === 1 ? parts[0] : { and: parts };
  };
  const one = () => {
    const token = next();
    if (token === "(") {
      const inside = any();
      if (next() !== ")") throw new Error("an unclosed parenthesis");
      return inside;
    }
    if (token === undefined || ["AND", "OR", "WITH", ")"].includes(token)) throw new Error("not an SPDX expression");
    if (peek() !== "WITH") return { id: token };
    next();
    const exception = next();
    if (exception === undefined) throw new Error("WITH names no exception");
    return { id: token, exception };
  };

  const tree = any();
  if (at !== tokens.length) throw new Error("not an SPDX expression");
  return tree;
}

// Whether the allowed licenses satisfy the tree: any one of OR, every one of AND. A license
// with an exception clause is a license of its own, and the list names none. Identifiers match
// whatever their case: "License identifiers ... should be matched in a case-insensitive manner"
// (SPDX 3.0.1, Annex B, read 2026-10-19).
export function satisfies(tree, allowed) {
  if (tree.or) return tree.or.some((part) => satisfies(part, allowed));
  if (tree.and) return tree.and.every((part) => satisfies(part, allowed));
  return !tree.exception && allowed.some((id) => id.toLowerCase() === tree.id.toLowerCase());
}

// One line per problem, then the verdict; name is the lock file's, or "" for spec's own.
function report(name, { problems, packages }, exceptions) {
  const head = name ? `licenses-check: ${name}:` : "licenses-check:";
  for (const problem of problems) console.log(problem);
  if (problems.length) {
    console.log(`${head} ${problems.length} problem${problems.length === 1 ? "" : "s"}`);
    process.exitCode = 1;
  } else {
    console.log(`${head} ok — ${packages} packages, ${Object.keys(exceptions).length} exceptions`);
  }
}

if (isMain(import.meta.url)) {
  try {
    const { values } = parseArgs({ options: { allowed: { type: "boolean" }, lock: { type: "string" }, exceptions: { type: "string" } } });
    if (values.allowed) {
      if (values.lock !== undefined || values.exceptions !== undefined) throw new Error("--allowed takes no lock file");
      for (const id of ALLOWED) console.log(id);
    } else if (values.lock !== undefined) {
      const exceptions = values.exceptions === undefined ? {} : readExceptions(read(inRepository(values.exceptions), values.exceptions), values.exceptions);
      report(values.lock, checkLicenses(parseJson(read(inRepository(values.lock), values.lock), values.lock), { exceptions }), exceptions);
    } else if (values.exceptions !== undefined) {
      throw new Error("--exceptions goes with the --lock file they are for");
    } else {
      const file = path.join(path.dirname(fileURLToPath(import.meta.url)), "../package-lock.json");
      report("", checkLicenses(parseJson(read(file), file)), EXCEPTIONS);
    }
  } catch (error) {
    console.error(`licenses-check: ${error.message}`);
    process.exitCode = 2;
  }
}

// A path another repository gives, as the absolute path it names: inside the folder the check runs
// from, the repository's root, and never outside it. A lock file and an exceptions file are the
// repository's own, so a path that leaves it — ../, or an absolute path elsewhere — is refused.
function inRepository(file) {
  const root = process.cwd();
  const resolved = path.resolve(root, file);
  if (!resolved.startsWith(root + path.sep)) throw new Error(`${file}: not a file of the repository the check runs in, ${root}`);
  return resolved;
}

// A file's text; a file that cannot be read says which, by the name it was given, and why.
function read(file, name = file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch (error) {
    throw new Error(`${name}: cannot be read: ${error.code ?? error.message}`);
  }
}
