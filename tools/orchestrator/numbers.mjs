// The next free number of a task in a repository (T175). A node of an epic that the repository has
// no task for yet gets one when it starts (README.md, section 3), and `main` alone is not enough: a
// branch — of an open pull request, or one pushed with none yet —, or a run of the orchestrator
// that has not merged yet, may hold a number `main` has not seen: T171 gave `skill-map`'s T27 to two
// tasks so. A NovaTrail repository has a handful of branches, so each is read: a tree, and the files
// of the plan that differ from those read already.
//
// A number is the repository's own where its plan defines it: the first or second cell of a row of a
// table — «| [x] | T27 | …» — and a heading «#### T27.», in RUN.md, run/TASKS.md and the archives
// docs/plan/*.md. A number it only cites, of its own or another repository, is not counted.

import { spawnSync } from "node:child_process";
import { GH } from "../shared.mjs";
import { REPOSITORY } from "./containers.mjs";

export const OWNER = "altnovatrail";

// The files of a plan that define its tasks' numbers.
const PLAN_FILE = /^(?:RUN\.md|run\/TASKS\.md|docs\/plan\/[^/]+\.md)$/;
const ROW = /^\|([^|\n]*)\|([^|\n]*)\|/gm;
const HEADING = /^#{2,6}[ \t]+T(\d+)\./gm;
const NUMBER = /^\**T(\d+)\**$/;

// How long one call of gh may take: a stalled network ends in an error that says so.
const TIMEOUT = 120_000;

// gh with its arguments: what it printed, or an error with what it said.
export function runGh(args, { program = GH, env = process.env } = {}) {
  const result = spawnSync(program, args, { encoding: "utf8", env, maxBuffer: 64 * 1024 * 1024, timeout: TIMEOUT });
  if (result.error) throw new Error(`gh ${args[0]}: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`gh ${args.join(" ")}: ${String(result.stderr || result.stdout).trim() || `exit ${result.status}`}`);
  return result.stdout;
}

// The largest number a plan's text defines, or 0.
export function highestIn(text) {
  let top = 0;
  for (const [, first, second] of text.matchAll(ROW)) {
    for (const cell of [first, second]) {
      const found = NUMBER.exec(cell.trim());
      if (found) top = Math.max(top, Number(found[1]));
    }
  }
  for (const [, n] of text.matchAll(HEADING)) top = Math.max(top, Number(n));
  return top;
}

// The largest number the plan's files define at a commit or branch of the repository, through
// GitHub. A file read once is not read again: a pull request's branch shares most of main's.
function highestAt(repo, ref, gh, blobs) {
  const api = `repos/${OWNER}/${repo}`;
  const tree = JSON.parse(gh(["api", `${api}/git/trees/${ref}?recursive=1`]));
  if (tree.truncated) throw new Error(`${repo}: GitHub gave the tree of ${ref} cut short`);
  let top = 0;
  for (const entry of tree.tree ?? []) {
    if (entry.type !== "blob" || !PLAN_FILE.test(entry.path)) continue;
    if (!blobs.has(entry.sha)) blobs.set(entry.sha, highestIn(gh(["api", `${api}/git/blobs/${entry.sha}`, "-H", "Accept: application/vnd.github.raw"])));
    top = Math.max(top, blobs.get(entry.sha));
  }
  return top;
}

const label = (n) => (n > 0 ? `T${n}` : null);

// The next free number of `repo`: one above the largest of main's, of the head of each open pull
// request, of each other branch, and of `runs` — the orchestrator's runs of the repository not
// known to be done, each { run, tasks }, every number it has gone by —, with where each came from.
export function nextTask(repo, { gh = runGh, runs = [] } = {}) {
  if (!REPOSITORY.test(repo) || /^\.+$/.test(repo)) throw new Error(`not a repository's name: ${repo}`);
  const api = `repos/${OWNER}/${repo}`;
  const list = (endpoint) => JSON.parse(gh(["api", "--paginate", "--slurp", `${api}/${endpoint}`])).flat();
  const blobs = new Map();
  const main = highestAt(repo, "main", gh, blobs);
  const open = list("pulls?state=open&per_page=100");
  const pulls = open.map((pull) => ({ number: pull.number, top: highestAt(repo, pull.head.sha, gh, blobs) }));
  // A branch at main's head or at a pull request's has been read.
  const branchList = list("branches?per_page=100");
  const seen = new Set([...branchList.filter((b) => b.name === "main").map((b) => b.commit.sha), ...open.map((p) => p.head.sha)]);
  const branches = branchList.filter((b) => !seen.has(b.commit.sha)).map((b) => ({ name: b.name, top: highestAt(repo, b.commit.sha, gh, blobs) }));
  const numbered = runs.map((r) => ({ run: r.run, top: Math.max(0, ...r.tasks.map((t) => Number(t.slice(1)))) }));
  const top = Math.max(main, ...pulls.map((p) => p.top), ...branches.map((b) => b.top), ...numbered.map((r) => r.top));
  return {
    repo,
    next: `T${top + 1}`,
    main: label(main),
    pull_requests: pulls.map((p) => ({ number: p.number, task: label(p.top) })),
    branches: branches.map((b) => ({ name: b.name, task: label(b.top) })),
    runs: numbered.map((r) => ({ run: r.run, task: label(r.top) })),
  };
}
