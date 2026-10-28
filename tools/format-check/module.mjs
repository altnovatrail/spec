// A module laid out as a folder (format/README.md, sections 10 and 11; R46, R51): the layout of its
// files, the rules of a whole module, and the format version its manifest names. format-check reads
// the whole-module examples and the test vectors laid out as a module this way, and checks the rules
// of the part module itself, as it checks the YAML rules.

import fs from "node:fs";
import path from "node:path";
import { byCodeUnits } from "../shared.mjs";
import { isKebabCase } from "./schemas.mjs";
import { firstInvalidByte } from "./yaml.mjs";

// The rules of section 10, in its order.
export const MODULE_RULES = ["module.manifest", "module.layout", "module.file-ids", "module.media", "module.license", "module.plain-text"];

// The manifest: where it stands, its part, and the field that names the format version, whose place
// is the same in every version of the format (R44). The rule that refuses a version the reader does
// not read is a rule of the part manifest, and format-check tells its cases apart by the version
// they name.
export const MANIFEST = "manifest.yaml";
export const MANIFEST_PART = "manifest";
export const VERSION_FIELD = "module_format_version";
export const VERSION_RULE = "manifest.format-version";
// The text of the license that the manifest names, which every module holds, and the notices that
// the licenses of its content require, which a module holds when they require any: plain text, which
// goes into the device part of the package byte for byte (section 25).
export const LICENSE = "LICENSE";
export const NOTICE = "NOTICE";

// A path of the layout ends with <path> where it holds a file at any depth below it, and its last
// name may be <id> and an extension, <id>.yaml, where it holds one file for each entry of a part,
// named by the entry's local ID.
const ANY_PATH = "<path>";
const ID = "<id>";
const ID_EXTENSION = /^\.[a-z0-9]+$/;
const NO_PART = "—";
// A name in a path of the layout: what a file name of a module may be, with no "." first.
const NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
// The folder of the module's media files, which module.media checks.
const MEDIA = "media";

// The entries of a folder in the order of their names' code units, the same on every machine.
export function listFolder(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => byCodeUnits(a.name, b.name));
}

// The rows of the layout table, each { path, part, line } as written, checked: a path is names
// joined by "/", its last may be <path>, but not its first, or <id> and an extension; a part is a
// term in kebab-case, or — for a file no schema checks; no row overlaps another; and manifest.yaml
// holds the manifest. Returns { layout, problems }, each row of layout with { names, below, id }
// beside it: names the literal names before a placeholder, below true when the path ends with
// <path>, id the extension after <id> when its last name is one, else null; and part null where the
// table says —.
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
    const last = names.at(-1);
    const below = last === ANY_PATH;
    const id = last.startsWith(ID) ? last.slice(ID.length) : null;
    const row = { path: written, part: part === NO_PART ? null : part, line, names: below || id !== null ? names.slice(0, -1) : names, below, id };
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
  if (names[0] === ANY_PATH || names[0].startsWith(ID)) return `${written}: a path begins with a name, so that it holds a file of its own folder, not every file`;
  for (const [index, name] of names.entries()) {
    const isLast = index === names.length - 1;
    if (name === ANY_PATH) {
      if (!isLast) return `${written}: ${ANY_PATH} stands only at the end of a path`;
    } else if (name.startsWith(ID) && !name.slice(ID.length).includes("<")) {
      if (!isLast) return `${written}: ${ID} stands only in the last name of a path`;
      if (!ID_EXTENSION.test(name.slice(ID.length))) return `${written}: ${ID} is followed by an extension, as in tasks/${ID}.yaml`;
    } else if (name.includes("<") || name.includes(">")) {
      return `${written}: format-check knows the placeholders ${ANY_PATH}, at the end of a path, and ${ID}, before the extension of its last name, only; the task that brings another extends the check`;
    } else if (!NAME.test(name)) {
      return `${written}: a path is names joined by /, each of letters, digits, ., - and _, and none beginning with .`;
    }
  }
  return null;
}

// Whether a file could stand at both rows, or one row names as a file the folder that the other has
// files in, so that the layout cannot say which row a file is of. A placeholder <id> and its
// extension meet every name with that extension.
function overlap(a, b) {
  const [shorter, longer] = a.names.length <= b.names.length ? [a, b] : [b, a];
  if (!shorter.names.every((name, index) => name === longer.names[index])) return false;
  if (shorter.id === null) return true;
  // The shorter's files stand right in its folder, named <id> and its extension. A deeper row has a
  // file or folder there by its next name; a row of the same folder, by its last name: <path>, a
  // literal name, or <id> and an extension.
  if (longer.names.length > shorter.names.length) return longer.names[shorter.names.length].endsWith(shorter.id);
  return longer.below || longer.id === null || longer.id === shorter.id;
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
// case and all, as the folder lists them, and no two rows hold one file. A name at <id> is a local
// ID, by isLocalId(name) — common's local_id —, and before its extension; with isLocalId null, any
// name is.
export function placeFiles(listing, layout, { isLocalId }) {
  const rows = new Map();
  const breaches = [...listing.breaches];
  if (!listing.files.includes(MANIFEST)) breaches.push({ rule: "module.manifest", file: "", message: `the folder holds no ${MANIFEST}` });
  for (const file of listing.files) {
    const names = file.split("/");
    const row = layout.find((candidate) => standsAt(names, candidate, isLocalId));
    rows.set(file, row);
    if (!row) breaches.push({ rule: "module.layout", file, message: "stands at no path of the layout of a module" });
  }
  return { rows, breaches };
}

function standsAt(names, row, isLocalId) {
  if (!row.names.every((name, index) => name === names[index])) return false;
  if (row.below) return names.length > row.names.length;
  if (row.id === null) return names.length === row.names.length;
  const last = names.at(-1);
  return names.length === row.names.length + 1 && last.endsWith(row.id) && (!isLocalId || isLocalId(last.slice(0, -row.id.length)));
}

// The local ID that the name of a file at a row with <id> holds: its name without the extension.
export function idOf(file, row) {
  return file.split("/").at(-1).slice(0, -row.id.length);
}

// The file signatures of the media formats, by extension (format/README.md, section 10; WHATWG MIME
// Sniffing, 6.1 and 6.2): bytes at their offsets, and for MP3 an ID3 tag or the header of an MPEG
// audio frame of layer III.
const SIGNATURES = {
  png: (bytes) => startsWith(bytes, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  jpg: (bytes) => startsWith(bytes, 0, [0xff, 0xd8, 0xff]),
  webp: (bytes) => startsWith(bytes, 0, [...Buffer.from("RIFF")]) && startsWith(bytes, 8, [...Buffer.from("WEBPVP")]),
  mp3: (bytes) => startsWith(bytes, 0, [...Buffer.from("ID3")]) || isMp3Header(bytes),
};
const FORMATS = { png: "PNG", jpg: "JPEG", webp: "WebP", mp3: "MP3" };

function startsWith(bytes, offset, expected) {
  return bytes.length >= offset + expected.length && expected.every((byte, index) => bytes[offset + index] === byte);
}

// The four bytes of a frame header: the sync of eleven set bits, layer III, and a bitrate index and
// a sampling rate index that are not the reserved ones.
function isMp3Header(bytes) {
  return bytes.length >= 4 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0 && (bytes[1] & 0x06) === 0x02 && (bytes[2] & 0xf0) !== 0xf0 && (bytes[2] & 0x0c) !== 0x0c;
}

// What breaks module.media in the files of media/ of a module's folder: a path from media/ of
// another form than media_path, by isMediaPath(path), or a file that does not begin with the
// signature of the format its extension names. An extension media_path takes and SIGNATURES does not
// know is a breach too, until format-check knows its signature. Each breach { rule, file, message };
// none when isMediaPath is null, as the rule then goes unchecked.
export function mediaBreaches(folder, files, { isMediaPath }) {
  const breaches = [];
  if (!isMediaPath) return breaches;
  for (const file of files) {
    const names = file.split("/");
    if (names[0] !== MEDIA || names.length < 2) continue;
    const media = names.slice(1).join("/");
    if (!isMediaPath(media)) {
      breaches.push({ rule: "module.media", file, message: `${media} is no media path of common.schema.json: names in kebab-case, joined by /, and the extension of a media format` });
      continue;
    }
    const extension = media.slice(media.lastIndexOf(".") + 1);
    if (!Object.hasOwn(SIGNATURES, extension)) {
      breaches.push({ rule: "module.media", file, message: `format-check knows no signature of .${extension}: the task that brings the format extends the check` });
      continue;
    }
    const bytes = fs.readFileSync(path.join(folder, file));
    if (!SIGNATURES[extension](bytes)) breaches.push({ rule: "module.media", file, message: `does not begin with the signature of ${FORMATS[extension]}, as its extension .${extension} says it is` });
  }
  return breaches;
}

// What breaks module.license and module.plain-text in a module's folder: LICENSE missing or empty, and
// LICENSE or NOTICE in another encoding than UTF-8, with a byte order mark, or with a carriage return,
// which a checkout that turns line ends into CRLF would add and so change the package's digest. files
// are the module's files by their paths from its folder. Each breach { rule, file, message }.
export function textBreaches(folder, files) {
  const breaches = [];
  if (!files.includes(LICENSE)) breaches.push({ rule: "module.license", file: "", message: `the folder holds no ${LICENSE}: the text of the license that the manifest names` });
  for (const file of [LICENSE, NOTICE].filter((name) => files.includes(name))) {
    const bytes = fs.readFileSync(path.join(folder, file));
    if (file === LICENSE && bytes.length === 0) breaches.push({ rule: "module.license", file, message: "is empty: it holds the text of the license that the manifest names" });
    const problem = plainTextProblem(bytes);
    if (problem) breaches.push({ rule: "module.plain-text", file, message: problem });
  }
  return breaches;
}

// What keeps bytes from being plain text of the format, or null: UTF-8, with no byte order mark, and
// every line ended by LF alone.
function plainTextProblem(bytes) {
  const invalid = firstInvalidByte(bytes);
  if (invalid >= 0) return `byte ${invalid + 1} is not UTF-8`;
  if (startsWith(bytes, 0, [0xef, 0xbb, 0xbf])) return "begins with a byte order mark";
  const at = bytes.indexOf(0x0d);
  return at === -1 ? null : `holds a carriage return at byte ${at + 1}: a line ends with LF alone`;
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
