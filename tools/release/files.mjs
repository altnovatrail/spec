// release-files: the files spec's release of a commit carries, by the line it is numbered in (R64).
//
//   git show <commit>:format/VERSION | node tools/release/files.mjs <line>
//
// From FIRST_FILES_LINE on, a release carries each normative part that has a version of its own
// as one file, <part>-<version>.tar.gz, for each version of it the platform reads (R44): while
// the format is v0 that is the format alone, at the version format/VERSION names at the commit.
// A release of an earlier line carries no files, and its stdin, which may be empty, is not read
// for a version. Prints a line for each file: its name, and the path in the repository that the
// file holds beside LICENSE. `just release-files` builds them, and release.yml checks the files
// of a release it runs again by the names.
//
// Takes nothing from its command line but the line, which it checks for its form.

import fs from "node:fs";
import { FIRST_FILES_LINE, LINE, compareLines } from "./version.mjs";
import { isMain } from "../shared.mjs";

const VERSION = /^((?:0|[1-9]\d*)\.(?:0|[1-9]\d*))\n$/;

// The version format/VERSION names, MAJOR.MINOR and a newline, as format-check reads it.
export function formatVersion(text) {
  const match = VERSION.exec(text);
  if (!match) throw new Error(`format/VERSION is ${JSON.stringify(text)}, not MAJOR.MINOR and a newline`);
  return match[1];
}

// The files of a release of the line, given format/VERSION at its commit: name and path.
export function releaseFiles(line, versionText) {
  if (!LINE.test(line)) throw new Error(`the line '${line}' is not MAJOR.MINOR`);
  if (compareLines(line, FIRST_FILES_LINE) < 0) return [];
  return [{ name: `format-${formatVersion(versionText)}.tar.gz`, path: "format" }];
}

if (isMain(import.meta.url)) {
  try {
    for (const file of releaseFiles(process.argv[2] ?? "", fs.readFileSync(0, "utf8"))) console.log(`${file.name} ${file.path}`);
  } catch (error) {
    console.error(`release-files: ${error.message}`);
    process.exitCode = 1;
  }
}
