// part-line: a new version of a normative part with a version of its own starts a new line of
// spec's releases, as a new version of the module format does (R44): the admission table (R96;
// admission-line.mjs) and the deployment configuration (R85; deployment-line.mjs) hold their
// releases to it by this one rule, each with its part. release-version passes its lines through each
// part's script, with the commit, and the script prints the same lines, or refuses.
//
// Only a commit that gets a release is checked, and only against a release that carried the part,
// of the part's first line or a later one: the releases before it had none. Then the part's VERSION
// at the commit and at the release before it, previous=, are the same version, in the same line or
// a raised one; or another version, only a higher one and only in a raised line, so that a line
// holds one version of the part. What the part's text makes a new version, changed under the same
// version, is refused too. git runs in the repository the recipe runs it from.
//
// A part is { file, name, decision, firstLine, parse, below, rule }: the path of its VERSION; its
// name in a sentence, "the admission table"; the decision that sets the rule; the first line whose
// releases carry it; parse, the version of the text of its VERSION, or an error; below(now, then),
// whether a version is below another; and rule, what its text makes a new version, in a sentence.

import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { compareLines } from "./version.mjs";
import { lineOf, readOutputs } from "./format-line.mjs";
import { GIT } from "../shared.mjs";

// Whether the release of version, after previous, is held to the part's version at all.
export function checked(part, { version, previous }) {
  return Boolean(version) && Boolean(previous) && compareLines(lineOf(previous), part.firstLine) >= 0;
}

// The rule, for the release of version after previous, with the part's versions at each, now and
// then, and what changed between them that its text makes a new version, as a phrase — "the table
// changed" — or null.
export function checkPartLine(part, { version, previous, now, then, changed = null }) {
  if (now === then) {
    if (changed) throw new Error(`${changed} after ${previous}, and ${part.file} is still ${now}: ${part.rule}, in a new line (${part.decision})`);
    return;
  }
  // A version that went back is refused first, whatever the line: a raised line would not let it
  // pass.
  if (part.below(now, then)) {
    throw new Error(`${part.file} is ${now}, below ${then} at ${previous}: a version of ${part.name} never goes back, and undoing a change is a new version too (${part.decision})`);
  }
  const previousLine = lineOf(previous);
  if (compareLines(lineOf(version), previousLine) <= 0) {
    throw new Error(`${part.file} is ${now}, and at ${previous} it was ${then}: a new version of ${part.name} starts a new line, so raise RELEASE_LINE above ${previousLine} in the same change (${part.decision})`);
  }
}

// A file at a commit or tag, by git in the repository at cwd, or null when the revision has none.
export function fileAt(revision, file, cwd = process.cwd()) {
  const shown = spawnSync(GIT, ["show", `${revision}:${file}`], { cwd, encoding: "utf8" });
  return shown.status === 0 ? shown.stdout : null;
}

// The part's version at a commit or tag.
function versionAt(part, revision, cwd) {
  const text = fileAt(revision, part.file, cwd);
  if (text === null) throw new Error(`no ${part.file} at ${revision}`);
  return part.parse(text);
}

// release-version's lines, input, once the rule has held for the release of commit, in the
// repository at cwd, with changedBetween(commit, previous, cwd) what changed that the part's text
// makes a new version, or null. Throws when the rule does not hold.
export function partLineOutput(part, changedBetween, { input, commit = "", cwd = process.cwd() }) {
  const outputs = readOutputs(input);
  if (checked(part, outputs)) {
    if (!/^[0-9a-f]{40,64}$/.test(commit)) throw new Error(`the commit is '${commit}', not a SHA`);
    checkPartLine(part, { ...outputs, now: versionAt(part, commit, cwd), then: versionAt(part, outputs.previous, cwd), changed: changedBetween(commit, outputs.previous, cwd) });
  }
  return input;
}

// The script of a part: reads release-version's lines from stdin and prints them, or refuses.
// Takes nothing from its command line but the commit.
export function runPartLine(part, changedBetween) {
  try {
    process.stdout.write(partLineOutput(part, changedBetween, { input: fs.readFileSync(0, "utf8"), commit: process.argv[2] }));
  } catch (error) {
    console.error(`release-version: ${error.message}`);
    process.exitCode = 1;
  }
}
