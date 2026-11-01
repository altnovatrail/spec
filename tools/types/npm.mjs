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
// builds the archive: the npm of the Node that runs this, with no configuration of the user's or
// the system's, no cache of theirs, and no scripts. The archive is then read back, and it holds the
// files of the package, and only them, and the package.json written here.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { GIT, TAR, byCodeUnits, isMain } from "../shared.mjs";
import { compareLines } from "../release/version.mjs";
import { OPEN_DIR, TYPES_DIR } from "./go.mjs";

export const NAME = "@altnovatrail/spec";
const VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const DECLARATIONS = "index.d.ts";
// The package's folder of the types: formatv0, as in Go.
const TYPES = path.posix.basename(TYPES_DIR);
// The package's folder of the types of <novatrail-canvas>, and the repository's (R74).
const CANVAS = "canvas";
const CANVAS_DIR = "types/canvas";
// spec's first line whose package holds them.
export const FIRST_CANVAS_LINE = "0.5";
// npm pack puts every file of the package under this folder of the archive.
const PREFIX = "package/";
// npm's own script, which comes with Node: no directory on PATH decides which npm runs.
const NPM = path.join(path.dirname(process.execPath), "..", "lib", "node_modules", "npm", "bin", "npm-cli.js");

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
  const [major, minor] = checked(version).split(".");
  return compareLines(`${major}.${minor}`, FIRST_CANVAS_LINE) >= 0;
}

// The name npm pack gives the package's archive of version: the scope's @ dropped, its / a dash.
export function archiveOf(version) {
  return `${NAME.slice(1).replace("/", "-")}-${checked(version)}.tgz`;
}

// The package's package.json, of version. Nothing runs: no scripts, no dependencies, no code to
// import but declarations. The repository is spec's, as npm's provenance wants it to be.
export function manifestOf(version) {
  const format = "The types of NovaTrail's module format for TypeScript, generated from its schemas: the parts of a module and their open views, the canonical view, the inventory, the module index and the test vectors.";
  const canvas = holdsCanvas(version);
  return {
    name: NAME,
    version: checked(version),
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

// Writes the package of version into folder, which is not there yet: of the working tree at root,
// or, when commit is given, of that commit of the repository at root.
export function writePackage(root, version, folder, commit) {
  const manifest = manifestOf(version);
  if (fs.existsSync(folder)) throw new Error(`${folder} is there already; the package goes into a new folder`);
  const read = commit === undefined ? (from) => fileOf(root, from) : (from) => blobOf(root, commit, from);
  const contents = filesOf(version).map(({ file, from }) => ({ file, bytes: read(from) }));
  for (const { file, bytes } of contents) {
    fs.mkdirSync(path.dirname(path.join(folder, file)), { recursive: true });
    fs.writeFileSync(path.join(folder, file), bytes);
  }
  fs.writeFileSync(path.join(folder, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);
}

// A file of the working tree at root: a file, not a link or a folder.
function fileOf(root, from) {
  if (!fs.lstatSync(path.join(root, from), { throwIfNoEntry: false })?.isFile()) throw new Error(`${from} is no file of ${root}: run just types`);
  return fs.readFileSync(path.join(root, from));
}

// A file of a commit, by git: a blob of a plain or an executable file, not a link or a submodule.
function blobOf(root, commit, from) {
  const entry = run(GIT, ["-C", root, "ls-tree", "-z", "--end-of-options", commit, "--", from], "utf8").split("\0")[0];
  const [, mode, type, sha] = /^(\d+) (\w+) ([0-9a-f]+)\t/.exec(entry) ?? [];
  if (type !== "blob" || !["100644", "100755"].includes(mode)) throw new Error(`${from} is no file of ${commit}`);
  return run(GIT, ["-C", root, "cat-file", "blob", sha], "buffer");
}

// Builds the archive of the package of version, of the tree at root, into the folder dir, which is
// there and holds no archive of that version; checks it and gives its path.
export function packOf(root, version, dir, commit, npm = NPM) {
  const archive = path.join(dir, archiveOf(version));
  if (fs.existsSync(archive)) throw new Error(`${archive} is there already`);
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "spec-npm-"));
  try {
    writePackage(root, version, path.join(work, "package"), commit);
    // npm refuses one file as both configurations.
    for (const config of ["userconfig", "globalconfig"]) fs.writeFileSync(path.join(work, config), "");
    const args = [npm, "pack", path.join(work, "package"), "--pack-destination", dir, "--ignore-scripts", "--userconfig", path.join(work, "userconfig"), "--globalconfig", path.join(work, "globalconfig"), "--cache", path.join(work, "cache"), "--loglevel", "error"];
    const packed = spawnSync(process.execPath, args, { cwd: work, env: { HOME: work, PATH: "/usr/bin:/bin" }, encoding: "utf8" });
    if (packed.status !== 0) throw new Error(`npm pack failed: ${(packed.stderr || packed.error?.message || "").trim()}`);
    checkArchive(archive, version);
    return archive;
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
}

// The archive holds the files of the package, the package.json of version among them, and nothing
// else: read back by tar, not by npm, which built it.
export function checkArchive(archive, version) {
  const listed = run(TAR, ["--quoting-style=literal", "-tzf", archive], "utf8");
  const held = listed.split("\n").filter((entry) => entry && !entry.endsWith("/")).sort(byCodeUnits);
  const wanted = [...filesOf(version).map(({ file }) => file), "package.json"].map((file) => `${PREFIX}${file}`).sort(byCodeUnits);
  if (!isDeepStrictEqual(held, wanted)) throw new Error(`${path.basename(archive)} holds [${held.join(", ")}], not [${wanted.join(", ")}]`);
  const manifest = JSON.parse(run(TAR, ["-xzOf", archive, `${PREFIX}package.json`], "utf8"));
  if (!isDeepStrictEqual(manifest, manifestOf(version))) throw new Error(`the package.json of ${path.basename(archive)} is not the one of ${NAME}@${version}`);
}

function run(program, args, encoding) {
  const result = spawnSync(program, args, { encoding });
  if (result.status !== 0) throw new Error(`${path.basename(program)} ${args.join(" ")} failed: ${String(result.stderr || result.error?.message || "").trim()}`);
  return result.stdout;
}

function checked(version) {
  if (!VERSION.test(version)) throw new Error(`the version '${version}' is not MAJOR.MINOR.PATCH`);
  return version;
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
