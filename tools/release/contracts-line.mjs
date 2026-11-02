// contracts-line: a new major package of an API contract starts a new line of spec's releases
// (R83; contracts/README.md, section 2), as a new version of the module format does (R44),
// checked where the next version is worked out. In spec, `just release-version` passes what
// format-line.mjs prints through it, with the commit, and it prints the same lines, or refuses:
//
//   ... | node tools/release/format-line.mjs <commit> | node tools/release/contracts-line.mjs <commit>
//
// Only a commit that gets a release is checked, against the release before it, previous=. A
// package novatrail.<part>.vN with N of 2 or more that the commit has and that release had not —
// a .proto file in contracts/novatrail/<part>/vN/ — needs a line raised above that release's. The
// first package v1 of a new part opens none, and a package that goes opens none either: buf
// breaking holds what a package may lose. git runs in the repository the recipe runs it from.
// Takes nothing from its command line but the commit.

import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { compareLines } from "./version.mjs";
import { lineOf, readOutputs } from "./format-line.mjs";
import { GIT, byCodeUnits, isMain } from "../shared.mjs";

// A contract's file and its package's folder: contracts/novatrail/<part>/vN/<name>.proto.
const CONTRACT = /^contracts\/novatrail\/([a-z][a-z0-9_]*)\/v([1-9][0-9]*)\/[^/]+\.proto$/;

// The packages of the contracts among the files of a commit, as novatrail.<part>.vN.
export function packagesOf(files) {
  const packages = new Set();
  for (const file of files) {
    const match = CONTRACT.exec(file);
    if (match) packages.add(`novatrail.${match[1]}.v${match[2]}`);
  }
  return packages;
}

// R83's rule, for the release of version after previous, with the packages at each: every new
// major package, v2 or later, needs a raised line.
export function checkContractsLine({ version, previous, packagesNow, packagesThen }) {
  const previousLine = lineOf(previous);
  const opened = [...packagesNow].filter((name) => !packagesThen.has(name) && Number(name.split(".v").at(-1)) >= 2).sort(byCodeUnits);
  if (opened.length && compareLines(lineOf(version), previousLine) <= 0) {
    throw new Error(`${opened.join(" and ")} came after ${previous}: a new major package of a contract starts a new line, so raise RELEASE_LINE above ${previousLine} in the same change (R83, R44)`);
  }
}

// The packages of the contracts at a commit or tag, by git in the current directory.
function packagesAt(revision) {
  const listed = spawnSync(GIT, ["ls-tree", "-r", "-z", "--name-only", revision, "--", "contracts/novatrail"], { encoding: "utf8" });
  if (listed.status !== 0) throw new Error(`git cannot list contracts/ at ${revision}: ${listed.stderr.trim()}`);
  return packagesOf(listed.stdout.split("\0"));
}

if (isMain(import.meta.url)) {
  try {
    const input = fs.readFileSync(0, "utf8");
    const outputs = readOutputs(input);
    if (outputs.version && outputs.previous) {
      const commit = process.argv[2] ?? "";
      if (!/^[0-9a-f]{40,64}$/.test(commit)) throw new Error(`the commit is '${commit}', not a SHA`);
      checkContractsLine({ ...outputs, packagesNow: packagesAt(commit), packagesThen: packagesAt(outputs.previous) });
    }
    process.stdout.write(input);
  } catch (error) {
    console.error(`release-version: ${error.message}`);
    process.exitCode = 1;
  }
}
