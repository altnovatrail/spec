// admission-line: a new version of the admission table starts a new line of spec's releases (R96),
// as a new version of the module format does (R44), checked where the next version is worked out.
// In spec, `just release-version` passes what contracts-line.mjs prints through it, with the
// commit, and it prints the same lines, or refuses:
//
//   ... | node tools/release/contracts-line.mjs <commit> | node tools/release/admission-line.mjs <commit>
//
// Only a commit that gets a release is checked, and only against a release that carried the table,
// of FIRST_ADMISSION_LINE or a later line: the releases before it had none. Then admission/VERSION
// at the commit and at the release before it, previous=, are the same version, in the same line or
// a raised one; or another version, only a higher one and only in a raised line, so that a line
// holds one version of the table. Any change of admission/admission-table.json is a new version
// (admission/README.md, section 2), so the same version with another table is refused too. The
// table's major version is no part of spec's: R44 ties that to the format alone. git runs in the
// repository the recipe runs it from. Takes nothing from its command line but the commit.

import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { compareLines } from "./version.mjs";
import { FIRST_ADMISSION_LINE, formatVersion } from "./files.mjs";
import { lineOf, readOutputs } from "./format-line.mjs";
import { GIT, isMain } from "../shared.mjs";

const FILE = "admission/VERSION";
const TABLE = "admission/admission-table.json";

// Whether the release of version, after previous, is held to the table's version at all.
export function checked({ version, previous }) {
  return Boolean(version) && Boolean(previous) && compareLines(lineOf(previous), FIRST_ADMISSION_LINE) >= 0;
}

// R96's rule, for the release of version after previous, with the table's versions at each and
// whether admission-table.json changed between them.
export function checkAdmissionLine({ version, previous, admissionNow, admissionThen, tableChanged = false }) {
  if (admissionNow === admissionThen) {
    if (tableChanged) throw new Error(`${TABLE} changed after ${previous}, and ${FILE} is still ${admissionNow}: any change of the admission table is a new version, in a new line (R96)`);
    return;
  }
  const now = admissionNow.split(".").map(Number);
  const then = admissionThen.split(".").map(Number);
  // A version that went back is refused first, whatever the line: a raised line would not let it
  // pass.
  if (now[0] < then[0] || (now[0] === then[0] && now[1] < then[1])) {
    throw new Error(`${FILE} is ${admissionNow}, below ${admissionThen} at ${previous}: a version of the admission table never goes back, and undoing a change is a new version too (R96)`);
  }
  const previousLine = lineOf(previous);
  if (compareLines(lineOf(version), previousLine) <= 0) {
    throw new Error(`${FILE} is ${admissionNow}, and at ${previous} it was ${admissionThen}: a new version of the admission table starts a new line, so raise RELEASE_LINE above ${previousLine} in the same change (R96)`);
  }
}

// Whether admission-table.json is another file at revision than at previous: by its blob, which
// git names by its bytes.
function tableChangedBetween(revision, previous) {
  const blob = (at) => spawnSync(GIT, ["rev-parse", "--verify", "--quiet", `${at}:${TABLE}`], { encoding: "utf8" }).stdout.trim();
  return blob(revision) !== blob(previous);
}

// admission/VERSION at a commit or tag, by git in the current directory.
function versionAt(revision) {
  const shown = spawnSync(GIT, ["show", `${revision}:${FILE}`], { encoding: "utf8" });
  if (shown.status !== 0) throw new Error(`no ${FILE} at ${revision}: ${shown.stderr.trim()}`);
  return formatVersion(shown.stdout, FILE);
}

if (isMain(import.meta.url)) {
  try {
    const input = fs.readFileSync(0, "utf8");
    const outputs = readOutputs(input);
    if (checked(outputs)) {
      const commit = process.argv[2] ?? "";
      if (!/^[0-9a-f]{40,64}$/.test(commit)) throw new Error(`the commit is '${commit}', not a SHA`);
      checkAdmissionLine({ ...outputs, admissionNow: versionAt(commit), admissionThen: versionAt(outputs.previous), tableChanged: tableChangedBetween(commit, outputs.previous) });
    }
    process.stdout.write(input);
  } catch (error) {
    console.error(`release-version: ${error.message}`);
    process.exitCode = 1;
  }
}
