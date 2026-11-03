// The npm package @altnovatrail/spec (R73): the TypeScript of the module format's types, which
// tools/types writes under types/, with spec's LICENSE and the package's README, tools/types/npm/.
// It holds declarations alone, and exports each package of the types by its Go path: ./formatv0 and
// ./formatv0/open. From the line FIRST_CANVAS_LINE on, it holds and exports the types of the element
// <novatrail-canvas> too, ./canvas, which types/canvas holds, written by hand (R74): what a package
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
import { OPEN_DIR, TYPES_DIR } from "./go.mjs";

export const NAME = "@altnovatrail/spec";
const DECLARATIONS = "index.d.ts";
// The package's folder of the types: formatv0, as in Go.
const TYPES = path.posix.basename(TYPES_DIR);
// The package's folder of the types of <novatrail-canvas>, and the repository's (R74).
const CANVAS = "canvas";
const CANVAS_DIR = "types/canvas";
// spec's first line whose package holds them.
export const FIRST_CANVAS_LINE = "0.5";
// What a file missing from the working tree asks for.
const HINT = "run just types";

// The files of the package of version, each by its path in the package and in the tree it is
// built of.
export function filesOf(version) {
  const files = [
    { file: "LICENSE", from: "LICENSE" },
    { file: "README.md", from: "tools/types/npm/README.md" },
    { file: `${TYPES}/${DECLARATIONS}`, from: `${TYPES_DIR}/${DECLARATIONS}` },
    { file: `${TYPES}/open/${DECLARATIONS}`, from: `${OPEN_DIR}/${DECLARATIONS}` },
  ];
  if (holdsCanvas(version)) files.push({ file: `${CANVAS}/${DECLARATIONS}`, from: `${CANVAS_DIR}/${DECLARATIONS}` });
  return files;
}

// Whether the package of version holds the types of <novatrail-canvas>: by the line of the version,
// its MAJOR.MINOR.
function holdsCanvas(version) {
  const [major, minor] = checkedVersion(version).split(".");
  return compareLines(`${major}.${minor}`, FIRST_CANVAS_LINE) >= 0;
}

// The name npm pack gives the package's archive of version: the scope's @ dropped, its / a dash.
export function archiveOf(version) {
  return archiveName(NAME, version);
}

// The package's package.json, of version. Nothing runs: no scripts, no dependencies, no code to
// import but declarations. The repository is spec's, as npm's provenance wants it to be.
export function manifestOf(version) {
  const format = "The types of NovaTrail's module format for TypeScript, generated from its schemas: the parts of a module and their open views, the canonical view, the inventory, the module index and the test vectors.";
  const canvas = holdsCanvas(version);
  return {
    name: NAME,
    version: checkedVersion(version),
    description: canvas ? `${format} And the types of the element <novatrail-canvas>, the contract of the canvas and the app.` : format,
    license: "Apache-2.0",
    repository: { type: "git", url: "git+https://github.com/altnovatrail/spec.git" },
    type: "module",
    exports: {
      [`./${TYPES}`]: { types: `./${TYPES}/${DECLARATIONS}` },
      [`./${TYPES}/open`]: { types: `./${TYPES}/open/${DECLARATIONS}` },
      ...(canvas ? { [`./${CANVAS}`]: { types: `./${CANVAS}/${DECLARATIONS}` } } : {}),
      "./package.json": "./package.json",
    },
    files: canvas ? [TYPES, CANVAS] : [TYPES],
    sideEffects: false,
  };
}

// The package of version: its files and its package.json.
function packageOf(version) {
  return { files: filesOf(version), manifest: manifestOf(version) };
}

// Writes the package of version into folder, which is not there yet: of the working tree at root,
// or, when commit is given, of that commit of the repository at root.
export function writePackage(root, version, folder, commit) {
  writePackageOf(packageOf(version), treeOf(root, commit, HINT), folder);
}

// Builds the archive of the package of version, of the tree at root, into the folder dir, which is
// there and holds no archive of that version; checks it and gives its path.
export function packOf(root, version, dir, commit, npm) {
  return packPackage(packageOf(version), treeOf(root, commit, HINT), dir, npm);
}

// The archive holds the files of the package, the package.json of version among them, and nothing
// else: read back by tar, not by npm, which built it.
export function checkArchive(archive, version) {
  checkPackageArchive(archive, packageOf(version));
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
