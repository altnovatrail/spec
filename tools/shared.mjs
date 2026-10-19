// What every tool under tools/ shares: how a module tells that it runs as a script, the
// programs the tools run, and how they order names.

import fs from "node:fs";
import { fileURLToPath } from "node:url";

// The programs the tools run, by absolute path: no directory on PATH decides which program runs.
// git is the one the devcontainers base image builds, which PATH finds first in the toolchain
// image, or else the system's own, as a runner or a cloud session without the image has it; tar
// is the system's, wherever its /usr is not merged with /.
export const GIT = first(["/usr/local/bin/git", "/usr/bin/git", "/bin/git"]);
export const TAR = first(["/usr/bin/tar", "/bin/tar"]);

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

// Names in the order of their UTF-16 code units, as sort() puts them with no compare function:
// a stable order, the same on every machine, whatever its locale.
export function byCodeUnits(a, b) {
  if (a < b) return -1;
  return a > b ? 1 : 0;
}
