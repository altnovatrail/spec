// release-files: the files spec's release of a commit carries, by the line it is numbered in (R64).
//
//   git show <commit>:format/VERSION | node tools/release/files.mjs <line> [<tag>]
//
// From FIRST_FILES_LINE on, a release carries each normative part that has a version of its own
// as one file, <part>-<version>.tar.gz, for each version of it the platform reads (R44): while
// the format is v0 that is the format alone, at the version format/VERSION names at the commit.
// From FIRST_NPM_LINE on, it carries the npm package @altnovatrail/spec as well, the archive npm
// pack names for the release's version, altnovatrail-spec-<MAJOR.MINOR.PATCH>.tgz (R73): tag is
// the release's, in the line. A release of an earlier line carries no files, and its stdin, which
// may be empty, is not read for a version. Prints a line for each file: its name, and the path in
// the repository that the file holds beside LICENSE. `just release-files` builds them, and
// release.yml checks the files of a release it runs again by the names.
//
// Takes nothing from its command line but the line and the tag, which it checks for their form.

import fs from "node:fs";
import { archiveOf } from "../types/npm.mjs";
import { FIRST_FILES_LINE, LINE, RELEASE_TAG, compareLines } from "./version.mjs";
import { isMain } from "../shared.mjs";

// spec's first line whose releases carry the npm package of the types (R73).
export const FIRST_NPM_LINE = "0.4";

const VERSION = /^((?:0|[1-9]\d*)\.(?:0|[1-9]\d*))\n$/;

// The version format/VERSION names, MAJOR.MINOR and a newline, as format-check reads it.
export function formatVersion(text) {
  const match = VERSION.exec(text);
  if (!match) throw new Error(`format/VERSION is ${JSON.stringify(text)}, not MAJOR.MINOR and a newline`);
  return match[1];
}

// The files of a release of the line, given format/VERSION at its commit and the release's tag:
// name and path. The tag is read only in a line whose releases carry the npm package.
export function releaseFiles(line, versionText, tag) {
  if (!LINE.test(line)) throw new Error(`the line '${line}' is not MAJOR.MINOR`);
  if (compareLines(line, FIRST_FILES_LINE) < 0) return [];
  const files = [{ name: `format-${formatVersion(versionText)}.tar.gz`, path: "format" }];
  if (compareLines(line, FIRST_NPM_LINE) < 0) return files;
  const match = RELEASE_TAG.exec(tag ?? "");
  if (!match) throw new Error(`a release of the line ${line} carries the npm package, which takes the release's tag, vMAJOR.MINOR.PATCH, and '${tag ?? ""}' is none`);
  if (`${match[1]}.${match[2]}` !== line) throw new Error(`${tag} is no release of the line ${line}`);
  return [...files, { name: archiveOf(tag.slice(1)), path: "types" }];
}

if (isMain(import.meta.url)) {
  try {
    const [line = "", tag] = process.argv.slice(2);
    for (const file of releaseFiles(line, fs.readFileSync(0, "utf8"), tag)) console.log(`${file.name} ${file.path}`);
  } catch (error) {
    console.error(`release-files: ${error.message}`);
    process.exitCode = 1;
  }
}
