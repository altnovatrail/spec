// release-files: the files spec's release of a commit carries, by the line it is numbered in (R64).
//
//   { git show <commit>:format/VERSION; echo --; git show <commit>:admission/VERSION; echo --;
//     git show <commit>:deployment/VERSION; echo --; git show <commit>:legal/VERSION; echo --;
//     git show <commit>:consent-age/VERSION; } \
//       | node tools/release/files.mjs <line> [<tag>]
//
// From FIRST_FILES_LINE on, a release carries each normative part that has a version of its own
// as one file, <part>-<version>.tar.gz, for each version of it the platform reads (R44): while
// the format is v0 that is one file of the format, at the version format/VERSION names at the
// commit. From FIRST_ADMISSION_LINE on, it carries the admission table too,
// admission-<version>.tar.gz, at the version admission/VERSION names, which comes on stdin after
// format/VERSION and a line -- (R96). From FIRST_DEPLOYMENT_LINE on, it carries the format of the
// deployment configuration as well, deployment-<version>.tar.gz, at the version deployment/VERSION
// names, an integer, which comes after admission/VERSION and a second line -- (R85). From
// FIRST_LEGAL_LINE on, it carries the legal texts too, legal-<version>.tar.gz, at the version
// legal/VERSION names, an integer, which comes after deployment/VERSION and a third line -- (R130).
// From FIRST_CONSENT_AGE_LINE on, it carries the table of the age of digital consent too,
// consent-age-<version>.tar.gz, at the version consent-age/VERSION names, an integer, which comes
// after legal/VERSION and a fourth line -- (R134).
// Any of the files may be missing from the commit, and then its side of the line is empty.
// From FIRST_NPM_LINE on, it carries the npm package @altnovatrail/spec as well, the archive npm
// pack names for the release's version, altnovatrail-spec-<MAJOR.MINOR.PATCH>.tgz (R73): tag is
// the release's, in the line. From FIRST_CONTRACTS_LINE on, it carries the npm package of the
// contracts' code too, @altnovatrail/contracts, altnovatrail-contracts-<MAJOR.MINOR.PATCH>.tgz, and
// release.yml tags the Go module of the contracts with the release (R83). A release of an earlier
// line carries no files, and its stdin, which may be empty, is not read for a version; a release of
// a line before FIRST_ADMISSION_LINE reads format/VERSION alone, one before
// FIRST_DEPLOYMENT_LINE no deployment/VERSION, one before FIRST_LEGAL_LINE no legal/VERSION, and
// one before FIRST_CONSENT_AGE_LINE no consent-age/VERSION.
// Prints a line for each file: its
// name, and the path in the repository that the file holds beside LICENSE. `just release-files`
// builds them, and release.yml checks the files of a release it runs again by the names.
//
// Takes nothing from its command line but the line and the tag, which it checks for their form.

import fs from "node:fs";
import { FIRST_ADMISSION_LINE, FIRST_CONSENT_AGE_LINE, FIRST_DEPLOYMENT_LINE, FIRST_LEGAL_LINE, archiveOf } from "../types/npm.mjs";
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
// spec's first line whose releases carry the format of the deployment configuration (R85): the
// line whose npm package of the types holds its types, one constant for both.
export { FIRST_DEPLOYMENT_LINE };
// spec's first line whose releases carry the legal texts (R130): the line whose npm package of the
// types holds the types of their passport, one constant for both.
export { FIRST_LEGAL_LINE };
// spec's first line whose releases carry the table of the age of digital consent (R134): the line
// whose npm package of the types holds the types of the table, one constant for both.
export { FIRST_CONSENT_AGE_LINE };

const VERSION = /^((?:0|[1-9]\d*)\.(?:0|[1-9]\d*))\n$/;
const INTEGER = /^([1-9]\d*)\n$/;

// The version format/VERSION names, MAJOR.MINOR and a newline, as format-check reads it; or the
// version of another part's file, by its name.
export function formatVersion(text, file = "format/VERSION") {
  const match = VERSION.exec(text);
  if (!match) throw new Error(`${file} is ${JSON.stringify(text)}, not MAJOR.MINOR and a newline`);
  return match[1];
}

// The version deployment/VERSION names, an integer from 1 and a newline, as deployment-check reads
// it; or the version of another part's file of an integer, by its name.
export function deploymentVersion(text, file = "deployment/VERSION") {
  const match = INTEGER.exec(text);
  if (!match) throw new Error(`${file} is ${JSON.stringify(text)}, not an integer from 1 and a newline`);
  return match[1];
}

// The version legal/VERSION names, an integer from 1 and a newline, as legal-check reads it.
export function legalVersion(text) {
  return deploymentVersion(text, "legal/VERSION");
}

// The version consent-age/VERSION names, an integer from 1 and a newline, as consent-age-check
// reads it.
export function consentAgeVersion(text) {
  return deploymentVersion(text, "consent-age/VERSION");
}

// The text of format/VERSION, of admission/VERSION, of deployment/VERSION, of legal/VERSION and of
// consent-age/VERSION, apart by lines --: { format, admission, deployment, legal, consentAge }, each
// the file's text, and null for each that no line -- comes before.
export function versionTexts(text) {
  const parts = text.split(/^--\n/m);
  if (parts.length > 5) throw new Error("the VERSION files are format/VERSION, a line --, admission/VERSION, a line --, deployment/VERSION, a line --, legal/VERSION, a line --, and consent-age/VERSION: there are more lines --");
  return { format: parts[0], admission: parts[1] ?? null, deployment: parts[2] ?? null, legal: parts[3] ?? null, consentAge: parts[4] ?? null };
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
  // And one before FIRST_DEPLOYMENT_LINE no deployment/VERSION, whatever it says.
  if (compareLines(line, FIRST_DEPLOYMENT_LINE) >= 0) {
    if (!texts.deployment) throw new Error(`a release of the line ${line} carries the deployment configuration, and the commit has no deployment/VERSION`);
    files.push({ name: `deployment-${deploymentVersion(texts.deployment)}.tar.gz`, path: "deployment" });
  }
  // And one before FIRST_LEGAL_LINE no legal/VERSION.
  if (compareLines(line, FIRST_LEGAL_LINE) >= 0) {
    if (!texts.legal) throw new Error(`a release of the line ${line} carries the legal texts, and the commit has no legal/VERSION`);
    files.push({ name: `legal-${legalVersion(texts.legal)}.tar.gz`, path: "legal" });
  }
  // And one before FIRST_CONSENT_AGE_LINE no consent-age/VERSION.
  if (compareLines(line, FIRST_CONSENT_AGE_LINE) >= 0) {
    if (!texts.consentAge) throw new Error(`a release of the line ${line} carries the table of the age of digital consent, and the commit has no consent-age/VERSION`);
    files.push({ name: `consent-age-${consentAgeVersion(texts.consentAge)}.tar.gz`, path: "consent-age" });
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
