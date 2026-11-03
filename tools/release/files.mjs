// release-files: the files spec's release of a commit carries, by the line it is numbered in (R64).
//
//   { git show <commit>:format/VERSION; echo --; git show <commit>:admission/VERSION; } \
//       | node tools/release/files.mjs <line> [<tag>]
//
// From FIRST_FILES_LINE on, a release carries each normative part that has a version of its own
// as one file, <part>-<version>.tar.gz, for each version of it the platform reads (R44): while
// the format is v0 that is one file of the format, at the version format/VERSION names at the
// commit. From FIRST_ADMISSION_LINE on, it carries the admission table too,
// admission-<version>.tar.gz, at the version admission/VERSION names, which comes on stdin after
// format/VERSION and a line -- (R96). Either file may be missing from the commit, and then its side
// of the line is empty.
// From FIRST_NPM_LINE on, it carries the npm package @altnovatrail/spec as well, the archive npm
// pack names for the release's version, altnovatrail-spec-<MAJOR.MINOR.PATCH>.tgz (R73): tag is
// the release's, in the line. From FIRST_CONTRACTS_LINE on, it carries the npm package of the
// contracts' code too, @altnovatrail/contracts, altnovatrail-contracts-<MAJOR.MINOR.PATCH>.tgz, and
// release.yml tags the Go module of the contracts with the release (R83). A release of an earlier
// line carries no files, and its stdin, which may be empty, is not read for a version; a release of
// a line before FIRST_ADMISSION_LINE reads format/VERSION alone. Prints a line for each file: its
// name, and the path in the repository that the file holds beside LICENSE. `just release-files`
// builds them, and release.yml checks the files of a release it runs again by the names.
//
// Takes nothing from its command line but the line and the tag, which it checks for their form.

import fs from "node:fs";
import { FIRST_ADMISSION_LINE, archiveOf } from "../types/npm.mjs";
import { archiveOf as contractsArchiveOf } from "../contracts/npm.mjs";
import { FIRST_FILES_LINE, LINE, RELEASE_TAG, compareLines } from "./version.mjs";
import { isMain } from "../shared.mjs";

// spec's first line whose releases carry the npm package of the types (R73).
export const FIRST_NPM_LINE = "0.4";
// spec's first line whose releases carry the npm package of the contracts' code (R83): a release
// of an earlier line, run again, builds the files it got, though its commit may hold contracts.
export const FIRST_CONTRACTS_LINE = "0.7";
// spec's first line whose releases carry the admission table (R96): the line whose npm package of
// the types holds its types, one constant for both.
export { FIRST_ADMISSION_LINE };

const VERSION = /^((?:0|[1-9]\d*)\.(?:0|[1-9]\d*))\n$/;

// The version format/VERSION names, MAJOR.MINOR and a newline, as format-check reads it; or the
// version of another part's file, by its name.
export function formatVersion(text, file = "format/VERSION") {
  const match = VERSION.exec(text);
  if (!match) throw new Error(`${file} is ${JSON.stringify(text)}, not MAJOR.MINOR and a newline`);
  return match[1];
}

// The text of format/VERSION and of admission/VERSION, apart by a line --: { format, admission },
// each the file's text, and admission null when there is no such line.
export function versionTexts(text) {
  const parts = text.split(/^--\n/m);
  if (parts.length > 2) throw new Error("the VERSION files are format/VERSION, a line --, and admission/VERSION: there are more lines --");
  return { format: parts[0], admission: parts.length === 2 ? parts[1] : null };
}

// The files of a release of the line, given format/VERSION and admission/VERSION at its commit and
// the release's tag: name and path. The tag is read only in a line whose releases carry the npm
// package.
export function releaseFiles(line, versionText, tag) {
  if (!LINE.test(line)) throw new Error(`the line '${line}' is not MAJOR.MINOR`);
  if (compareLines(line, FIRST_FILES_LINE) < 0) return [];
  const texts = versionTexts(versionText);
  const files = [{ name: `format-${formatVersion(texts.format)}.tar.gz`, path: "format" }];
  // A release of an earlier line reads format/VERSION alone, whatever admission/VERSION says.
  if (compareLines(line, FIRST_ADMISSION_LINE) >= 0) {
    if (!texts.admission) throw new Error(`a release of the line ${line} carries the admission table, and the commit has no admission/VERSION`);
    files.push({ name: `admission-${formatVersion(texts.admission, "admission/VERSION")}.tar.gz`, path: "admission" });
  }
  if (compareLines(line, FIRST_NPM_LINE) < 0) return files;
  const match = RELEASE_TAG.exec(tag ?? "");
  if (!match) throw new Error(`a release of the line ${line} carries the npm package, which takes the release's tag, vMAJOR.MINOR.PATCH, and '${tag ?? ""}' is none`);
  if (`${match[1]}.${match[2]}` !== line) throw new Error(`${tag} is no release of the line ${line}`);
  files.push({ name: archiveOf(tag.slice(1)), path: "types" });
  if (compareLines(line, FIRST_CONTRACTS_LINE) >= 0) files.push({ name: contractsArchiveOf(tag.slice(1)), path: "contracts" });
  return files;
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
