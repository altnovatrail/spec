// The reading of the legal texts, section 5 of legal/README.md: the passport's schema first, then
// the rules in the order of the text's table. A second implementation, beside api's and the build
// of the samples page, which computes what each vector of reading gives, and by which
// legal-check reads spec's own legal/ and legal-check-dir an operator's folder.
//
// A part is { passport, files }: the passport as YAML reads it, and the files under texts/, by
// their paths from the part, texts/<id>/<n>.md, each its text or its bytes. legal-check reads a
// file as its bytes, so that a byte order mark is a byte too; a vector writes it as text, its bytes
// those of UTF-8.

import { isDeepStrictEqual } from "node:util";
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { gfm } from "micromark-extension-gfm";
import { byCodeUnits } from "../shared.mjs";
import { namesOf } from "../parts.mjs";

export { namesOf };

export const SCHEMA = "schema";
export const FILES = "legal.files";
export const VERSIONS = "legal.versions";
export const SET_TEXTS = "legal.set-texts";
export const MARKDOWN = "legal.markdown";
export const IN_FORCE_UNCHANGED = "legal.in-force-unchanged";
export const RULES = [FILES, VERSIONS, SET_TEXTS, MARKDOWN, IN_FORCE_UNCHANGED];

const IN_FORCE = "in_force";
// Where the notice and the form of a set stand (section 4).
const SET_PLACES = [
  ["notice", "samples_page"],
  ["form", "form"],
];
// What a version of a text never holds: HTML, an image, and a link of any form — a literal
// autolink of GFM and an autolink in <…> among them, which mdast gives as links (section 4).
const FORBIDDEN = new Set(["html", "image", "imageReference", "link", "linkReference", "definition"]);

// What a reader gives a part, with validate the compiled schema of the passport and previous the
// part of the release before, or null when that release has no legal/: { current: { texts, sets } }
// when it accepts the part, each the current version of every text or set that has one, by its ID;
// or { refused_by, names } with the names in the order of code units.
export function readingOf(validate, part, previous = null) {
  if (!validate(part.passport)) return { refused_by: SCHEMA, names: namesOf(validate.errors) };
  for (const [rule, breaches] of [
    [FILES, () => fileBreaches(part)],
    [VERSIONS, () => versionBreaches(part.passport)],
    [SET_TEXTS, () => setTextBreaches(part.passport)],
    [MARKDOWN, () => markdownBreaches(part)],
    [IN_FORCE_UNCHANGED, () => (previous ? changedBreaches(part, previous) : [])],
  ]) {
    const names = breaches();
    if (names.length) return { refused_by: rule, names: [...new Set(names)].sort(byCodeUnits) };
  }
  return { current: { texts: currentOf(part.passport.texts), sets: currentOf(part.passport.sets) } };
}

// The file of a version of a text, by its path from the part.
export function fileOf(id, version) {
  return `texts/${id}/${version}.md`;
}

// legal.files: every version has its file, and every file is a version's.
function fileBreaches({ passport, files }) {
  const wanted = new Set();
  for (const [id, text] of Object.entries(passport.texts)) for (const { version } of text.versions) wanted.add(fileOf(id, version));
  return [...[...wanted].filter((file) => !Object.hasOwn(files, file)), ...Object.keys(files).filter((file) => !wanted.has(file))];
}

// legal.versions: 1, 2, 3… in order, every draft after every version in force, and the dates of the
// versions in force never going back.
function versionBreaches(passport) {
  const names = [];
  for (const [kind, map] of [
    ["texts", passport.texts],
    ["sets", passport.sets],
  ]) {
    for (const [id, { versions }] of Object.entries(map)) {
      let draft = false;
      let since = "";
      const broken = versions.some(({ version, status, in_force_since: date }, index) => {
        if (version !== index + 1) return true;
        if (status !== IN_FORCE) {
          draft = true;
          return false;
        }
        // YYYY-MM-DD compares as text.
        const back = draft || date < since;
        since = date;
        return back;
      });
      if (broken) names.push(`${kind}.${id}`);
    }
  }
  return names;
}

// legal.set-texts: a version of a set names versions that exist, of texts of the places of its
// notice and its form, and a version in force names versions in force.
function setTextBreaches(passport) {
  const names = [];
  for (const [id, { versions }] of Object.entries(passport.sets)) {
    const broken = versions.some((set) =>
      SET_PLACES.some(([field, place]) => {
        const { text: textId, version } = set[field];
        const text = Object.hasOwn(passport.texts, textId) ? passport.texts[textId] : null;
        const named = text?.versions.find((each) => each.version === version);
        return !named || text.place !== place || (set.status === IN_FORCE && named.status !== IN_FORCE);
      }),
    );
    if (broken) names.push(`sets.${id}`);
  }
  return names;
}

// legal.markdown: each version begins with a heading of the first level and holds no HTML, no image
// and no link. legal.files has held, so every version has its file.
function markdownBreaches({ passport, files }) {
  const names = [];
  for (const [id, text] of Object.entries(passport.texts)) {
    for (const { version } of text.versions) {
      const file = fileOf(id, version);
      if (markdownProblem(files[file])) names.push(file);
    }
  }
  return names;
}

// Whether two files are the same, byte for byte: text is compared as its bytes of UTF-8, and a
// file that is not there is none.
export function sameBytes(a, b) {
  if (a === undefined || b === undefined) return a === b;
  const bytes = (file) => (typeof file === "string" ? Buffer.from(file, "utf8") : Buffer.from(file.buffer, file.byteOffset, file.byteLength));
  return bytes(a).equals(bytes(b));
}

// Why a text, as text or as its bytes of UTF-8, breaks legal.markdown, in a phrase, or null when it
// does not. A byte order mark is kept, as micromark reads one.
export function markdownProblem(source) {
  const text = typeof source === "string" ? source : new TextDecoder("utf-8", { ignoreBOM: true }).decode(source);
  const tree = fromMarkdown(text, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] });
  const first = tree.children[0];
  if (first?.type !== "heading" || first.depth !== 1) return "it begins with no heading of the first level";
  const found = [];
  const visit = (node) => {
    if (FORBIDDEN.has(node.type)) found.push(`${node.type} at line ${node.position.start.line}`);
    for (const child of node.children ?? []) visit(child);
  };
  visit(tree);
  return found.length ? `it holds ${found.join(", ")}` : null;
}

// legal.in-force-unchanged: every version in force in the release before is here, its entry the
// same — and, for a text, its place, where the version is shown — and its file the same, byte for
// byte. A text or a set whose entry changed or is gone is named by its ID; a file that changed, by
// its path.
function changedBreaches(part, previous) {
  const names = [];
  const before = previous.passport;
  for (const [kind, map] of [
    ["texts", before?.texts],
    ["sets", before?.sets],
  ]) {
    for (const [id, then] of Object.entries(isObject(map) ? map : {})) {
      const now = Object.hasOwn(part.passport[kind], id) ? part.passport[kind][id] : null;
      for (const entry of Array.isArray(then?.versions) ? then.versions : []) {
        if (entry?.status !== IN_FORCE) continue;
        const kept = now?.versions.find((each) => each.version === entry.version);
        if (!kept || !isDeepStrictEqual(kept, entry) || (kind === "texts" && now.place !== then.place)) names.push(`${kind}.${id}`);
        if (kind !== "texts" || !kept) continue;
        const file = fileOf(id, entry.version);
        if (!sameBytes(part.files[file], previous.files?.[file])) names.push(file);
      }
    }
  }
  return names;
}

// The current version of each text or set: its version in force with the highest number, by ID in
// the order of code units; one with no version in force has none.
function currentOf(map) {
  const current = {};
  for (const id of Object.keys(map).sort(byCodeUnits)) {
    const numbers = map[id].versions.filter(({ status }) => status === IN_FORCE).map(({ version }) => version);
    if (numbers.length) current[id] = Math.max(...numbers);
  }
  return current;
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
