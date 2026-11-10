// consent-age-line: a new version of the table of the age of digital consent starts a new line of
// spec's releases (R134), by the rule of part-line.mjs. In spec, `just release-version` passes what
// legal-line.mjs prints through it, with the commit, and it prints the same lines, or refuses:
//
//   ... | node tools/release/legal-line.mjs <commit> | node tools/release/consent-age-line.mjs <commit>
//
// The part is held from a release of FIRST_CONSENT_AGE_LINE on. Its version is the layout of
// consent-age/, the table's schema and the rules of section 5 (consent-age/README.md, section 2),
// and the release holds it to the shape alone, as it holds the legal texts':
// consent-age/schemas/consent-age.schema.json with its annotations taken out at every level, and the
// IDs of the rules of section 5, in their order, which readText reads as format-check does. Under
// the same version a change of either is refused — a new code of ISO 3166-1 among them; a new entry,
// a new country, the words of an entry, a change of a vector's schema, of a description, an example
// or a vector pass.

import { FIRST_CONSENT_AGE_LINE, consentAgeVersion } from "./files.mjs";
import { checkPartLine, checked as partChecked, runPartLine, shapeChange as partShapeChange, shapeChangedBetween as partShapeChangedBetween } from "./part-line.mjs";
import { isMain } from "../shared.mjs";

// What the rule holds the part's shape by: the table's schema and the text.
const SHAPED = { schema: "consent-age/schemas/consent-age.schema.json", readme: "consent-age/README.md" };

export const CONSENT_AGE = {
  file: "consent-age/VERSION",
  name: "the table of the age of digital consent",
  decision: "R134",
  firstLine: FIRST_CONSENT_AGE_LINE,
  parse: consentAgeVersion,
  below: (now, then) => Number(now) < Number(then),
  rule: "a change of the schema of the table of the age of digital consent or of the IDs of its rules is a new version",
};

// Whether the release of version, after previous, is held to the part's version at all.
export const checked = (outputs) => partChecked(CONSENT_AGE, outputs);

// R134's rule, for the release of version after previous, with the part's versions at each and
// what changed of its shape between them, as a phrase, or null.
export function checkConsentAgeLine({ version, previous, consentAgeNow, consentAgeThen, changed = null }) {
  checkPartLine(CONSENT_AGE, { version, previous, now: consentAgeNow, before: consentAgeThen, changed });
}

// What changed of the shape between two versions of the table's schema and of the text, each
// its text or null when the revision has none: a phrase for each that changed, joined, or null.
export const shapeChange = (texts) => partShapeChange(SHAPED, texts);

// What changed of the shape between previous and revision, in the repository at cwd.
export const shapeChangedBetween = (revision, previous, cwd = process.cwd()) => partShapeChangedBetween(SHAPED, revision, previous, cwd);

if (isMain(import.meta.url)) runPartLine(CONSENT_AGE, shapeChangedBetween);
