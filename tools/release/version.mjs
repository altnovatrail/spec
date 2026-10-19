// release-version: the version the next release of spec takes (R31).
//
//   { git tag --list 'v*'; echo --; git tag --merged HEAD --list 'v*'; echo --;
//     git tag --points-at HEAD --list 'v*'; } | node tools/release/version.mjs
//
// Reads on stdin three lists of tags, divided by lines "--": every tag of spec, the tags the
// commit to be released descends from, and the commit's own; `just release-version` gathers
// them. The line the releases are numbered in, MAJOR.MINOR, is RELEASE_LINE in
// .github/workflows/release.yml. Prints, as lines release.yml adds to its step outputs:
//
//   version=  the next patch of the line, or nothing when there is no release to make;
//   previous= the newest release before it, where the release notes start;
//   released= the release tag the commit has already, if it has one;
//   behind=   the newest release, when it is not in the commit's history.
//
// Takes nothing from its command line: neither a path nor a command comes from its caller.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isMain } from "../shared.mjs";

// A release's tag: vMAJOR.MINOR.PATCH as SemVer writes numbers, with no leading zero. Any other
// tag that starts with a v, such as v0.2.0-rc.1, is no release and counts for nothing here.
export const RELEASE_TAG = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const LINE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

const WORKFLOW = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../.github/workflows/release.yml");

// The highest release among the tags, by number, or undefined. new-repo builds from it, and the
// next version is counted from it.
export function newestRelease(tags) {
  return tags.filter((tag) => RELEASE_TAG.test(tag)).map(numbers).sort(compare).map(name).at(-1);
}

// What to release. A commit released already gets nothing, and so does one that the newest
// release does not descend from — an older commit whose checks passed late, or were run again:
// numbers follow the history of main, and a release never comes out below a newer commit's.
// Otherwise the line's next patch, its .0 when the line has no release yet. A line that would
// number a release below the newest one is an error: the line is raised, never lowered.
export function nextVersion({ line, tags, merged, releasedHere }) {
  if (!LINE.test(line)) throw new Error(`the line '${line}' is not MAJOR.MINOR`);
  const newest = newestRelease(tags);
  const here = releasedHere.find((tag) => RELEASE_TAG.test(tag));
  if (here) return { version: "", previous: newest, released: here };
  if (newest && !merged.includes(newest)) return { version: "", previous: newest, behind: newest };

  const [major, minor] = line.split(".").map(Number);
  const inLine = tags.filter((tag) => RELEASE_TAG.test(tag)).map(numbers).filter(([a, b]) => a === major && b === minor);
  const version = [major, minor, inLine.length ? Math.max(...inLine.map((n) => n[2])) + 1 : 0];
  if (newest && compare(version, numbers(newest)) < 0) {
    throw new Error(`the line ${line} is older than the newest release, ${newest}: raise RELEASE_LINE in .github/workflows/release.yml`);
  }
  return { version: name(version), previous: newest };
}

// RELEASE_LINE as release.yml sets it, once: quoted or not, with a comment after it or not.
// Read line by line, with no regular expression to backtrack in.
export function readLine(workflow) {
  const key = "RELEASE_LINE:";
  const found = workflow.split("\n").map((line) => line.trim()).filter((line) => line.startsWith(key));
  if (found.length !== 1) throw new Error(`release.yml sets RELEASE_LINE ${found.length} times, not once`);
  const value = found[0].slice(key.length).split("#")[0].trim();
  const quoted = value.length >= 2 && (value[0] === '"' || value[0] === "'") && value.at(-1) === value[0];
  return quoted ? value.slice(1, -1) : value;
}

// What `just release-version` writes on stdin: three lists of tags divided by lines "--".
export function readTags(input) {
  const lines = input.split("\n").map((line) => line.trim());
  const parts = [[]];
  for (const line of lines) {
    if (line === "--") parts.push([]);
    else if (line !== "") parts.at(-1).push(line);
  }
  if (parts.length !== 3) throw new Error(`stdin has ${parts.length} list${parts.length === 1 ? "" : "s"} of tags, not 3, divided by lines '--'`);
  const [tags, merged, releasedHere] = parts;
  return { tags, merged, releasedHere };
}

const numbers = (tag) => tag.slice(1).split(".").map(Number);
const name = (n) => `v${n.join(".")}`;
const compare = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

if (isMain(import.meta.url)) {
  try {
    const line = readLine(fs.readFileSync(WORKFLOW, "utf8"));
    const result = nextVersion({ line, ...readTags(fs.readFileSync(0, "utf8")) });
    if (result.released) console.error(`release-version: this commit is released already, as ${result.released}`);
    if (result.behind) console.error(`release-version: the newest release, ${result.behind}, is not in this commit's history: an older commit gets no release`);
    console.log(`version=${result.version}`);
    console.log(`previous=${result.previous ?? ""}`);
    console.log(`released=${result.released ?? ""}`);
    console.log(`behind=${result.behind ?? ""}`);
  } catch (error) {
    console.error(`release-version: ${error.message}`);
    process.exitCode = 1;
  }
}
