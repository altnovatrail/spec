// export-line: a new version of the format of the export starts a new line of spec's releases
// (R135), by the rule of part-line.mjs. In spec, `just release-version` passes what
// consent-age-line.mjs prints through it, with the commit, and it prints the same lines, or refuses:
//
//   ... | node tools/release/consent-age-line.mjs <commit> | node tools/release/export-line.mjs <commit>
//
// The part is held from a release of FIRST_EXPORT_LINE on. Its version is the layout of export/,
// the schemas of the files of an export and the rules of section 5 (export/README.md, section 2),
// and the release holds it to the shape alone, as it holds the deployment configuration's: the
// schema of each file of an export — the manifest, the account, a profile and a device's part — and
// their common definitions, with
// its annotations taken out at every level, and the IDs of the rules of section 5, in their order,
// which readText reads as format-check does. Under the same version a change of any is refused; a
// change of the vector's schema, of a description, an example or a vector passes.

import { FIRST_EXPORT_LINE, exportVersion } from "./files.mjs";
import { checkPartLine, checked as partChecked, fileAt, runPartLine, shapeChange as partShapeChange } from "./part-line.mjs";
import { git, isMain } from "../shared.mjs";

// What the rule holds the part's shape by: the schema of each file of an export, and the text.
export const SCHEMAS = ["common", "manifest", "account", "profile", "device"].map((term) => `export/schemas/${term}.schema.json`);
const README = "export/README.md";

export const EXPORT = {
  file: "export/VERSION",
  name: "the format of the export",
  decision: "R135",
  firstLine: FIRST_EXPORT_LINE,
  parse: exportVersion,
  below: (now, then) => Number(now) < Number(then),
  rule: "a change of the schemas of the files of an export or of the IDs of its rules is a new version",
};

// Whether the release of version, after previous, is held to the part's version at all.
export const checked = (outputs) => partChecked(EXPORT, outputs);

// R135's rule, for the release of version after previous, with the part's versions at each and
// what changed of its shape between them, as a phrase, or null.
export function checkExportLine({ version, previous, exportNow, exportThen, changed = null }) {
  checkPartLine(EXPORT, { version, previous, now: exportNow, before: exportThen, changed });
}

// What changed of the shape between two versions of the schemas and of the text: schemas maps each
// schema's path to { now, before }, each its text or null when the revision has none. A phrase for
// each that changed, joined, or null; the text is compared once, by part-line's rule.
export function shapeChange({ schemas, readmeNow, readmeThen }) {
  const changes = SCHEMAS.map((schema, index) => {
    const { now, before } = schemas[schema];
    const text = index === 0 ? { readmeNow, readmeThen } : { readmeNow: "", readmeThen: "" };
    return partShapeChange({ schema, readme: README }, { schemaNow: now, schemaThen: before, ...text });
  }).filter(Boolean);
  return changes.length ? changes.join(", and ") : null;
}

// The schemas of a file of an export at a revision: every schema of export/schemas/ but the vector's.
export function schemasAt(revision, cwd = process.cwd()) {
  return git(cwd, ["ls-tree", "--name-only", revision, "--", "export/schemas/"]).split("\n").filter((file) => file.endsWith(".schema.json") && !file.endsWith("/reading-vector.schema.json"));
}

// What changed of the shape between previous and revision, in the repository at cwd: the set of the
// schemas of a file too, since a new kind of file is a new version (export/README.md, section 2).
export function shapeChangedBetween(revision, previous, cwd = process.cwd()) {
  const at = (revisionOf, file) => fileAt(revisionOf, file, cwd);
  const schemas = Object.fromEntries(SCHEMAS.map((schema) => [schema, { now: at(revision, schema), before: at(previous, schema) }]));
  const change = shapeChange({ schemas, readmeNow: at(revision, README), readmeThen: at(previous, README) });
  const earlier = schemasAt(previous, cwd);
  const set = earlier.length && JSON.stringify(schemasAt(revision, cwd)) !== JSON.stringify(earlier) ? "the schemas of export/schemas changed" : null;
  return [change, set].filter(Boolean).join(", and ") || null;
}

if (isMain(import.meta.url)) runPartLine(EXPORT, shapeChangedBetween);
