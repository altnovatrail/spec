// legal-line: a new version of the legal texts starts a new line of spec's releases (R130), by the
// rule of part-line.mjs. In spec, `just release-version` passes what deployment-line.mjs prints
// through it, with the commit, and it prints the same lines, or refuses:
//
//   ... | node tools/release/deployment-line.mjs <commit> | node tools/release/legal-line.mjs <commit>
//
// The part is held from a release of FIRST_LEGAL_LINE on. Its version is the layout of legal/, the
// passport's schema and the rules of section 5 (legal/README.md, section 2), and the release holds
// it to the shape alone, as it holds the deployment configuration's: legal/schemas/legal.schema.json
// with its annotations taken out at every level, and the IDs of the rules of section 5, in their
// order, which readText reads as format-check does. Under the same version a change of either is
// refused; a new text, a new version of a text, the words of a draft, a change of
// reading-vector.schema.json, of a description, an example or a vector pass.

import { FIRST_LEGAL_LINE, legalVersion } from "./files.mjs";
import { checkPartLine, checked as partChecked, runPartLine, shapeChange as partShapeChange, shapeChangedBetween as partShapeChangedBetween } from "./part-line.mjs";
import { isMain } from "../shared.mjs";

// What the rule holds the part's shape by: the passport's schema and the text.
const SHAPED = { schema: "legal/schemas/legal.schema.json", readme: "legal/README.md" };

export const LEGAL = {
  file: "legal/VERSION",
  name: "the legal texts",
  decision: "R130",
  firstLine: FIRST_LEGAL_LINE,
  parse: legalVersion,
  below: (now, then) => Number(now) < Number(then),
  rule: "a change of the legal texts' passport schema or of the IDs of their rules is a new version",
};

// Whether the release of version, after previous, is held to the part's version at all.
export const checked = (outputs) => partChecked(LEGAL, outputs);

// R130's rule, for the release of version after previous, with the part's versions at each and
// what changed of its shape between them, as a phrase, or null.
export function checkLegalLine({ version, previous, legalNow, legalThen, changed = null }) {
  checkPartLine(LEGAL, { version, previous, now: legalNow, before: legalThen, changed });
}

// What changed of the shape between two versions of the passport's schema and of the text, each
// its text or null when the revision has none: a phrase for each that changed, joined, or null.
export const shapeChange = (texts) => partShapeChange(SHAPED, texts);

// What changed of the shape between previous and revision, in the repository at cwd.
export const shapeChangedBetween = (revision, previous, cwd = process.cwd()) => partShapeChangedBetween(SHAPED, revision, previous, cwd);

if (isMain(import.meta.url)) runPartLine(LEGAL, shapeChangedBetween);
