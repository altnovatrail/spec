// A module laid out as a folder (format/README.md, sections 10 and 11; R46): the layout of its files,
// the rules of a whole module, and the format version its manifest names. format-check reads the
// whole-module examples and the test vectors laid out as a module this way, and checks the rules of
// the part module itself, as it checks the YAML rules.

import fs from "node:fs";
import path from "node:path";
import { byCodeUnits } from "../shared.mjs";
import { isKebabCase } from "./schemas.mjs";

// The rules of section 10, in its order.
export const MODULE_RULES = ["module.manifest", "module.layout"];

// The manifest: where it stands, its part, and the field that names the format version, whose place
// is the same in every version of the format (R44). The rule that refuses a version the reader does
// not read is a rule of the part manifest, and format-check tells its cases apart by the version
// they name.
export const MANIFEST = "manifest.yaml";
export const MANIFEST_PART = "manifest";
export const VERSION_FIELD = "module_format_version";
export const VERSION_RULE = "manifest.format-version";

// A path of the layout ends with <path> where it holds a file at any depth below it.
const ANY_PATH = "<path>";
const NO_PART = "—";
// A name in a path of the layout: what a file name of a module may be, with no "." first.
const NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

// The entries of a folder in the order of their names' code units, the same on every machine.
export function listFolder(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => byCodeUnits(a.name, b.name));
}

// The rows of the layout table, each { path, part, line } as written, checked: a path is names
// joined by "/", and its last may be <path>, but not its first; a part is a term in kebab-case, or —
// for a file no schema checks; no row overlaps another; and manifest.yaml holds the manifest.
// Returns { layout, problems }, each row of layout with { names, below } beside it, below true when
// it ends with <path>, and part null where the table says —.
export function readLayout(rows) {
  const layout = [];
  const problems = [];
  for (const { path: written, part, line } of rows) {
    const problem = pathProblem(written) ?? (part === NO_PART || isKebabCase(part) ? null : `${JSON.stringify(part)}: a part is a term in kebab-case, or ${NO_PART} for a file no schema checks`);
    if (problem) {
      problems.push({ line, message: problem });
      continue;
    }
    const names = written.split("/");
    const below = names.at(-1) === ANY_PATH;
    const row = { path: written, part: part === NO_PART ? null : part, line, names: below ? names.slice(0, -1) : names, below };
    const other = layout.find((earlier) => overlap(earlier, row));
    if (other) problems.push({ line, message: `the path ${written} overlaps ${other.path}, after line ${other.line}: one names a file or folder that the other names too` });
    else layout.push(row);
  }
  if (!layout.some((row) => row.path === MANIFEST && row.part === MANIFEST_PART)) {
    problems.push({ line: rows[0]?.line ?? 0, message: `the layout has no ${MANIFEST} for the part ${MANIFEST_PART}` });
  }
  return { layout, problems };
}

function pathProblem(written) {
  const names = written.split("/");
  if (names[0] === ANY_PATH) return `${written}: a path begins with a name, so that it holds a file of its own folder, not every file`;
  for (const [index, name] of names.entries()) {
    if (name === ANY_PATH) {
      if (index !== names.length - 1) return `${written}: ${ANY_PATH} stands only at the end of a path`;
    } else if (name.includes("<") || name.includes(">")) {
      return `${written}: format-check knows the placeholder ${ANY_PATH} only, and the task that brings another extends the check`;
    } else if (!NAME.test(name)) {
      return `${written}: a path is names joined by /, each of letters, digits, ., - and _, and none beginning with .`;
    }
  }
  return null;
}

// Whether the names of one row begin the other's: then a file stands at both, or one row names as a
// file the folder that the other has files in, and the layout cannot say which row a file is of.
function overlap(a, b) {
  const [shorter, longer] = a.names.length <= b.names.length ? [a, b] : [b, a];
  return shorter.names.every((name, index) => name === longer.names[index]);
}

// The files of a module's folder, by their paths from it with "/", and what breaks module.layout on
// the way: a symbolic link, or anything else that is neither a file nor a folder. A file or folder
// whose name begins with "." is not the module's, nor anything in such a folder; a folder with no
// files holds nothing. { files, breaches }, each breach { rule, file, message }.
export function listModule(folder) {
  const files = [];
  const breaches = [];
  const walk = (dir, prefix) => {
    for (const entry of listFolder(dir)) {
      if (entry.name.startsWith(".")) continue;
      const file = `${prefix}${entry.name}`;
      if (entry.isSymbolicLink()) breaches.push({ rule: "module.layout", file, message: "a symbolic link: a module holds files and folders only" });
      else if (entry.isDirectory()) walk(path.join(dir, entry.name), `${file}/`);
      else if (entry.isFile()) files.push(file);
      else breaches.push({ rule: "module.layout", file, message: "neither a file nor a folder: a module holds files and folders only" });
    }
  };
  walk(folder, "");
  return { files, breaches };
}

// Each file of a listing at its row of the layout, and what breaks the rules of a whole module:
// { rows, breaches }, rows a Map from each file to its row, or to undefined when it stands at none;
// each breach { rule, file, message }, file "" for the folder itself. Names compare exactly, letter
// case and all, as the folder lists them, and no two rows hold one file.
export function placeFiles(listing, layout) {
  const rows = new Map();
  const breaches = [...listing.breaches];
  if (!listing.files.includes(MANIFEST)) breaches.push({ rule: "module.manifest", file: "", message: `the folder holds no ${MANIFEST}` });
  for (const file of listing.files) {
    const names = file.split("/");
    const row = layout.find((candidate) => (candidate.below ? names.length > candidate.names.length : names.length === candidate.names.length) && candidate.names.every((name, index) => name === names[index]));
    rows.set(file, row);
    if (!row) breaches.push({ rule: "module.layout", file, message: "stands at no path of the layout of a module" });
  }
  return { rows, breaches };
}

// What is wrong with the format version a manifest names, or null. version is format/VERSION's. A
// case of manifest.format-version names one that a reader of version does not read, and every other
// manifest names version itself, so that it breaks nothing else and its schemas are those of
// format/. A version that is no MAJOR.MINOR string is the schema's to refuse.
export function versionProblem(manifest, version, rule) {
  const named = manifest?.[VERSION_FIELD];
  if (typeof named !== "string" || !/^[0-9]+\.[0-9]+$/.test(named) || version === null) return null;
  if (rule === VERSION_RULE) return reads(version, named) ? `names the format version ${named}, which a reader of ${version} reads: a case of ${VERSION_RULE} names one that it does not read` : null;
  return named === version ? null : `names the format version ${named}: it names ${version}, as format/VERSION has it, or it breaks ${VERSION_RULE}`;
}

// Whether a reader of format version `version` reads a module that names `named` (section 2): while
// the format is v0, only its current version; from v1 on, every minor version of the current major
// up to the reader's, and the previous major, though never v0.
function reads(version, named) {
  const [major, minor] = version.split(".").map(Number);
  const [namedMajor, namedMinor] = named.split(".").map(Number);
  if (major === 0) return namedMajor === 0 && namedMinor === minor;
  if (namedMajor === major) return namedMinor <= minor;
  return namedMajor === major - 1 && namedMajor >= 1;
}
