// What every tool under tools/ shares: how a module tells that it runs as a script.

import fs from "node:fs";
import { fileURLToPath } from "node:url";

// Whether the module at `url` runs as a script, also through a symlink: argv[1] keeps the link,
// the module's URL the real path. Under `node -e` argv[1] is an argument rather than a file.
export function isMain(url) {
  try {
    return fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(url));
  } catch {
    return false;
  }
}
