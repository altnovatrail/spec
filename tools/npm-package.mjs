// An npm package of spec: its files, read from a tree of the repository, and its package.json,
// written into a folder that npm packs into the archive of a release (R73; R83). Two packages
// use it: @altnovatrail/spec, the types of the module format (tools/types/npm.mjs), and
// @altnovatrail/contracts, the code of the API contracts for TypeScript (tools/contracts/npm.mjs).
//
// A tree is the working tree at a root, for the checks, or a commit of the repository at that
// root, its objects alone, for `just release-files`. npm pack builds the archive: the npm of the
// Node that runs this, with no configuration of the user's or the system's, no cache of theirs,
// and no scripts. The archive is then read back by tar, and it holds the files of the package,
// and only them, and the package.json written here.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { GIT, TAR, byCodeUnits } from "./shared.mjs";

// A version of a package: a release's, MAJOR.MINOR.PATCH without its v.
const VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
// npm pack puts every file of the package under this folder of the archive.
const PREFIX = "package/";
// npm's own script, which comes with Node: no directory on PATH decides which npm runs.
export const NPM = path.join(path.dirname(process.execPath), "..", "lib", "node_modules", "npm", "bin", "npm-cli.js");

// Whether a text is such a version, exactly: no range, no prerelease.
export function isVersion(text) {
  return typeof text === "string" && VERSION.test(text);
}

export function checkedVersion(version) {
  if (!isVersion(version)) throw new Error(`the version '${version}' is not MAJOR.MINOR.PATCH`);
  return version;
}

// The name npm pack gives the archive of a package's version: the scope's @ dropped, its / a dash.
export function archiveName(name, version) {
  return `${name.slice(1).replace("/", "-")}-${checkedVersion(version)}.tgz`;
}

// The tree a package is read from: the working tree at root, or, when commit is given, that
// commit of the repository at root. read gives a file's bytes; list, the files under a folder, by
// their paths from root. hint is what a file missing from the working tree asks for.
export function treeOf(root, commit, hint) {
  if (commit === undefined) {
    return {
      read(from) {
        if (!fs.lstatSync(path.join(root, from), { throwIfNoEntry: false })?.isFile()) throw new Error(`${from} is no file of ${root}${hint ? `: ${hint}` : ""}`);
        return fs.readFileSync(path.join(root, from));
      },
      list(folder) {
        const full = path.join(root, folder);
        if (!fs.existsSync(full)) return [];
        return fs
          .readdirSync(full, { recursive: true, withFileTypes: true })
          .filter((entry) => entry.isFile())
          .map((entry) => path.posix.join(folder, path.relative(full, path.join(entry.parentPath, entry.name)).split(path.sep).join("/")))
          .sort(byCodeUnits);
      },
    };
  }
  return {
    read(from) {
      const entry = run(GIT, ["-C", root, "ls-tree", "-z", "--end-of-options", commit, "--", from], "utf8").split("\0")[0];
      const [, mode, type, sha] = /^(\d+) (\w+) ([0-9a-f]+)\t/.exec(entry) ?? [];
      if (type !== "blob" || !["100644", "100755"].includes(mode)) throw new Error(`${from} is no file of ${commit}`);
      return run(GIT, ["-C", root, "cat-file", "blob", sha], "buffer");
    },
    list(folder) {
      const listed = run(GIT, ["-C", root, "ls-tree", "-r", "-z", "--name-only", "--end-of-options", commit, "--", `${folder}/`], "utf8");
      return listed.split("\0").filter(Boolean).sort(byCodeUnits);
    },
  };
}

// Writes the package — its files, [{ file, from }], read from the tree, and its manifest — into
// folder, which is not there yet.
export function writePackageOf({ files, manifest }, tree, folder) {
  if (fs.existsSync(folder)) throw new Error(`${folder} is there already; the package goes into a new folder`);
  const contents = files.map(({ file, from }) => ({ file, bytes: tree.read(from) }));
  for (const { file, bytes } of contents) {
    fs.mkdirSync(path.dirname(path.join(folder, file)), { recursive: true });
    fs.writeFileSync(path.join(folder, file), bytes);
  }
  fs.writeFileSync(path.join(folder, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);
}

// Builds the archive of the package — { files, manifest }, the manifest naming the package and its
// version — of the tree into the folder dir, which is there and holds no archive of that version;
// checks it and gives its path.
export function packPackage(pkg, tree, dir, npm = NPM) {
  const archive = path.join(dir, archiveName(pkg.manifest.name, pkg.manifest.version));
  if (fs.existsSync(archive)) throw new Error(`${archive} is there already`);
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "spec-npm-"));
  try {
    writePackageOf(pkg, tree, path.join(work, "package"));
    // npm refuses one file as both configurations.
    for (const config of ["userconfig", "globalconfig"]) fs.writeFileSync(path.join(work, config), "");
    const args = [npm, "pack", path.join(work, "package"), "--pack-destination", dir, "--ignore-scripts", "--userconfig", path.join(work, "userconfig"), "--globalconfig", path.join(work, "globalconfig"), "--cache", path.join(work, "cache"), "--loglevel", "error"];
    const packed = spawnSync(process.execPath, args, { cwd: work, env: { HOME: work, PATH: "/usr/bin:/bin" }, encoding: "utf8" });
    if (packed.status !== 0) throw new Error(`npm pack failed: ${(packed.stderr || packed.error?.message || "").trim()}`);
    checkPackageArchive(archive, pkg);
    return archive;
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
}

// The archive holds the files of the package, its package.json among them, and nothing else: read
// back by tar, not by npm, which built it.
export function checkPackageArchive(archive, { files, manifest }) {
  const listed = run(TAR, ["--quoting-style=literal", "-tzf", archive], "utf8");
  const held = listed.split("\n").filter((entry) => entry && !entry.endsWith("/")).sort(byCodeUnits);
  const wanted = [...files.map(({ file }) => file), "package.json"].map((file) => `${PREFIX}${file}`).sort(byCodeUnits);
  if (!isDeepStrictEqual(held, wanted)) throw new Error(`${path.basename(archive)} holds [${held.join(", ")}], not [${wanted.join(", ")}]`);
  const read = JSON.parse(run(TAR, ["-xzOf", archive, `${PREFIX}package.json`], "utf8"));
  if (!isDeepStrictEqual(read, manifest)) throw new Error(`the package.json of ${path.basename(archive)} is not the one of ${manifest.name}@${manifest.version}`);
}

function run(program, args, encoding) {
  const result = spawnSync(program, args, { encoding });
  if (result.status !== 0) throw new Error(`${path.basename(program)} ${args.join(" ")} failed: ${String(result.stderr || result.error?.message || "").trim()}`);
  return result.stdout;
}
