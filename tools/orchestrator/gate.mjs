// xrepo's way to a pull request (R166): sync merges main into the epic's branch of each clone,
// push sends the branch to GitHub, and gate runs, before any pull request, the CI of each
// repository the epic changed in that repository's own container — its recipes ci-*, the browsers
// its CI runs, then patchcov against its codecov.yml — with spec's submodules at the clone of spec.
// ship.mjs carries the pull requests after the author's «да».

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { DOCKER } from "../shared.mjs";
import { STAND, stamp } from "./stand.mjs";
import { GIT_ENV } from "./runs.mjs";
import { checkRepo, clonesOf, containerId, docker, epicOf, git, GUARDS, pinnedOf, up } from "./xrepo.mjs";

// The checks of Go's shared workflow, and of TypeScript's, whose `just ci` runs the browsers.
const GO = ["ci-lint", "ci-test", "ci-vuln", "ci-licenses"];
const TS = ["ci"];
// spec's own: the steps `toolchain.sh spec <recipe>` of its ci.yml but the release's, coverage —
// its tests, the check that each module is in a report, and ci-test, Go's profile —, and the rest
// of Go's workflow. A test holds it to ci.yml.
export const SPEC_GATE = ["docs-check", "format-check", "admission-check", "deployment-check", "legal-check", "consent-age-check", "export-check", "types-check", "contracts-check", "go-check", "licenses-check", "coverage", "ci-lint", "ci-vuln", "ci-licenses"];
// The recipes of each repository's gate: its kind's, and the jobs of its ci.yml that run one recipe
// of its own. The jobs that build on several platforms, an image or a gate of sim stay with CI.
export const GATES = {
  spec: SPEC_GATE,
  ".github": GO,
  "module-kit": GO,
  "learner-model": [...GO, "ci-proto", "ci-release"],
  engine: [...GO, "ci-contracts"],
  tutor: [...GO, "ci-sample-check", "ci-canvas-check"],
  api: [...GO, "ci-modules"],
  sim: GO,
  modules: GO,
  canvas: TS,
  app: TS,
  "skill-map": TS,
};
// How long one recipe may run: spec's coverage and app's browsers take the longest.
export const RECIPE_MS = 90 * 60_000;
const PUSH = Object.entries(GIT_ENV).filter(([k]) => k.startsWith("GIT_CONFIG_VALUE_")).flatMap(([, value]) => ["-c", `credential.helper=${value}`]);

// The clone's head, and whether it is ahead of origin/main once main is fetched: a clone the epic
// has changed. spec is one too, only when changed.
export function touchedOf(dir, deps, named = []) {
  const all = clonesOf(dir);
  for (const repo of named) if (!all.includes(repo)) throw new Error(`${repo} has no clone in ${dir}`);
  return all.filter((repo) => {
    const clone = path.join(dir, repo);
    git(deps, clone, ["fetch", "--quiet", "origin", "main"]);
    if (named.length) return named.includes(repo);
    return Number(git(deps, clone, ["rev-list", "--count", "origin/main..HEAD"]).trim()) > 0;
  });
}

const conflicts = (deps, clone) => git(deps, clone, ["diff", "--name-only", "--diff-filter=U"]).split("\n").filter(Boolean);

// main into each clone's branch by a merge commit, signed off; a conflict is left for the session to
// resolve, with its files. Once every clone has merged, the wiring is renewed.
export function sync(named, deps) {
  const { epic, dir } = epicOf(deps, named);
  const rows = clonesOf(dir).map((repo) => {
    const clone = path.join(dir, repo);
    git(deps, clone, ["fetch", "--quiet", "origin", "main"]);
    try {
      git(deps, clone, ["merge-base", "--is-ancestor", "origin/main", "HEAD"]);
      return { repo, sync: "up to date" };
    } catch {
      // main has commits the branch does not.
    }
    // A branch with no commit of its own only follows main: a merge commit would make it one the
    // epic changed.
    if (!Number(git(deps, clone, ["rev-list", "--count", "origin/main..HEAD"]).trim())) {
      git(deps, clone, ["merge", "--quiet", "--ff-only", "origin/main"]);
      return { repo, sync: "fast-forward", head: git(deps, clone, ["rev-parse", "HEAD"]).trim() };
    }
    try {
      git(deps, clone, [...(deps.identity ?? []), "merge", "--no-ff", "--signoff", "--no-edit", "origin/main"]);
      return { repo, sync: "merged", head: git(deps, clone, ["rev-parse", "HEAD"]).trim() };
    } catch (error) {
      const files = conflicts(deps, clone);
      if (!files.length) throw error;
      return { repo, sync: "conflict", files };
    }
  });
  const conflicted = rows.filter((r) => r.sync === "conflict");
  if (!conflicted.length && rows.some((r) => r.sync === "merged" || r.sync === "fast-forward")) up(epic, [], deps);
  return { epic, clones: rows, conflicts: conflicted.map((r) => r.repo) };
}

// Each clone on the epic's branch ahead of GitHub's, or not there yet, pushed with gh's credential
// helper, as the orchestrator's own git takes it. A clone on another branch stops it before any push; main is never pushed.
export function push(named, deps, only = null) {
  const { epic, dir } = epicOf(deps, named);
  const repos = only ?? clonesOf(dir);
  for (const repo of repos) {
    const branch = git(deps, path.join(dir, repo), ["branch", "--show-current"]).trim();
    if (branch !== epic) throw new Error(`${repo} is on ${branch || "a detached HEAD"}, not on the epic's branch ${epic}`);
  }
  return repos.map((repo) => {
    const clone = path.join(dir, repo);
    const remote = git(deps, clone, ["ls-remote", "--heads", "origin", epic]).trim().split(/\s+/)[0] || null;
    const head = git(deps, clone, ["rev-parse", "HEAD"]).trim();
    if (remote === head) return { repo, push: "up to date", head };
    git(deps, clone, [...PUSH, "push", "--quiet", "--set-upstream", "origin", `${epic}:${epic}`]);
    return { repo, push: remote ? "pushed" : "new", head };
  });
}

// A command in a container, its output to a log of the stand, by docker exec in the background:
// recipes of different repositories run at once. Its exit status, or "timeout". coreutils' timeout
// ends it inside the container, with all it started, since a signal to docker exec here would
// leave the recipe running there; the timer here only outlasts it.
function execTo(deps, id, workdir, env, script, args, log, timeout) {
  const program = deps.dockerProgram ?? DOCKER;
  const vars = Object.entries(env).flatMap(([k, v]) => ["--env", `${k}=${v}`]);
  const seconds = Math.max(1, Math.ceil(timeout / 1000));
  const argv = ["exec", "--user", "vscode", "--workdir", workdir, ...vars, id, "bash", "-lc", `LOG=$2; timeout --kill-after=30 ${seconds} bash -c ${shellQuote(script)} bash "$@" > "$LOG" 2>&1`, "bash", ...args];
  return new Promise((resolve) => {
    const child = spawn(program, argv, { env: deps.env ?? process.env, stdio: "ignore" });
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolve("timeout");
    }, timeout + 60_000);
    child.on("exit", (code) => {
      clearTimeout(timer);
      resolve(code === 124 || code === 137 ? "timeout" : code);
    });
    child.on("error", () => {
      clearTimeout(timer);
      resolve(127);
    });
  }).then((status) => ({ status, log }));
}

const shellQuote = (text) => `'${text.replaceAll("'", "'\\''")}'`;

// A recipe's log, without what just and go run add after the recipe's own last word.
const JUST_ERROR = /^error: recipe `[^`]+` failed( on line \d+)? with exit code \d+$/i;
const logOf = (file) => {
  try {
    return fs.readFileSync(file, "utf8").trimEnd().split("\n").filter((l) => !JUST_ERROR.test(l) && !/^exit status \d+$/.test(l));
  } catch {
    return [];
  }
};

// A failure of ci-licenses under the wiring: go-licenses finds no LICENSE in a module go.work
// replaces with a clone — spec/contracts keeps spec's at the root — and nothing else. Without
// the wiring, at ship, the check runs on the modules of go.mod.
function onlyReplaced(lines, replaced) {
  // klog's warnings, as W1121 00:37:21 library.go:141], name a library too, and are no failure.
  const libraries = lines.filter((l) => /\blibrary\b/i.test(l) && !/^[IWEF]\d{4} /.test(l));
  return libraries.length > 0 && libraries.every((l) => {
    const found = /^Did not find license for library '([^']+)'\.?$/.exec(l)?.[1];
    return Boolean(found) && replaced.some((m) => found === m || found.startsWith(`${m}/`));
  });
}

// The modules a clone's go.work replaces with a clone of the epic.
function replacedOf(dir, repo) {
  try {
    return [...fs.readFileSync(path.join(dir, repo, "go.work"), "utf8").matchAll(/^[ \t]*(?:replace[ \t]+)?(\S+)[ \t]+=>[ \t]+\.\.\//gm)].map((m) => m[1]);
  } catch {
    return [];
  }
}

// Each submodule spec of the clones at the clone of spec's HEAD, in its working tree only: the
// gate checks with spec's rules, recipes and files of the epic, and pin commits the move. Once
// spec is pinned to its release, at the commit each clone's own link names, as its CI checks out.
function alignSubmodules(dir, repos, deps) {
  const head = git(deps, path.join(dir, "spec"), ["rev-parse", "HEAD"]).trim();
  const released = Boolean(pinnedOf(dir).spec);
  const aligned = [];
  for (const repo of repos.filter((r) => r !== "spec")) {
    const clone = path.join(dir, repo);
    const link = git(deps, clone, ["ls-files", "--stage", "--", "spec"]);
    if (!link.startsWith("160000 ")) continue;
    if (!fs.existsSync(path.join(clone, "spec", ".git"))) git(deps, clone, ["submodule", "update", "--init", "--quiet", "--", "spec"]);
    const sub = path.join(clone, "spec");
    const want = released ? link.split(/\s+/)[1] : head;
    if (git(deps, sub, ["rev-parse", "HEAD"]).trim() !== want) {
      if (released) git(deps, clone, ["submodule", "update", "--quiet", "--", "spec"]);
      else {
        git(deps, sub, ["fetch", "--quiet", path.join(dir, "spec"), "HEAD"]);
        git(deps, sub, ["checkout", "--quiet", "--detach", "FETCH_HEAD"]);
      }
    }
    aligned.push(repo);
  }
  return { head, aligned };
}

// spec's list of licenses, as Go's workflow gives ALLOWED_LICENSES, from the clone of spec.
function allowedLicenses(dir, deps) {
  const out = docker(deps, ["exec", "--user", "vscode", "--workdir", path.join(dir, "spec"), containerId("spec", deps), "bash", "-lc", "just licenses-allowed"]);
  return out.split("\n").map((l) => l.trim()).filter((l) => /^[\w.+-]+$/.test(l)).join(",");
}

// The guards a repository's gate passes by: only while its clone has a go.work. A wired Go clone's
// ci-licenses is one too, by onlyReplaced.
function guardsOf(dir, repo) {
  if (!fs.existsSync(path.join(dir, repo, "go.work"))) return null;
  return GUARDS[repo] ?? [];
}

// The gate of one repository: its recipes one after another in its container, then patchcov.
async function gateOne(dir, repo, deps, { licenses }) {
  const clone = path.join(dir, repo);
  const recipes = GATES[repo];
  const id = containerId(repo, deps);
  const wired = guardsOf(dir, repo);
  const guards = wired ?? [];
  const skipped = guards.filter((g) => g.kind === "test").map((g) => g.name);
  const head = git(deps, clone, ["rev-parse", "HEAD"]).trim();
  const results = [];
  for (const recipe of recipes) {
    const env = {};
    if (GO.includes(recipe) && repo !== "spec") env.ALLOWED_LICENSES = licenses;
    if (recipe === "ci-test" && skipped.length) env.GOFLAGS = `-skip=^(${skipped.join("|")})$`;
    const log = path.join(dir, STAND, `gate-${repo}-${recipe}-${stamp(deps.now())}.log`);
    const { status } = await execTo(deps, id, clone, env, 'just "$1"', [recipe, log], log, deps.recipeMs ?? RECIPE_MS);
    const row = { recipe, status: status === 0 ? "passed" : status === "timeout" ? "timeout" : "failed", log };
    if (row.status === "failed") {
      const lines = logOf(log);
      const guard = guards.find((g) => g.kind === recipe && g.pattern.test(lines.at(-1) ?? ""));
      if (guard) row.status = `allowed: ${guard.name}`;
      else if (recipe === "ci-licenses" && wired && onlyReplaced(lines, replacedOf(dir, repo))) row.status = "allowed: just ci-licenses: the modules go.work replaces";
    }
    results.push(row);
  }
  let patchcov = null;
  if (fs.existsSync(path.join(clone, ".github", "codecov.yml"))) {
    const log = path.join(dir, STAND, `gate-${repo}-patchcov-${stamp(deps.now())}.log`);
    const { status } = await execTo(deps, id, clone, {}, 'node "$1"', [path.join(dir, "spec", "tools", "patchcov", "main.mjs"), log], log, deps.recipeMs ?? RECIPE_MS);
    let measured = null;
    try {
      measured = JSON.parse(fs.readFileSync(log, "utf8").split("\n").find((l) => l.startsWith("{")) ?? "null");
    } catch {
      // no JSON: the log says why
    }
    patchcov = { status: status === 0 ? "passed" : "failed", log, ...(measured ? { coverage: measured.coverage, target: measured.target, hits: measured.hits, misses: measured.misses, partials: measured.partials, files: measured.files.filter((f) => f.misses.length || f.partials.length) } : {}) };
  }
  const pass = results.every((r) => r.status === "passed" || r.status.startsWith("allowed")) && (patchcov === null || patchcov.status === "passed");
  return { repo, head, spec: git(deps, path.join(dir, "spec"), ["rev-parse", "HEAD"]).trim(), pass, wired: Boolean(wired), skipped, recipes: results, patchcov };
}

// The gate: the repositories named, or those the epic changed, each clean, their submodules spec at
// the clone of spec; each repository's recipes in its own container, all repositories at once.
// Its record is .stand/gate.json, each repository's result by the head it checked.
export async function gate(named, repos, deps) {
  for (const repo of repos) checkRepo(repo);
  const { epic, dir } = epicOf(deps, named);
  const all = touchedOf(dir, deps, repos);
  if (!all.length) throw new Error("no clone has commits beyond main: nothing to gate");
  // A repository with no known gate, as infra, is checked by its pull request alone.
  const unchecked = all.filter((r) => !GATES[r]);
  const touched = all.filter((r) => GATES[r]);
  for (const repo of touched) {
    const changed = git(deps, path.join(dir, repo), ["status", "--porcelain", "--ignore-submodules=all"]).trim();
    if (changed) throw new Error(`${repo} has changes not committed: the gate checks commits, as CI does`);
  }
  const submodules = alignSubmodules(dir, clonesOf(dir), deps);
  const licenses = touched.some((r) => r !== "spec" && GATES[r]?.includes("ci-licenses")) ? allowedLicenses(dir, deps) : "";
  const results = await Promise.all(touched.map((repo) => gateOne(dir, repo, deps, { licenses })));
  const file = path.join(dir, STAND, "gate.json");
  let record = {};
  try {
    record = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    // the first gate of the epic
  }
  record = { epic, spec: submodules.head, repos: { ...record.repos, ...Object.fromEntries(results.map((r) => [r.repo, { ...r, at: deps.now().toISOString() }])) } };
  fs.writeFileSync(file, `${JSON.stringify(record, null, 1)}\n`);
  return { epic, pass: results.every((r) => r.pass), submodules: submodules.aligned, repos: results, unchecked: unchecked.map((repo) => ({ repo, why: "no gate is known: its CI is read by hand, then by its pull request" })) };
}

// Whether the last gate passed the clone at its head now, with spec's clone where it was.
export function gatedAt(dir, repo, deps) {
  let record;
  try {
    record = JSON.parse(fs.readFileSync(path.join(dir, STAND, "gate.json"), "utf8")).repos?.[repo];
  } catch {
    return false;
  }
  return Boolean(record?.pass) && record.head === git(deps, path.join(dir, repo), ["rev-parse", "HEAD"]).trim() && record.spec === git(deps, path.join(dir, "spec"), ["rev-parse", "HEAD"]).trim();
}
