// xrepo: a task across repositories (R166). Its clones are /workspaces/.epics/<epic>/<repo>, the
// same path in every NovaTrail container, on the branch named for the epic, built against one
// spec — its clone there — with the wiring kept out of git: a go.work that replaces spec, its
// contracts and the neighbouring clones by their go.mod, and spec's npm packages packed from that
// clone's working tree over node_modules, package.json and the lock file unchanged. The stand is
// stand.mjs.
//
// git runs here, in the orchestrator's container, where gh pushes, and every container can write
// a clone's .git/config: xrepo's own git runs with no hooks and no fsmonitor, which run on every
// status. What else a clone's configuration may name is the risk R166 accepts: every container
// writes ~/.claude, which holds the orchestrator's own clone of spec. spec's packages are packed in
// spec's documents container and unpacked in each consumer's, neither of which holds the socket.

import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DOCKER, git as runGit } from "../shared.mjs";
import { ensureRunning, findContainer, placeOf, REPOSITORY, runDocker } from "./containers.mjs";
import { ORGANIZATION } from "./devcontainers.mjs";
import { GIT_ENV } from "./runs.mjs";
import { PORTS, readConfig, readPid, readState, SERVERS, STAND, stamp, stopServer } from "./stand.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

// The host's folder .epics, as every container mounts it (R166).
export const EPICS = "/workspaces/.epics";
export const EPIC = /^[a-z0-9][a-z0-9-]*$/;
const SAFE = ["-c", "core.hooksPath=/dev/null", "-c", "core.fsmonitor=false"];
const MODULE = "github.com/altnovatrail/";
// spec's npm packages, by the folder of node_modules/@altnovatrail/ they take.
export const PACKAGES = { "@altnovatrail/spec": "spec", "@altnovatrail/contracts": "contracts" };
// The tests that open browsers, which wait for the gate: the quick checks leave them out.
export const BROWSER_TESTS = { app: ["scripts/site.test.ts", "scripts/page.test.ts"] };
const INSTALL_MS = 30 * 60_000;
const TEST_MS = 60 * 60_000;
// How long serve waits for the stand: canvas's build and the probe, each up to stand.mjs's 15
// minutes, and five more. Then it stops the stand.
const SERVE_MS = 35 * 60_000;
// How long stop waits for the stand's process to stop its servers, each up to 30 seconds after
// SIGINT and 10 after SIGKILL, before it kills the process and stops what is left itself.
const STAND_WAIT_S = 4 * 40 + 10;

// ci-lint's check of the pin of spec, by the last line it prints when it fails: its last step, so
// that every step before it passed.
const SPEC_PIN = /^ci-lint: the submodule spec\/ is at .*; move them to one tag together \(R64 spec; R\d+\)$/;

// The guards of pins that fail under the wiring, by repository: each reads the version of a module
// that the go.work replaces. Only these may fail at the gate, and only while the clone has a
// go.work (R166): a test is skipped, by -skip in GOFLAGS of ci-test, so that ci-test still writes
// its profile; the check of ci-lint is a failure allowed by its message.
const SPEC_PIN_GUARD = { kind: "ci-lint", name: "just ci-lint: the pin of spec", why: "go list -m names the replaced modules, not the submodule's tag", pattern: SPEC_PIN };
const testGuard = (name, why) => ({ kind: "test", name, why });
export const GUARDS = {
  tutor: [
    testGuard("TestSpecVersion", "spec and its contracts are replaced by the clone, not at the tag CLAUDE.md names"),
    testGuard("TestReadingLogOfTheStub", "module-kit replaced reports v0.0.0 in the golden log"),
    testGuard("TestAdmitExamples", "spec's examples are read from the module cache, which the replace bypasses"),
    testGuard("TestMeasuresOfSpecExamples", "spec's examples are read from the module cache, which the replace bypasses"),
    testGuard("TestExamplesFollowTheRules", "spec's examples of the eval protocol are read from the module cache, which the replace bypasses"),
    testGuard("TestExamplesReadBack", "spec's examples of the eval protocol are read from the module cache, which the replace bypasses"),
    testGuard("TestExamples", "spec's examples are read from the module cache, which the replace bypasses; -skip names no package, so admission's and protocoltest's TestExamples are skipped too"),
  ],
  api: [
    testGuard("TestTheVersionOfModuleKitIsTheOneGoModPins", "module-kit replaced is (devel)"),
    testGuard("TestSpecAndItsContractsAreAtOneTag", "a dependency is replaced"),
    SPEC_PIN_GUARD,
  ],
  "module-kit": [SPEC_PIN_GUARD],
};

// Packs spec's npm packages from the clone $1's working tree into a folder of $2 named by the
// tree's fingerprint, once for each fingerprint, in spec's container; prints the fingerprint. With
// $3 "print", only the fingerprint. The version is the one the clone's next release would take,
// or its own release's, since the version decides which lines a package holds. No `exit`: in a
// login bash it runs ~/.bash_logout, whose last status becomes the script's.
export const PACK = [
  "set -euo pipefail",
  'spec=$1; out=$2; mode=${3:-pack}',
  'cd "$spec"',
  "print=$( { git -c core.fsmonitor=false rev-parse HEAD; git -c core.fsmonitor=false diff HEAD --binary --no-ext-diff --no-textconv; git -c core.fsmonitor=false ls-files --others --exclude-standard -z | xargs -0r sha256sum; } | sha256sum | cut -c1-16)",
  'dir=$out/$print',
  'if [ "$mode" != print ] && [ ! -f "$dir/done" ]; then',
  '  rm -rf "$dir"; mkdir -p "$dir"',
  "  version=$( { git tag --list 'v*'; echo --; git tag --merged HEAD --list 'v*'; echo --; git tag --points-at HEAD --list 'v*'; } | env -u RELEASE_LINE node tools/release/version.mjs | sed -n 's/^version=//p; s/^released=//p' | grep -m1 . || true)",
  '  [ -n "$version" ] || { echo "spec: no version for the clone\'s packages: its HEAD is behind the newest release" >&2; false; }',
  '  node tools/types/npm.mjs . "${version#v}" "$dir" > /dev/null',
  '  node tools/contracts/npm.mjs . "${version#v}" "$dir" > /dev/null',
  '  touch "$dir/done"',
  "fi",
  'echo "$print"',
].join("\n");

// Unpacks the archive $2 as the package folder $1 and marks it with the fingerprint $3.
export const UNPACK = 'rm -rf "$1" && mkdir -p "$1" && tar -xzf "$2" --strip-components=1 -C "$1" && printf "%s\\n" "$3" > "$1/.xrepo"';

// Pulls the host's clone in its own container, only on a clean main.
export const PULL = [
  'b=$(git branch --show-current)',
  '[ "$b" = main ] || { echo "skipped: on ${b:-a detached HEAD}"; exit 0; }',
  '[ -z "$(git status --porcelain)" ] || { echo "skipped: changed"; exit 0; }',
  'git pull --ff-only --quiet && echo pulled',
].join("\n");

export const git = (deps, dir, args) => (deps.git ?? runGit)(dir, [...SAFE, ...args]);
export const docker = (deps, args, options = {}) => (deps.dockerRun ?? ((a, o) => runDocker(a, { program: deps.dockerProgram ?? DOCKER, env: deps.env ?? process.env, ...o })))(args, options);

function rootOf(deps) {
  return deps.epics ?? EPICS;
}

function checkEpic(epic) {
  if (!EPIC.test(epic)) throw new Error(`not an epic's name: ${epic}`);
}

export function checkRepo(repo) {
  if (!REPOSITORY.test(repo) || /^\.+$/.test(repo)) throw new Error(`not a repository's name: ${repo}`);
}

// The epic's folder: the one named, or the only one in .epics.
export function epicOf(deps, named = null) {
  const root = rootOf(deps);
  if (named !== null) {
    checkEpic(named);
    const dir = path.join(root, named);
    if (!fs.existsSync(dir)) throw new Error(`no epic ${named} in ${root}: xrepo up first`);
    return { epic: named, dir };
  }
  const found = fs.existsSync(root) ? fs.readdirSync(root).filter((d) => EPIC.test(d) && fs.statSync(path.join(root, d)).isDirectory()) : [];
  if (found.length !== 1) throw new Error(`${found.length} epics in ${root}${found.length ? `: ${found.join(", ")}` : ""}; name one with --epic`);
  return { epic: found[0], dir: path.join(root, found[0]) };
}

// The clones of the epic's folder, spec first.
export function clonesOf(dir) {
  return fs
    .readdirSync(dir)
    .filter((d) => REPOSITORY.test(d) && fs.existsSync(path.join(dir, d, ".git")))
    .sort((a, b) => (a === "spec" ? -1 : b === "spec" ? 1 : a.localeCompare(b)));
}

export function containerId(repo, deps) {
  const run = (args) => docker(deps, args);
  return ensureRunning(findContainer(repo, { docker: run, hostname: deps.hostname }), { docker: run, sleep: deps.sleep }).Id;
}

// The clone of a repository on the epic's branch: GitHub's where the epic has pushed it, else a new
// one from main, which nothing pushes until the change is made. A clone already there is kept.
function cloneOf(dir, repo, epic, deps) {
  const clone = path.join(dir, repo);
  if (fs.existsSync(path.join(clone, ".git"))) return { repo, path: clone, branch: git(deps, clone, ["branch", "--show-current"]).trim(), from: "kept" };
  const url = `${deps.organization ?? ORGANIZATION}/${repo}.git`;
  git(deps, dir, ["clone", "--quiet", "--recurse-submodules", url, clone]);
  const remote = git(deps, clone, ["ls-remote", "--heads", "origin", epic]).trim();
  if (remote) {
    git(deps, clone, ["switch", "--quiet", "--track", `origin/${epic}`]);
    git(deps, clone, ["submodule", "update", "--init", "--recursive", "--quiet"]);
  } else {
    git(deps, clone, ["switch", "--quiet", "--create", epic]);
  }
  return { repo, path: clone, branch: epic, from: remote ? "origin" : "main" };
}

const goVersion = (text) => /^go\s+(\d+(?:\.\d+)*)\s*$/m.exec(text)?.[1] ?? null;
const newer = (a, b) => {
  const [x, y] = [a, b].map((v) => v.split(".").map(Number));
  for (let i = 0; i < Math.max(x.length, y.length); i += 1) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0) ? a : b;
  return a;
};

// The go.work of a Go clone: `use .`, and a replace for each module of NovaTrail its go.mod
// requires whose repository has a clone in the epic — spec's always — and is not in skip, the go line the newest of
// theirs, which Go asks of a workspace. None when it requires none. The text, or null.
export function goWorkOf(dir, repo, skip = new Set()) {
  let mod;
  try {
    mod = fs.readFileSync(path.join(dir, repo, "go.mod"), "utf8");
  } catch {
    return null;
  }
  const replaces = [];
  let version = goVersion(mod);
  for (const [, module] of mod.matchAll(/^\s*(?:require\s+)?(github\.com\/altnovatrail\/\S+)\s+v\S+/gm)) {
    const [target, ...sub] = module.slice(MODULE.length).split("/");
    if (target === repo || skip.has(target) || !REPOSITORY.test(target) || !fs.existsSync(path.join(dir, target, ".git"))) continue;
    const folder = ["..", target, ...sub].join("/");
    let theirs = null;
    try {
      theirs = goVersion(fs.readFileSync(path.join(dir, target, ...sub, "go.mod"), "utf8"));
    } catch {
      continue;
    }
    if (theirs && version) version = newer(version, theirs);
    replaces.push(`replace ${module} => ${folder}`);
  }
  if (!replaces.length || !version) return null;
  return `go ${version}\n\nuse .\n\n${[...new Set(replaces)].join("\n")}\n`;
}

// Keeps names out of git by the clone's own .git/info/exclude, which no pull request carries.
export function exclude(clone, names) {
  const file = path.join(clone, ".git", "info", "exclude");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  const have = new Set(text.split("\n").map((l) => l.trim()));
  const add = names.filter((n) => !have.has(`/${n}`));
  if (add.length) fs.writeFileSync(file, `${text}${text && !text.endsWith("\n") ? "\n" : ""}${add.map((n) => `/${n}`).join("\n")}\n`);
}

// Writes the clone's go.work, without the repositories already pinned to their release, or removes
// it when nothing is left to replace.
export function wireGo(dir, repo, skip = new Set(Object.keys(pinnedOf(dir)))) {
  const clone = path.join(dir, repo);
  const text = goWorkOf(dir, repo, skip);
  if (!text) {
    for (const f of ["go.work", "go.work.sum"]) fs.rmSync(path.join(clone, f), { force: true });
    return null;
  }
  fs.writeFileSync(path.join(clone, "go.work"), text);
  exclude(clone, ["go.work", "go.work.sum"]);
  return text.split("\n").filter((l) => l.startsWith("replace ")).map((l) => l.slice("replace ".length));
}

// The repositories ship has pinned their dependents to, by the release: .stand/pinned.json.
export function pinnedOf(dir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, STAND, "pinned.json"), "utf8"));
  } catch {
    return {};
  }
}

// spec's packages a clone's package.json names, by the folder each takes.
export function packagesOf(clone) {
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(path.join(clone, "package.json"), "utf8"));
  } catch {
    return [];
  }
  const named = { ...manifest.dependencies, ...manifest.devDependencies };
  return Object.keys(PACKAGES).filter((name) => Object.hasOwn(named, name));
}

export const markOf = (clone, name) => {
  try {
    return fs.readFileSync(path.join(clone, "node_modules", name, ".xrepo"), "utf8").trim();
  } catch {
    return null;
  }
};

// The fingerprint of spec's clone, and its packages packed by it, in spec's container.
export function packSpec(dir, deps, mode = "pack") {
  const out = path.join(dir, STAND, "packages");
  fs.mkdirSync(out, { recursive: true });
  const print = docker(deps, ["exec", "--user", "vscode", "--workdir", path.join(dir, "spec"), containerId("spec", deps), "bash", "-lc", PACK, "bash", path.join(dir, "spec"), out, mode], { timeout: INSTALL_MS }).trim().split("\n").at(-1);
  if (!/^[0-9a-f]{16}$/.test(print ?? "")) throw new Error(`spec's packing printed no fingerprint`);
  return { print, folder: path.join(out, print) };
}

// Installs a consumer by its own recipe, which runs npm ci only when package.json or the lock
// file changed, then lays spec's packages over node_modules where their mark is not the clone's
// fingerprint now. The consumers' wiring, by repository.
export function wireNpm(dir, repos, deps, { install = true } = {}) {
  // Once ship has pinned the dependents to spec's release, their packages are the registry's.
  if (pinnedOf(dir).spec) return {};
  const consumers = repos.filter((r) => r !== "spec").map((repo) => ({ repo, names: packagesOf(path.join(dir, repo)) })).filter((c) => c.names.length);
  if (!consumers.length) return {};
  const { print, folder } = packSpec(dir, deps);
  const archives = fs.readdirSync(folder);
  const wired = {};
  for (const { repo, names } of consumers) {
    const clone = path.join(dir, repo);
    const id = containerId(repo, deps);
    if (install) {
      const log = path.join(dir, STAND, `${repo}-install-${stamp(deps.now())}.log`);
      try {
        docker(deps, ["exec", "--user", "vscode", "--workdir", clone, id, "bash", "-lc", 'just _install >> "$1" 2>&1', "bash", log], { timeout: INSTALL_MS });
      } catch (error) {
        // docker's time-out ends the client here, not npm in the container.
        throw new Error(`${repo}: just _install ${/no end in/.test(error.message) ? `ran past ${INSTALL_MS / 60_000} minutes and may still run in its container: wait for it before another up` : "failed"}; its log is ${log}`);
      }
    }
    for (const name of names) {
      if (markOf(clone, name) === print) continue;
      const archive = archives.find((f) => f.startsWith(`altnovatrail-${PACKAGES[name]}-`) && f.endsWith(".tgz"));
      if (!archive) throw new Error(`spec's packing made no archive of ${name}`);
      docker(deps, ["exec", "--user", "vscode", "--workdir", clone, id, "bash", "-c", UNPACK, "bash", path.join(clone, "node_modules", name), path.join(folder, archive), print]);
    }
    wired[repo] = { packages: names, spec: print };
  }
  return wired;
}

// app's local deployment configuration, kept out of git, from the host's clone.
function deploymentOf(dir, deps) {
  const clone = path.join(dir, "app");
  if (fs.existsSync(path.join(clone, "deployment.local.json"))) return "present";
  const run = (args) => docker(deps, args);
  const container = ensureRunning(findContainer("app", { docker: run, hostname: deps.hostname }), { docker: run, sleep: deps.sleep });
  const host = path.posix.join(placeOf(container).workdir, "deployment.local.json");
  docker(deps, ["exec", "--user", "vscode", container.Id, "bash", "-c", '[ ! -f "$1" ] || cp -n "$1" "$2"', "bash", host, clone]);
  return fs.existsSync(path.join(clone, "deployment.local.json")) ? "copied" : "missing";
}

function writeWorkspace(dir, epic, repos) {
  const file = path.join(dir, `${epic}.code-workspace`);
  fs.writeFileSync(file, `${JSON.stringify({ folders: repos.map((r) => ({ path: r })), settings: {} }, null, 2)}\n`);
  return file;
}

// The folder's README: what is here and how to drive it. xrepo writes it anew on each up; the
// session's notes go to notes.md beside it.
export function readmeOf(epic, rows) {
  const lines = [
    `# ${epic}: a task across repositories`,
    "",
    `The clones of the task, on the branch \`${epic}\` (R166 spec). \`xrepo up\` writes this file anew each time; notes of the task go to \`notes.md\` beside it, and \`xrepo down\` keeps both in \`~/.claude/novatrail-orchestrator/epics/${epic}/\`.`,
    "",
    "| Clone | Branch from | Go: replaced | npm: spec's packages |",
    "|---|---|---|---|",
    ...rows.map((r) => `| ${r.repo} | ${r.from} | ${r.go ? r.go.map((g) => `\`${g}\``).join("<br>") : "—"} | ${r.npm ? r.npm.packages.map((p) => `\`${p}\``).join(", ") : "—"} |`),
    "",
    "The wiring is out of git: `go.work` and `go.work.sum` by `.git/info/exclude`, the packages inside `node_modules`. `package.json`, the lock files and the `spec` submodules are unchanged, and the gate aligns the submodules.",
    "",
    "## Guards of pins that fail under the wiring",
    "",
    "Only these may fail at the gate, and only while the clone has its `go.work` (R166 spec): a test is skipped by `-skip` in `GOFLAGS` of `ci-test`, which then still writes its profile; a check of `ci-lint` fails, its message the one allowed.",
    "",
    "| Repository | Guard | At the gate | Why |",
    "|---|---|---|---|",
    ...rows.filter((r) => r.go && GUARDS[r.repo]).flatMap((r) => GUARDS[r.repo].map((g) => `| ${r.repo} | \`${g.name}\` | ${g.kind === "test" ? "skipped" : "allowed to fail"} | ${g.why} |`)),
    ...rows.filter((r) => r.go && r.repo !== "spec").map((r) => `| ${r.repo} | \`just ci-licenses\` | allowed to fail, only on libraries of the modules go.work replaces | go-licenses finds no LICENSE in a replaced module, as spec/contracts, whose LICENSE is at spec's root |`),
    "",
    "## Commands",
    "",
    "`xrepo` is `just orchestrator xrepo` in spec's working tree, or `node ~/.claude/novatrail-orchestrator/spec/tools/orchestrator/main.mjs xrepo` (tools/orchestrator/README.md spec):",
    "",
    `- \`xrepo up ${epic} <repos…>\` — more clones, and the wiring renewed;`,
    "- `xrepo status`; `xrepo test <repo> [targets…]` — the quick checks in the repository's container;",
    "- `xrepo serve [--ai] [--limit <usd>] [--mockup]` — the stand on http://127.0.0.1:5173, forwarded by the orchestrator's window; `xrepo stop`;",
    "- `xrepo sync` — `main` into the epic's branch of each clone, by a merge commit; `xrepo push` — each clone's branch to GitHub;",
    "- `xrepo gate [<repo>…]` — the full CI of each touched repository in its container, then `patchcov`; `.stand/gate.json`;",
    "- after the author's «да»: `xrepo ship` — the pull requests one at a time, `spec` first, each merged on green checks, its release awaited and its dependents pinned to it; `xrepo pin <repo> [<tag>]` and `xrepo wait-release <repo> <tag>` are its steps;",
    "- `xrepo down` — the end of the task.",
    "",
  ];
  return lines.join("\n");
}

// Makes or renews the epic's clones, their wiring and the folder's files.
export function up(epic, repos, deps) {
  checkEpic(epic);
  for (const repo of repos) checkRepo(repo);
  const dir = path.join(rootOf(deps), epic);
  fs.mkdirSync(path.join(dir, STAND), { recursive: true });
  const made = new Map([...new Set(["spec", ...repos])].map((repo) => [repo, cloneOf(dir, repo, epic, deps)]));
  const all = clonesOf(dir);
  const rows = all.map((repo) => ({ ...(made.get(repo) ?? cloneOf(dir, repo, epic, deps)), go: wireGo(dir, repo) }));
  const npm = wireNpm(dir, all, deps);
  for (const row of rows) {
    row.npm = npm[row.repo] ?? null;
    if (row.repo === "app") row.deployment = deploymentOf(dir, deps);
  }
  writeWorkspace(dir, epic, all);
  fs.writeFileSync(path.join(dir, "README.md"), readmeOf(epic, rows));
  return rows;
}

const lines = (text) => text.split("\n").filter(Boolean);

// Where each clone and the stand stand.
export function status(named, deps) {
  const { epic, dir } = epicOf(deps, named);
  const all = clonesOf(dir);
  const consumers = all.filter((r) => r !== "spec" && packagesOf(path.join(dir, r)).length);
  const print = consumers.length ? packSpec(dir, deps, "print").print : null;
  const rows = all.map((repo) => {
    const clone = path.join(dir, repo);
    let ahead = null;
    let behind = null;
    try {
      [behind, ahead] = git(deps, clone, ["rev-list", "--left-right", "--count", `refs/remotes/origin/${epic}...HEAD`]).trim().split(/\s+/).map(Number);
    } catch {
      // The branch is not on GitHub yet.
    }
    let submodule = null;
    try {
      submodule = git(deps, clone, ["ls-tree", "HEAD", "spec"]).split(/\s+/)[2] ?? null;
    } catch {
      // No submodule spec.
    }
    const npm = Object.fromEntries(packagesOf(clone).map((name) => [name, markOf(clone, name) === print ? "fresh" : markOf(clone, name) ? "stale" : "none"]));
    return { repo, branch: git(deps, clone, ["branch", "--show-current"]).trim(), ahead, behind, changed: lines(git(deps, clone, ["status", "--porcelain"])).length, spec_submodule: submodule, go_work: fs.existsSync(path.join(clone, "go.work")), npm: Object.keys(npm).length ? npm : null };
  });
  return { epic, clones: rows, stand: standOf(dir) };
}

// The stand's state, and whether its process lives.
function standOf(dir) {
  const state = readState(path.join(dir, STAND));
  if (!state) return null;
  return { ...state, alive: livesHere(readPid(path.join(dir, STAND, "stand.pid"))) };
}

// The time of start of a process here, or null when there is none or it is a zombie.
function startHere(pid) {
  try {
    const fields = fs.readFileSync(`/proc/${pid}/stat`, "utf8").split(") ").at(-1).split(" ");
    return fields[0] === "Z" ? null : Number(fields[19]);
  } catch {
    return null;
  }
}

const livesHere = (record) => Boolean(record) && startHere(record.pid) === record.start;

// A command of the quick checks of a repository in its container, and its arguments.
export function quickCheckOf(dir, repo, targets) {
  const clone = path.join(dir, repo);
  if (repo === "spec") return targets.length ? { script: 'just _tools && exec node --test "$@"', args: targets } : { script: "exec just docs-check", args: [] };
  if (fs.existsSync(path.join(clone, "go.mod"))) return { script: 'exec go test -count=1 "$@"', args: targets.length ? targets : ["./..."] };
  if (fs.existsSync(path.join(clone, "package.json"))) {
    const excluded = (BROWSER_TESTS[repo] ?? []).flatMap((f) => ["--exclude", f]);
    return { script: 'exec node_modules/.bin/vitest run --project node "$@"', args: [...excluded, ...targets], npm: true };
  }
  throw new Error(`${repo}: neither go.mod nor package.json, and no quick check is known`);
}

// The quick checks of a repository in its container (R156), its output as it goes: Go's tests,
// Vitest's project node without the browsers, spec's docs-check or tests. A target is a package,
// a folder or a file, never an option: a session of Claude Code writes the command line, and go
// test's -exec would run a program.
export function test(repo, targets, named, deps) {
  checkRepo(repo);
  for (const t of targets) if (!/^(?!-)[\w./@:=+-]+$/.test(t)) throw new Error(`not a package, folder or file: ${t}`);
  const { dir } = epicOf(deps, named);
  if (!fs.existsSync(path.join(dir, repo, ".git"))) throw new Error(`${repo} has no clone in ${dir}`);
  const check = quickCheckOf(dir, repo, targets);
  if (check.npm) wireNpm(dir, [repo], deps);
  const program = deps.dockerProgram ?? DOCKER;
  const args = ["exec", "--user", "vscode", "--workdir", path.join(dir, repo), containerId(repo, deps), "bash", "-lc", check.script, "bash", ...check.args];
  const result = (deps.spawnSync ?? spawnSync)(program, args, { env: deps.env ?? process.env, stdio: deps.inherit === false ? "pipe" : ["ignore", "inherit", "inherit"], encoding: "utf8", timeout: TEST_MS, maxBuffer: 256 * 1024 * 1024 });
  if (result.error) throw new Error(`${repo}: ${result.error.code === "ETIMEDOUT" ? `no end in ${TEST_MS / 60_000} minutes` : result.error.message}`);
  return { repo, status: result.status, output: deps.inherit === false ? `${result.stdout}${result.stderr}` : null };
}

// Starts the stand as a process of its own and returns once its probe has passed or it failed. A
// stand that runs is stopped first, and so is what its servers left.
export async function serve({ named = null, ai = false, limit = null, mockup = false }, deps) {
  const { epic, dir } = epicOf(deps, named);
  await stop(epic, deps);
  for (const repo of ["api", "app"]) if (!fs.existsSync(path.join(dir, repo, ".git"))) throw new Error(`the stand needs a clone of ${repo}: xrepo up ${epic} ${repo}`);
  if (deploymentOf(dir, deps) === "missing") throw new Error("app has no deployment.local.json, in its clone or in the host's: copy deployment.example.json there and fill it in (app's docs/README.md)");
  wireNpm(dir, clonesOf(dir), deps);
  const stand = path.join(dir, STAND);
  fs.writeFileSync(path.join(stand, "stand.json"), `${JSON.stringify({ ai, mockup, limit_usd: limit ?? undefined, ports: deps.ports ?? PORTS }, null, 1)}\n`);
  fs.rmSync(path.join(stand, "state.json"), { force: true });
  const log = path.join(stand, `stand-${stamp(deps.now())}.log`);
  const fd = fs.openSync(log, "a");
  const program = deps.dockerProgram ?? DOCKER;
  const own = [...(program === DOCKER ? [] : ["--docker", program]), ...(deps.hostname && deps.hostname !== os.hostname() ? ["--hostname", deps.hostname] : [])];
  const child = spawn(process.execPath, [path.join(HERE, "stand.mjs"), dir, ...own], { env: deps.env ?? process.env, detached: true, stdio: ["ignore", fd, fd] });
  fs.closeSync(fd);
  child.unref();
  const start = startHere(child.pid);
  fs.writeFileSync(path.join(stand, "stand.pid"), `${child.pid}:${start}\n`);
  const deadline = deps.now().getTime() + (deps.serveMs ?? SERVE_MS);
  const pause = () => new Promise((resolve) => setTimeout(resolve, deps.interval ?? 1000));
  for (;;) {
    const state = readState(stand);
    if (state?.pid === child.pid && ["ready", "failed", "over-limit"].includes(state.phase)) {
      if (state.phase === "ready") return { epic, ...state, url: `http://127.0.0.1:${readConfig(stand).ports.relay}`, log };
      // A stand that failed stops what it started, then ends: the error comes once it has.
      for (let i = 0; startHere(child.pid) === start && i < (deps.standWait ?? STAND_WAIT_S) * 2; i += 1) await new Promise((resolve) => setTimeout(resolve, 500));
      throw new Error(`the stand ${state.phase}: ${state.error}; its log is ${log}`);
    }
    if (startHere(child.pid) !== start) throw new Error(`the stand ended before it was ready; its log is ${log}`);
    if (deps.now().getTime() > deadline) {
      await stop(epic, deps);
      throw new Error(`the stand was not ready in ${(deps.serveMs ?? SERVE_MS) / 60_000} minutes, and is stopped; its log is ${log}`);
    }
    await pause();
  }
}

// Ends the stand: SIGTERM to its process, which stops its servers; then whatever servers a stand
// that died left, by their pid's files.
export async function stop(named, deps) {
  const { epic, dir } = epicOf(deps, named);
  const stand = path.join(dir, STAND);
  const record = readPid(path.join(stand, "stand.pid"));
  let ended = "none";
  if (livesHere(record)) {
    process.kill(record.pid, "SIGTERM");
    for (let i = 0; i < (deps.standWait ?? STAND_WAIT_S) * 2 && livesHere(record); i += 1) await new Promise((resolve) => setTimeout(resolve, 500));
    if (livesHere(record)) process.kill(record.pid, "SIGKILL");
    ended = "stopped";
  }
  fs.rmSync(path.join(stand, "stand.pid"), { force: true });
  const left = [];
  for (const [name, repo] of Object.entries(SERVERS)) {
    const pidFile = path.join(stand, `${name}.pid`);
    const server = readPid(pidFile);
    if (!server) continue;
    const run = (args) => docker(deps, args);
    const how = await stopServer(run, containerId(repo, deps), server, { wait: deps.serverWait ?? 30, step: deps.stopStep ?? 1000 });
    if (how !== "gone") left.push({ server: name, ended: how });
    fs.rmSync(pidFile, { force: true });
  }
  const state = readState(stand);
  return { epic, stand: ended, left, spent_usd: state?.spent_usd ?? null, phase: state?.phase ?? null };
}

// The end of the task: the stand stopped; the folder's README and notes kept in the orchestrator's
// folder of the epic on the volume; each clone removed once all it holds is in main on GitHub,
// kept otherwise; the host's clones pulled where they are on a clean main.
export async function down(named, deps) {
  const { epic, dir } = epicOf(deps, named);
  const stopped = await stop(epic, deps);
  const keep = path.join(deps.home, "epics", epic);
  fs.mkdirSync(keep, { recursive: true });
  const kept = fs.readdirSync(dir).filter((f) => f === "README.md" || /^notes.*\.md$/.test(f));
  for (const f of kept) fs.copyFileSync(path.join(dir, f), path.join(keep, f));
  const all = clonesOf(dir);
  const clones = all.map((repo) => {
    const clone = path.join(dir, repo);
    git(deps, clone, ["fetch", "--quiet", "origin", "main"]);
    const changed = lines(git(deps, clone, ["status", "--porcelain"])).length;
    const stashed = lines(git(deps, clone, ["stash", "list"])).length;
    let merged = true;
    try {
      git(deps, clone, ["merge-base", "--is-ancestor", "HEAD", "FETCH_HEAD"]);
    } catch {
      merged = false;
    }
    if (changed || stashed || !merged) return { repo, removed: false, why: [changed && `${changed} changed`, stashed && `${stashed} stashed`, !merged && "commits not in main"].filter(Boolean).join(", ") };
    fs.rmSync(clone, { recursive: true, force: true });
    return { repo, removed: true };
  });
  if (clones.every((c) => c.removed)) fs.rmSync(dir, { recursive: true, force: true });
  const host = all.map((repo) => {
    try {
      const run = (args) => docker(deps, args);
      const container = ensureRunning(findContainer(repo, { docker: run, hostname: deps.hostname }), { docker: run, sleep: deps.sleep });
      const env = Object.entries(GIT_ENV).flatMap(([k, v]) => ["--env", `${k}=${v}`]);
      return { repo, pull: docker(deps, ["exec", "--user", "vscode", "--workdir", placeOf(container).workdir, ...env, container.Id, "bash", "-c", PULL]).trim() };
    } catch (error) {
      return { repo, pull: `skipped: ${error.message}` };
    }
  });
  return { epic, stopped, kept: kept.map((f) => path.join(keep, f)), clones, host };
}
