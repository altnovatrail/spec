// What every tool under tools/ shares: how a module tells that it runs as a script, the
// programs the tools run, which paths of another repository they read, and how they order names.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The programs the tools run, by absolute path: no directory on PATH decides which program runs.
// git is the one the devcontainers base image builds, which PATH finds first in the toolchain
// image, or else the system's own, as a runner or a cloud session without the image has it; tar
// is the system's, wherever its /usr is not merged with /. tools/gomod/main.go keeps the same
// list for git, in Go: a change to one is a change to both.
export const GIT = first(["/usr/local/bin/git", "/usr/bin/git", "/bin/git"]);
export const TAR = first(["/usr/bin/tar", "/bin/tar"]);
// gh is the devcontainer's, which its Dockerfile puts in /usr/local/bin, or the system's. Only
// inbox runs it, in a session: the toolchain image and CI have none.
export const GH = first(["/usr/local/bin/gh", "/usr/bin/gh"]);
// buf is the toolchain stage's, which its Dockerfile puts in /usr/local/bin at an exact version
// (R83). Only the check of the contracts and their generation run it.
export const BUF = first(["/usr/local/bin/buf"]);

// The first of the paths that exists, or the first of them, which then fails by its own name.
function first(paths) {
  return paths.find((program) => fs.existsSync(program)) ?? paths[0];
}

// Whether the module at `url` runs as a script, also through a symlink: argv[1] keeps the link,
// the module's URL the real path. Under `node -e` argv[1] is an argument rather than a file.
export function isMain(url) {
  try {
    return fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(url));
  } catch {
    return false;
  }
}

// A path another repository gives, as the absolute path to read: inside the folder the check runs
// from, the repository's root, and never outside it. A lock file, an exceptions file and a sample
// file are the repository's own, so a path that leaves it — ../, or an absolute path elsewhere — is
// refused, and so is a link in it that leads out, since what is read is where the link leads, and
// a check would print part of a file from outside. A path to nothing is returned as it is, for the
// reader to name.
export function inRepository(file, root = process.cwd()) {
  const resolved = path.resolve(root, file);
  if (!resolved.startsWith(root + path.sep)) throw new Error(`${file}: not a file of the repository the check runs in, ${root}`);
  let real;
  try {
    real = fs.realpathSync(resolved);
  } catch {
    return resolved;
  }
  if (!real.startsWith(fs.realpathSync(root) + path.sep)) throw new Error(`${file}: a link that leads out of the repository the check runs in, ${root}`);
  return real;
}

// Names in the order of their UTF-16 code units, as sort() puts them with no compare function:
// a stable order, the same on every machine, whatever its locale.
export function byCodeUnits(a, b) {
  if (a < b) return -1;
  return a > b ? 1 : 0;
}

// The tsconfig of each resolution of modules a consumer of spec's npm packages may use, by its file
// name, and the options that make each as strict as TypeScript goes and check the packages'
// declarations too: tools/types checks the types of the format by them, and tools/contracts the
// code of the contracts.
export const TYPESCRIPT_CONFIGS = {
  "tsconfig.nodenext.json": { module: "nodenext", moduleResolution: "nodenext" },
  "tsconfig.bundler.json": { module: "preserve", moduleResolution: "bundler" },
};
export const TYPESCRIPT_STRICT = {
  target: "es2022",
  lib: ["es2022"],
  types: [],
  strict: true,
  exactOptionalPropertyTypes: true,
  noUncheckedIndexedAccess: true,
  verbatimModuleSyntax: true,
  isolatedModules: true,
  skipLibCheck: false,
  noEmit: true,
};
