// The npm package @altnovatrail/spec (R73): the TypeScript of the module format's types, which
// tools/types writes under types/, with spec's LICENSE and the package's README, tools/types/npm/.
// It holds declarations, and from FIRST_PAGE_LINE on the page's JSON, no code, and exports each package of the types by its Go path: ./formatv0 and
// ./formatv0/open. From the line FIRST_CANVAS_LINE on, it holds and exports the types of the element
// <novatrail-canvas> too, ./canvas, which types/canvas holds, written by hand (R74), and from the
// line FIRST_ADMISSION_LINE on the types of the admission table, ./admissionv0 (R96), and from the
// line FIRST_PAGE_LINE on the numbers and widths of the workbook's page and its vectors, as JSON of
// format/page.yaml and format/vectors/pages/, which tools/types writes under types/page/, by which
// canvas lays its page out (section 14 of the format text; T88), and from the line
// FIRST_DEPLOYMENT_LINE on the types of the deployment configuration, ./deploymentv1 (R85), and
// from the line FIRST_LEGAL_LINE on the types of the legal texts, ./legalv1 (R130), and from the
// line FIRST_CONSENT_AGE_LINE on the types of the table of the age of digital consent,
// ./consentagev1 (R134): what a package
// holds is the line's of its version, the release's, so that a release of an earlier line, run
// again, gets the package it got.
//
//   node tools/types/npm.mjs <root> <version> <folder> [<commit>]
//
// builds the package's archive into the folder, and prints its path: of the working tree at root,
// for `just types-check`, which checks the types through the package, or of a commit of the
// repository at root, its objects alone, for `just release-files`, which puts the archive in the
// release (tools/release/files.mjs). version is the release's, MAJOR.MINOR.PATCH without its v. npm pack
// builds the archive and tar reads it back, as tools/npm-package.mjs does for each package of spec:
// it holds the files of the package, and only them, and the package.json written here.

import path from "node:path";
import { isMain } from "../shared.mjs";
import { archiveName, checkPackageArchive, checkedVersion, packPackage, treeOf, writePackageOf } from "../npm-package.mjs";
import { compareLines } from "../release/version.mjs";
import { ADMISSION_DIR, ADMISSION_PACKAGE, CONSENT_AGE_DIR, CONSENT_AGE_PACKAGE, DEPLOYMENT_DIR, DEPLOYMENT_PACKAGE, LEGAL_DIR, LEGAL_PACKAGE, OPEN_DIR, TYPES_DIR } from "./go.mjs";

export const NAME = "@altnovatrail/spec";
const DECLARATIONS = "index.d.ts";
// The package's folder of the types: formatv0, as in Go.
const TYPES = path.posix.basename(TYPES_DIR);
// The package's folder of the types of <novatrail-canvas>, and the repository's (R74).
const CANVAS = "canvas";
const CANVAS_DIR = "types/canvas";
// spec's first line whose package holds them.
export const FIRST_CANVAS_LINE = "0.5";
// spec's first line whose package holds the types of the admission table, as the release holds the
// table (tools/release/files.mjs).
export const FIRST_ADMISSION_LINE = "0.8";
// spec's first line whose package holds the page of the workbook, format 0.4's.
export const FIRST_PAGE_LINE = "0.10";
// spec's first line whose package holds the types of the deployment configuration, as the release
// holds the configuration's format (tools/release/files.mjs).
export const FIRST_DEPLOYMENT_LINE = "0.11";
// spec's first line whose package holds the types of the legal texts, as the release holds the
// part (tools/release/files.mjs).
export const FIRST_LEGAL_LINE = "0.13";
// spec's first line whose package holds the types of the table of the age of digital consent, as
// the release holds the table (tools/release/files.mjs).
export const FIRST_CONSENT_AGE_LINE = "0.14";
// The package's folder of the page, as format/ holds it, and the repository's, which tools/types
// writes.
const PAGE = "format";
const PAGE_DIR = "types/page";
// What a file missing from the working tree asks for.
const HINT = "run just types";

// The files of the package of version, each by its path in the package and in the tree it is
// built of: of the tree, when it is given, the vectors of the page too.
export function filesOf(version, tree) {
  const files = [
    { file: "LICENSE", from: "LICENSE" },
    { file: "README.md", from: "tools/types/npm/README.md" },
    { file: `${TYPES}/${DECLARATIONS}`, from: `${TYPES_DIR}/${DECLARATIONS}` },
    { file: `${TYPES}/open/${DECLARATIONS}`, from: `${OPEN_DIR}/${DECLARATIONS}` },
  ];
  if (holdsCanvas(version)) files.push({ file: `${CANVAS}/${DECLARATIONS}`, from: `${CANVAS_DIR}/${DECLARATIONS}` });
  if (holdsAdmission(version)) files.push({ file: `${ADMISSION_PACKAGE}/${DECLARATIONS}`, from: `${ADMISSION_DIR}/${DECLARATIONS}` });
  if (holdsPage(version)) {
    files.push({ file: `${PAGE}/page.json`, from: `${PAGE_DIR}/page.json` });
    for (const from of (tree?.list(`${PAGE_DIR}/vectors`) ?? []).filter((name) => name.endsWith(".json"))) {
      files.push({ file: `${PAGE}/vectors/pages/${path.posix.basename(from)}`, from });
    }
  }
  if (holdsDeployment(version)) files.push({ file: `${DEPLOYMENT_PACKAGE}/${DECLARATIONS}`, from: `${DEPLOYMENT_DIR}/${DECLARATIONS}` });
  if (holdsLegal(version)) files.push({ file: `${LEGAL_PACKAGE}/${DECLARATIONS}`, from: `${LEGAL_DIR}/${DECLARATIONS}` });
  if (holdsConsentAge(version)) files.push({ file: `${CONSENT_AGE_PACKAGE}/${DECLARATIONS}`, from: `${CONSENT_AGE_DIR}/${DECLARATIONS}` });
  return files;
}

// Whether the package of version is of the line first or a later one: by its MAJOR.MINOR.
function fromLine(version, first) {
  const [major, minor] = checkedVersion(version).split(".");
  return compareLines(`${major}.${minor}`, first) >= 0;
}

// Whether the package of version holds the types of <novatrail-canvas>.
const holdsCanvas = (version) => fromLine(version, FIRST_CANVAS_LINE);
// Whether it holds the types of the admission table.
const holdsAdmission = (version) => fromLine(version, FIRST_ADMISSION_LINE);
// Whether it holds the page of the workbook.
const holdsPage = (version) => fromLine(version, FIRST_PAGE_LINE);
// Whether it holds the types of the deployment configuration.
const holdsDeployment = (version) => fromLine(version, FIRST_DEPLOYMENT_LINE);
// Whether it holds the types of the legal texts.
const holdsLegal = (version) => fromLine(version, FIRST_LEGAL_LINE);
// Whether it holds the types of the table of the age of digital consent.
const holdsConsentAge = (version) => fromLine(version, FIRST_CONSENT_AGE_LINE);

// The name npm pack gives the package's archive of version: the scope's @ dropped, its / a dash.
export function archiveOf(version) {
  return archiveName(NAME, version);
}

// The package's package.json, of version. Nothing runs: no scripts, no dependencies, no code to
// import but declarations. The repository is spec's, as npm's provenance wants it to be.
export function manifestOf(version) {
  const format = "The types of NovaTrail's module format for TypeScript, generated from its schemas: the parts of a module and their open views, the canonical view, the inventory, the module index and the test vectors.";
  const canvas = holdsCanvas(version);
  const admission = holdsAdmission(version);
  const page = holdsPage(version);
  const deployment = holdsDeployment(version);
  const legal = holdsLegal(version);
  const consentAge = holdsConsentAge(version);
  const description = [format, canvas ? "And the types of the element <novatrail-canvas>, the contract of the canvas and the app." : "", admission ? "And the types of the admission table, which says which AI provider may serve which age category." : "", page ? "And the numbers and widths of the workbook's page and its test vectors, as JSON, by which a canvas lays the page out." : "", deployment ? "And the types of the deployment configuration, the file /deployment.json that the app reads at its start." : "", legal ? "And the types of the legal texts' passport, which names each text, its versions and the sets of texts of the samples page." : "", consentAge ? "And the types of the table of the age of digital consent, which gives each country's age with the law that sets it." : ""].filter(Boolean).join(" ");
  return {
    name: NAME,
    version: checkedVersion(version),
    description,
    license: "Apache-2.0",
    repository: { type: "git", url: "git+https://github.com/altnovatrail/spec.git" },
    type: "module",
    exports: {
      [`./${TYPES}`]: { types: `./${TYPES}/${DECLARATIONS}` },
      [`./${TYPES}/open`]: { types: `./${TYPES}/open/${DECLARATIONS}` },
      ...(canvas ? { [`./${CANVAS}`]: { types: `./${CANVAS}/${DECLARATIONS}` } } : {}),
      ...(admission ? { [`./${ADMISSION_PACKAGE}`]: { types: `./${ADMISSION_PACKAGE}/${DECLARATIONS}` } } : {}),
      ...(page ? { "./format/page.json": "./format/page.json", "./format/vectors/pages/*.json": "./format/vectors/pages/*.json" } : {}),
      ...(deployment ? { [`./${DEPLOYMENT_PACKAGE}`]: { types: `./${DEPLOYMENT_PACKAGE}/${DECLARATIONS}` } } : {}),
      ...(legal ? { [`./${LEGAL_PACKAGE}`]: { types: `./${LEGAL_PACKAGE}/${DECLARATIONS}` } } : {}),
      ...(consentAge ? { [`./${CONSENT_AGE_PACKAGE}`]: { types: `./${CONSENT_AGE_PACKAGE}/${DECLARATIONS}` } } : {}),
      "./package.json": "./package.json",
    },
    files: [TYPES, ...(canvas ? [CANVAS] : []), ...(admission ? [ADMISSION_PACKAGE] : []), ...(page ? [PAGE] : []), ...(deployment ? [DEPLOYMENT_PACKAGE] : []), ...(legal ? [LEGAL_PACKAGE] : []), ...(consentAge ? [CONSENT_AGE_PACKAGE] : [])],
    sideEffects: false,
  };
}

// The package of version, of the tree: its files and its package.json.
function packageOf(version, tree) {
  return { files: filesOf(version, tree), manifest: manifestOf(version) };
}

// Writes the package of version into folder, which is not there yet: of the working tree at root,
// or, when commit is given, of that commit of the repository at root.
export function writePackage(root, version, folder, commit) {
  const tree = treeOf(root, commit, HINT);
  writePackageOf(packageOf(version, tree), tree, folder);
}

// Builds the archive of the package of version, of the tree at root, into the folder dir, which is
// there and holds no archive of that version; checks it and gives its path.
export function packOf(root, version, dir, commit, npm) {
  const tree = treeOf(root, commit, HINT);
  return packPackage(packageOf(version, tree), tree, dir, npm);
}

// The archive holds the files of the package, the package.json of version among them, and nothing
// else: read back by tar, not by npm, which built it. Of a line that holds the page, the vectors of
// the page are those of the tree at root, or of its commit.
export function checkArchive(archive, version, root, commit) {
  checkPackageArchive(archive, packageOf(version, root === undefined ? undefined : treeOf(root, commit, HINT)));
}

if (isMain(import.meta.url)) {
  const [root, version, dir, commit, ...rest] = process.argv.slice(2);
  if (!dir || rest.length) {
    console.error("usage: node tools/types/npm.mjs <root> <version> <folder> [<commit>]");
    process.exit(2);
  }
  try {
    console.log(packOf(path.resolve(root), version, path.resolve(dir), commit));
  } catch (error) {
    console.error(`npm: ${error.message}`);
    process.exit(1);
  }
}
