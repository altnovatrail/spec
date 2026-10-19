// licenses-check: the licenses of the packages tools/ is built from.
//
//   node tools/licenses/main.mjs
//
// Reads tools/package-lock.json and checks that every package's license, an SPDX expression,
// is satisfied by the allowed list in config.mjs, or that the package is a named exception
// there. Prints one line per problem and exits 1 if there are any. The lock file is always the
// one beside this script: no path comes from the command line.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isMain } from "../shared.mjs";
import { allowed as ALLOWED, exceptions as EXCEPTIONS } from "./config.mjs";

export function checkLicenses(lock, { allowed = ALLOWED, exceptions = EXCEPTIONS } = {}) {
  const problems = [];
  const seen = new Set();
  let packages = 0;
  for (const [where, entry] of Object.entries(lock.packages ?? {})) {
    if (where === "" || entry.link) continue;
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

if (isMain(import.meta.url)) {
  const file = path.join(path.dirname(fileURLToPath(import.meta.url)), "../package-lock.json");
  const { problems, packages } = checkLicenses(JSON.parse(fs.readFileSync(file, "utf8")));
  for (const problem of problems) console.log(problem);
  if (problems.length) {
    console.log(`licenses-check: ${problems.length} problem${problems.length === 1 ? "" : "s"}`);
    process.exitCode = 1;
  } else {
    console.log(`licenses-check: ok — ${packages} packages, ${Object.keys(EXCEPTIONS).length} exceptions`);
  }
}
