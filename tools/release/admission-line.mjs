// admission-line: a new version of the admission table starts a new line of spec's releases (R96),
// by the rule of part-line.mjs. In spec, `just release-version` passes what contracts-line.mjs
// prints through it, with the commit, and it prints the same lines, or refuses:
//
//   ... | node tools/release/contracts-line.mjs <commit> | node tools/release/admission-line.mjs <commit>
//
// The table is held from a release of FIRST_ADMISSION_LINE on. Any change of
// admission/admission-table.json is a new version (admission/README.md, section 2), so the same
// version with another table is refused too. The table's major version is no part of spec's: R44
// ties that to the format alone.

import { spawnSync } from "node:child_process";
import { FIRST_ADMISSION_LINE, formatVersion } from "./files.mjs";
import { checkPartLine, checked as partChecked, runPartLine } from "./part-line.mjs";
import { GIT, isMain } from "../shared.mjs";

const FILE = "admission/VERSION";
const TABLE = "admission/admission-table.json";

export const ADMISSION = {
  file: FILE,
  name: "the admission table",
  decision: "R96",
  firstLine: FIRST_ADMISSION_LINE,
  parse: (text) => formatVersion(text, FILE),
  below: (now, then) => {
    const [a, b] = [now, then].map((version) => version.split(".").map(Number));
    return a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);
  },
  rule: "any change of the admission table is a new version",
};

// Whether the release of version, after previous, is held to the table's version at all.
export const checked = (outputs) => partChecked(ADMISSION, outputs);

// R96's rule, for the release of version after previous, with the table's versions at each and
// whether admission-table.json changed between them.
export function checkAdmissionLine({ version, previous, admissionNow, admissionThen, tableChanged = false }) {
  checkPartLine(ADMISSION, { version, previous, now: admissionNow, then: admissionThen, changed: tableChanged ? `${TABLE} changed` : null });
}

// Whether admission-table.json is another file at revision than at previous, in the repository at
// cwd: by its blob, which git names by its bytes. The phrase that says so, or null.
export function tableChangedBetween(revision, previous, cwd = process.cwd()) {
  const blob = (at) => spawnSync(GIT, ["rev-parse", "--verify", "--quiet", `${at}:${TABLE}`], { cwd, encoding: "utf8" }).stdout.trim();
  return blob(revision) !== blob(previous) ? `${TABLE} changed` : null;
}

if (isMain(import.meta.url)) runPartLine(ADMISSION, tableChangedBetween);
