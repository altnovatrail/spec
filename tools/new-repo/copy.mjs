// What new-repo and new-repo-check share: the template's two marks, the files of a copy, and
// how a module tells that it runs as a script.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// A value the recipe fills in: one word in double braces, such as {{name}}. Other double braces,
// such as the Go template in host-network.sh, are not the template's and are left alone.
export const PLACEHOLDER = /\{\{\s*([\w.-]*)\s*\}\}/g;

// A gap the recipe leaves for whoever fills the copy in from the component's card.
export const FILL = /<!--\s*FILL:/g;

// The files of a working copy, as paths relative to its root with forward slashes, in a stable
// order. Git's own directory and the spec submodule are not the copy's.
export function walk(root) {
  const found = [];
  const visit = (dir) => {
    for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const relative = dir ? `${dir}/${entry.name}` : entry.name;
      if (entry.name === ".git" || relative === "spec") continue;
      if (entry.isDirectory()) visit(relative);
      else if (entry.isFile()) found.push(relative);
    }
  };
  visit("");
  return found.sort();
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
