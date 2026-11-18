// Budgets: how large a file, a rule of .claude/rules/, an entry of the decision log, a section of a
// document or a row of a table may grow, in KB of 1,024 bytes (R145). A session pays for what it
// reads by tokens, but a limit in bytes holds without a key or a network, and does not move when a
// tokenizer does: English text is at least 2.5 bytes a token and Russian tables 2.7, as
// docs/measurements.md has it, so 24 KB of English is at most ≈ 9.8 thousand tokens.
//
// The limits are tools/docs-check/budgets.json: its block "spec" holds spec's own, and its block
// "repository" those of a NovaTrail repository, read from its spec/ submodule. A repository is
// checked only once its root holds docs-budgets.json, which names what differs from the block
// "repository" — `{}` when nothing does. Raising a limit is an edit of one of the two files, seen
// in review (R145).
//
// What a limit measures:
// - files — the whole file, by its path from the root;
// - rule — each rule of .claude/rules/, front matter and all;
// - entry — each entry of the decision log, from its `**R01. …**` to the next entry or heading;
//   entries names a limit of its own for one entry by its number: `R18` — a long entry keeps its
//   size until a task rewrites it, and the others keep theirs (R160);
// - section — the own text under each heading of a document cited by name, numbered or not, to the
//   next heading of any depth, and the text above its first heading; sections names a limit of its
//   own for a numbered one: `concepts 15`;
// - rows — each row of every table of the file named.
// The block, or a repository's file, may also hold "comments": true, which is no limit: it turns on
// the check of the numbers of decisions in comments of code, comments.mjs (R32).

import fs from "node:fs";
import path from "node:path";
import { entriesOf } from "./registers.mjs";
import { isRule } from "./rules.mjs";

const KB = 1024;
// The file of the work plan in run/ that a repository may lack: one with no open task outside an
// epic has no run/TASKS.md (R155). Every repository has the other files of run/ (R153), and a limit
// for one it lacks is an error.
const OPTIONAL = ["run/TASKS.md"];
const LIMITS = ["rule", "entry", "section"];
const SWITCHES = ["comments"];
const MAPS = ["files", "entries", "sections", "rows"];
const bytes = (n) => n.toLocaleString("en-US");

// The limits that hold at root, each { kb, from } with the file it came from, or null when the
// repository has no budgets of its own yet. `settings` is the profile's: { file, path, block, own }:
// file is budgets.json as errors name it, from root; path is where it is read, when that is not
// root/file — spec's in a repository, its submodule or a draft's spec; own, in a repository, is its
// docs-budgets.json.
export function readBudgets(root, settings, report) {
  if (!settings) return null;
  if (settings.own && !fs.existsSync(path.join(root, settings.own))) return null;
  const all = readJson(settings.path ?? path.join(root, settings.file), settings.file, report);
  if (all === undefined) return null;
  if (!isObject(all)) {
    report(settings.file, 0, "budgets: not a JSON object");
    return null;
  }
  for (const key of Object.keys(all)) {
    if (key !== "spec" && key !== "repository") report(settings.file, 0, `budgets: unknown block "${key}"`);
  }
  if (!isObject(all[settings.block])) {
    report(settings.file, 0, `budgets: no block "${settings.block}"`);
    return null;
  }
  const limits = { files: {}, entries: {}, sections: {}, rows: {}, comments: false };
  const take = (block, from) => {
    for (const [key, value] of Object.entries(block)) {
      if (LIMITS.includes(key)) {
        if (isKb(value)) limits[key] = { kb: value, from };
        else report(from, 0, `budgets: ${key} is ${JSON.stringify(value)}, not a whole number of KB above 0`);
      } else if (SWITCHES.includes(key)) {
        if (typeof value === "boolean") limits[key] = value;
        else report(from, 0, `budgets: ${key} is ${JSON.stringify(value)}, not true or false`);
      } else if (MAPS.includes(key) && isObject(value)) {
        for (const [name, kb] of Object.entries(value)) {
          if (isKb(kb)) limits[key][name] = { kb, from };
          else report(from, 0, `budgets: ${key} "${name}" is ${JSON.stringify(kb)}, not a whole number of KB above 0`);
        }
      } else if (MAPS.includes(key)) {
        report(from, 0, `budgets: ${key} is not an object of limits`);
      } else {
        report(from, 0, `budgets: unknown key "${key}"`);
      }
    }
  };
  take(all[settings.block], settings.file);
  if (settings.own) {
    const own = readJson(path.join(root, settings.own), settings.own, report);
    if (isObject(own)) take(own, settings.own);
    else if (own !== undefined) report(settings.own, 0, "budgets: not a JSON object");
  }
  return limits;
}

// Reports each thing over its limit; returns how many were measured.
export function checkBudgets(root, files, limits, profile, report) {
  let count = 0;
  const lines = new Map();
  const linesOf = (file) => {
    if (!lines.has(file)) lines.set(file, files.get(file).source.split("\n"));
    return lines.get(file);
  };
  const size = (file, from, to) => linesOf(file).slice(from - 1, to - 1).reduce((sum, line) => sum + Buffer.byteLength(line, "utf8") + 1, 0);
  const over = (file, line, what, measured, limit) => {
    count++;
    if (measured > limit.kb * KB) {
      report(file, line, `${what}${bytes(measured)} bytes, over its budget of ${limit.kb} KB (${bytes(limit.kb * KB)} bytes) — ${limit.from}`);
    }
  };

  // A limit for a file that is not there would hold nothing, and say nothing. In a repository, a
  // limit of spec's for run/TASKS.md that the repository does not have is none; for any other file,
  // or from its own docs-budgets.json, it is an error.
  const optional = (limit, file) => Boolean(profile.budgets?.own) && limit.from !== profile.budgets.own && OPTIONAL.includes(file);
  for (const [file, limit] of Object.entries(limits.files)) {
    const stat = fs.statSync(path.join(root, file), { throwIfNoEntry: false });
    if (stat?.isFile()) over(file, 1, "", stat.size, limit);
    else if (!optional(limit, file)) report(limit.from, 0, `budgets: files "${file}" names no file of the repository`);
  }
  if (limits.rule) {
    for (const file of files.keys()) {
      if (isRule(file)) over(file, 1, "a rule: ", fs.statSync(path.join(root, file)).size, limits.rule);
    }
  }

  const register = profile.registers.find((r) => r.prefix === "R");
  const log = register?.file;
  const doc = log && files.get(log);
  // An entry's own limit is named by its number, `R4` and `R04` alike.
  const own = new Map();
  for (const [key, limit] of Object.entries(limits.entries)) {
    const number = /^R\d+$/.test(key) ? Number(key.slice(1)) : key;
    if (own.has(number)) report(limit.from, 0, `budgets: entries "${own.get(number).key}" and "${key}" name one entry`);
    else own.set(number, { key, limit, found: false });
  }
  if (doc && (limits.entry || own.size)) {
    const entries = entriesOf(register, doc).map((e) => ({ number: Number(e.digits), name: `R${e.digits}`, line: e.line }));
    const bounds = [...entries.map((e) => e.line), ...doc.headings.map((h) => h.line)].sort((x, y) => x - y);
    for (const entry of entries) {
      const mine = own.get(entry.number);
      if (mine) mine.found = true;
      const limit = mine?.limit ?? limits.entry;
      if (!limit) continue;
      const end = bounds.find((line) => line > entry.line) ?? linesOf(log).length + 1;
      over(log, entry.line, `${entry.name}: `, size(log, entry.line, end), limit);
    }
  }
  // A limit of its own for an entry that is not in the log would hold nothing, and say nothing.
  for (const { key, limit, found } of own.values()) {
    if (!found) report(limit.from, 0, `budgets: entries "${key}" names no entry of the decision log`);
  }

  const named = new Set();
  for (const [name, file] of Object.entries(profile.documents)) {
    const document = files.get(file);
    if (!document) continue;
    const first = document.headings[0]?.line ?? linesOf(file).length + 1;
    if (limits.section && first > 1) over(file, 1, "above the first heading: ", size(file, 1, first), limits.section);
    document.headings.forEach((heading, index) => {
      const key = heading.number && `${name} ${heading.number}`;
      const limit = (key && limits.sections[key]) || limits.section;
      if (key && limits.sections[key]) named.add(key);
      if (!limit) return;
      const end = document.headings[index + 1]?.line ?? linesOf(file).length + 1;
      const what = heading.number ? `section ${heading.number}: ` : `under «${heading.text}»: `;
      over(file, heading.line, what, size(file, heading.line, end), limit);
    });
  }
  // A limit of its own for a section that is gone would hold nothing, and say nothing.
  for (const [key, limit] of Object.entries(limits.sections)) {
    if (!named.has(key)) report(limit.from, 0, `budgets: sections "${key}" names no numbered section of a document`);
  }

  for (const [file, limit] of Object.entries(limits.rows)) {
    const document = files.get(file);
    if (!document) {
      if (!optional(limit, file)) report(limit.from, 0, `budgets: rows "${file}" names no Markdown file of the repository`);
      continue;
    }
    for (const table of document.tables) {
      for (const row of table.rows) {
        over(file, row.line, `a row ${row.cells[0] ? `«${row.cells[0]}» ` : ""}— `, size(file, row.line, row.line + 1), limit);
      }
    }
  }
  return count;
}

// The JSON of a file, or undefined when it cannot be read or parsed, which `report` hears.
function readJson(where, file, report) {
  let text;
  try {
    text = fs.readFileSync(where, "utf8");
  } catch (error) {
    report(file, 0, error.code === "ENOENT" ? "budgets: the file is not there" : `budgets: the file cannot be read: ${error.code ?? error.message}`);
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    report(file, 0, `budgets: not JSON: ${error.message}`);
    return undefined;
  }
}

const isObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const isKb = (value) => Number.isInteger(value) && value > 0;
