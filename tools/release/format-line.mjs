// format-line: a new version of the module format starts a new line of spec's releases (R44),
// checked where the next version is worked out. In spec, `just release-version` passes what
// version.mjs prints through it, with the commit, and it prints the same lines, or refuses:
//
//   ... | node tools/release/version.mjs | node tools/release/format-line.mjs <commit>
//
// Only a commit that gets a release is checked, and only against a release that carried the
// format as files, of FIRST_FILES_LINE or a later line: a commit released already, or behind the
// newest release, gets none, and the releases of the lines before carried 0.1 as a draft. Then
// format/VERSION at the commit and at the release before it, previous=, follow R44:
//
//   - the same version, in the same line or a raised one;
//   - another version, only a higher one and only in a raised line, so that a line holds one
//     version of the format; a new major version of the format, only in a new major version of
//     spec;
//   - while the format is v0, spec stays 0.x.
//
// git runs in the repository the recipe runs it from. Takes nothing from its command line but
// the commit, which git resolves.

import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { FIRST_FILES_LINE, RELEASE_TAG, compareLines } from "./version.mjs";
import { formatVersion } from "./files.mjs";
import { GIT, isMain } from "../shared.mjs";

// What version.mjs prints, as name=value lines.
export function readOutputs(text) {
  return Object.fromEntries(
    text
      .split("\n")
      .filter((line) => line.includes("="))
      .map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1)]),
  );
}

// The line of a release tag: v0.3.2 is in 0.3.
export function lineOf(tag) {
  const match = RELEASE_TAG.exec(tag);
  if (!match) throw new Error(`${tag} is no release tag`);
  return `${match[1]}.${match[2]}`;
}

// Whether the release of version, after previous, is held to the format's version at all.
export function checked({ version, previous }) {
  return Boolean(version) && Boolean(previous) && compareLines(lineOf(previous), FIRST_FILES_LINE) >= 0;
}

// R44's rules, for the release of version after previous, with the format versions at each.
export function checkFormatLine({ version, previous, formatNow, formatThen }) {
  const line = lineOf(version);
  const previousLine = lineOf(previous);
  const now = formatNow.split(".").map(Number);
  const then = formatThen.split(".").map(Number);
  if (now[0] === 0 && Number(line.split(".")[0]) !== 0) {
    throw new Error(`the format is ${formatNow}, and spec stays 0.x while the format is v0: ${version} is no release of it (R44)`);
  }
  if (formatNow === formatThen) return;
  // A version that went back is refused first, whatever the line: a raised line would not let
  // it pass.
  if (now[0] < then[0] || (now[0] === then[0] && now[1] < then[1])) {
    throw new Error(`format/VERSION is ${formatNow}, below ${formatThen} at ${previous}: a version of the format never goes back, and undoing a change is a new version too (R44)`);
  }
  if (compareLines(line, previousLine) <= 0) {
    throw new Error(`format/VERSION is ${formatNow}, and at ${previous} it was ${formatThen}: a new version of the format starts a new line, so raise RELEASE_LINE above ${previousLine} in the same change (R44)`);
  }
  if (now[0] !== then[0] && Number(line.split(".")[0]) <= Number(previousLine.split(".")[0])) {
    throw new Error(`the format goes from ${formatThen} to ${formatNow}, a new major version, and ${version} keeps spec's major version: a major version of the format raises spec's (R44)`);
  }
}

// format/VERSION at a commit or tag, by git in the current directory.
function versionAt(revision) {
  const shown = spawnSync(GIT, ["show", `${revision}:format/VERSION`], { encoding: "utf8" });
  if (shown.status !== 0) throw new Error(`no format/VERSION at ${revision}: ${shown.stderr.trim()}`);
  return formatVersion(shown.stdout);
}

if (isMain(import.meta.url)) {
  try {
    const input = fs.readFileSync(0, "utf8");
    const outputs = readOutputs(input);
    if (checked(outputs)) {
      const commit = process.argv[2] ?? "";
      if (!/^[0-9a-f]{40,64}$/.test(commit)) throw new Error(`the commit is '${commit}', not a SHA`);
      checkFormatLine({ ...outputs, formatNow: versionAt(commit), formatThen: versionAt(outputs.previous) });
    }
    process.stdout.write(input);
  } catch (error) {
    console.error(`release-version: ${error.message}`);
    process.exitCode = 1;
  }
}
