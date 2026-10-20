// release-line: the line a release workflow sets, RELEASE_LINE, read from the workflow on stdin.
//
//   git show <commit>:.github/workflows/release.yml | node tools/release/line.mjs
//
// `just release-version` feeds it spec's release.yml as it stands at the commit to be released,
// so that a commit is numbered in the line it was made in, whichever commit is checked out
// (R31). Prints the line, MAJOR.MINOR as release.yml writes it; nextVersion checks its form.
//
// Takes nothing from its command line: neither a path nor a command comes from its caller.

import fs from "node:fs";
import { readLine } from "./version.mjs";
import { isMain } from "../shared.mjs";

if (isMain(import.meta.url)) {
  try {
    console.log(readLine(fs.readFileSync(0, "utf8")));
  } catch (error) {
    console.error(`release-line: ${error.message}`);
    process.exitCode = 1;
  }
}
