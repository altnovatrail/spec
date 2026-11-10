// deployment-line: a new version of the deployment configuration starts a new line of spec's
// releases (R85), by the rule of part-line.mjs. In spec, `just release-version` passes what
// admission-line.mjs prints through it, with the commit, and it prints the same lines, or refuses:
//
//   ... | node tools/release/admission-line.mjs <commit> | node tools/release/deployment-line.mjs <commit>
//
// The configuration is held from a release of FIRST_DEPLOYMENT_LINE on. Every change of the file's
// shape is a new version (deployment/README.md, section 2), and the release holds it to the shape
// alone: deployment/schemas/deployment.schema.json with its annotations taken out at every level,
// and the IDs of the rules of section 5, in their order, which readText reads as format-check
// does. Under the same version a change of either is refused; one of reading-vector.schema.json,
// of a description, an example or a vector passes. A rule is held by its ID, so a rule that comes
// to allow or refuse another value takes a new ID.

import { FIRST_DEPLOYMENT_LINE, deploymentVersion } from "./files.mjs";
import { checkPartLine, checked as partChecked, runPartLine, shapeChange as partShapeChange, shapeChangedBetween as partShapeChangedBetween } from "./part-line.mjs";
import { isMain } from "../shared.mjs";

// The shape of a schema and the IDs of the rules are part-line.mjs's, which legal-line.mjs reads
// them by too.
export { ruleIdsOf, shapeOf } from "./part-line.mjs";

// What the rule holds the configuration's shape by: the file's schema and the text.
const SHAPED = { schema: "deployment/schemas/deployment.schema.json", readme: "deployment/README.md" };

export const DEPLOYMENT = {
  file: "deployment/VERSION",
  name: "the deployment configuration",
  decision: "R85",
  firstLine: FIRST_DEPLOYMENT_LINE,
  parse: deploymentVersion,
  below: (now, then) => Number(now) < Number(then),
  rule: "every change of the deployment configuration's shape is a new version",
};

// Whether the release of version, after previous, is held to the configuration's version at all.
export const checked = (outputs) => partChecked(DEPLOYMENT, outputs);

// R85's rule, for the release of version after previous, with the configuration's versions at
// each and what changed of its shape between them, as a phrase, or null.
export function checkDeploymentLine({ version, previous, deploymentNow, deploymentThen, changed = null }) {
  checkPartLine(DEPLOYMENT, { version, previous, now: deploymentNow, before: deploymentThen, changed });
}

// What changed of the shape between two versions of the file's schema and of the text, each its
// text or null when the revision has none: a phrase for each that changed, joined, or null.
export const shapeChange = (texts) => partShapeChange(SHAPED, texts);

// What changed of the shape between previous and revision, in the repository at cwd.
export const shapeChangedBetween = (revision, previous, cwd = process.cwd()) => partShapeChangedBetween(SHAPED, revision, previous, cwd);

if (isMain(import.meta.url)) runPartLine(DEPLOYMENT, shapeChangedBetween);
