// xrepo's ship, after the author's «да»: the pull requests of the repositories the epic
// changed, one at a time in the order of their dependencies, spec first; each merged on green
// checks and SonarCloud's word, as the orchestrator merges an executor's pull request; its release
// awaited — GitHub's, npm's and the Go proxy's —, and the dependents pinned to it before their own
// pull request, then gated again without the wiring. Its state is .stand/ship.json, so that a ship
// stopped — by a red check, a conflict, the clock — goes on from where it stopped.

import fs from "node:fs";
import path from "node:path";
import { byCodeUnits } from "../shared.mjs";
import { STAND } from "./stand.mjs";
import { sync as syncOwn } from "./runs.mjs";
import { gate, gatedAt, GATES, push, touchedOf } from "./gate.mjs";
import { checkRepo, clonesOf, containerId, docker, epicOf, git, laidOf, pinnedOf, REQUIRED, wireGo } from "./xrepo.mjs";

const OWNER = "altnovatrail";
const MODULE = "github.com/altnovatrail/";
// The npm packages each repository releases, and the repository each package comes from.
export const NPM_OF = { spec: ["@altnovatrail/spec", "@altnovatrail/contracts"], canvas: ["@altnovatrail/canvas"], "skill-map": ["@altnovatrail/skill-map"] };
const REPO_OF = Object.fromEntries(Object.entries(NPM_OF).flatMap(([repo, names]) => names.map((n) => [n, repo])));
// A release's tag in its one form: no leading zero, no number past what JavaScript holds exactly.
const TAG = /^v(0|[1-9]\d{0,14})\.(0|[1-9]\d{0,14})\.(0|[1-9]\d{0,14})$/;
// The repositories whose releases ship waits for: each that has a gate, and infra.
const RELEASING = [...Object.keys(GATES), "infra"];
const MINUTE = 60_000;
// How long ship waits: for a release's files, for a pull request's checks, for a check posted late
// and for the runs of main to appear.
const RELEASE_MS = 45 * MINUTE;
const CHECKS_MS = 90 * MINUTE;
const LATE_MS = 10 * MINUTE;
const RUNS_MS = 10 * MINUTE;
// How long a head pushed reaches the pull request: GitHub names it a little after the push.
const HEAD_MS = 3 * MINUTE;
const MAIN_MS = 90 * MINUTE;

const pause = (deps) => new Promise((resolve) => setTimeout(resolve, deps.pollMs ?? MINUTE));
const gh = (deps, args) => deps.gh(args);
const json = (deps, args) => JSON.parse(gh(deps, args));

// A release's tag, written anew from its numbers: what goes into gh is never the command line's text.
function checkTag(tag) {
  const found = TAG.exec(tag);
  if (!found) throw new Error(`not a release's tag: ${tag}`);
  return `v${found.slice(1).map(Number).join(".")}`;
}

// The name as NovaTrail has it, not as the command line has it: only it goes into gh and git.
function releasingOf(asked) {
  const repo = RELEASING.find((r) => r === asked);
  if (repo === undefined) throw new Error(`not a repository of NovaTrail: ${asked}`);
  return repo;
}

const readText = (file) => {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
};

const readJson = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
};

const goMod = (clone) => {
  try {
    return fs.readFileSync(path.join(clone, "go.mod"), "utf8");
  } catch {
    return null;
  }
};

// The repositories of NovaTrail a clone depends on: by its go.mod, its package.json and its
// submodule spec.
export function dependsOn(dir, repo) {
  const clone = path.join(dir, repo);
  const on = new Set();
  for (const [, module] of (goMod(clone) ?? "").matchAll(REQUIRED)) on.add(module.slice(MODULE.length).split("/")[0]);
  const manifest = readJson(path.join(clone, "package.json")) ?? {};
  for (const name of Object.keys({ ...manifest.dependencies, ...manifest.devDependencies })) if (REPO_OF[name]) on.add(REPO_OF[name]);
  if (fs.existsSync(path.join(clone, ".gitmodules")) && /path\s*=\s*spec\s*$/m.test(fs.readFileSync(path.join(clone, ".gitmodules"), "utf8"))) on.add("spec");
  on.delete(repo);
  return on;
}

// The repositories in the order of their dependencies among themselves, spec first, each other in
// the order of its name once all it depends on is before it; infra last, the deployment.
export function orderOf(dir, repos) {
  const left = new Set(repos);
  const order = [];
  while (left.size) {
    const ready = [...left].filter((r) => r !== "infra" || left.size === 1).filter((r) => ![...dependsOn(dir, r)].some((d) => left.has(d) && d !== r));
    if (!ready.length) throw new Error(`the repositories depend on each other in a circle: ${[...left].join(", ")}`);
    const next = ready.includes("spec") ? "spec" : ready.sort(byCodeUnits)[0];
    order.push(next);
    left.delete(next);
  }
  return order;
}

// The Go modules a repository releases at a tag: spec's root and its contracts, another's root by
// its go.mod at the tag.
function goModulesOf(repo, tag, deps) {
  if (repo === "spec") return [`${MODULE}spec`, `${MODULE}spec/contracts`];
  let text;
  try {
    text = gh(deps, ["api", "-H", "Accept: application/vnd.github.raw", "--", `repos/${OWNER}/${repo}/contents/go.mod?ref=${tag}`]);
  } catch {
    return [];
  }
  const module = /^module\s+(\S+)/m.exec(text)?.[1];
  return module ? [module] : [];
}

// The body of an answer 200, as JSON or as true, or null: each body is read to its end and the
// timer cleared, so that neither holds the process once its work is done.
async function fetchOk(deps, url, { asJson = false } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);
  try {
    const response = await (deps.fetch ?? fetch)(url, { signal: controller.signal });
    const body = asJson ? await response.json() : await response.arrayBuffer();
    return response.ok ? (asJson ? body : true) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Waits until a release's files are where its dependents take them from: the release on GitHub, not
// a draft; each npm package's version and its archive, which comes later than the version's entry
// (the step of spec's release.yml that publishes to npm waits for the same);
// each Go module on the proxy — asked only once the tag is on GitHub, since the proxy remembers a
// module it did not find for half an hour.
export async function waitRelease(asked, named, deps) {
  checkRepo(asked);
  const tag = checkTag(named);
  const repo = releasingOf(asked);
  const deadline = deps.now().getTime() + (deps.releaseMs ?? RELEASE_MS);
  const state = { repo, tag, release: false, npm: Object.fromEntries((NPM_OF[repo] ?? []).map((n) => [n, false])), go: null };
  for (;;) {
    if (!state.release) {
      try {
        state.release = json(deps, ["api", "--", `repos/${OWNER}/${repo}/releases/tags/${tag}`]).draft === false;
      } catch {
        // not yet
      }
    }
    if (state.release && state.go === null) state.go = Object.fromEntries(goModulesOf(repo, tag, deps).map((m) => [m, false]));
    for (const name of Object.keys(state.npm).filter((n) => !state.npm[n])) {
      const tarball = (await fetchOk(deps, `https://registry.npmjs.org/${name}/${tag.slice(1)}`, { asJson: true }))?.dist?.tarball;
      state.npm[name] = Boolean(tarball && (await fetchOk(deps, tarball)));
    }
    for (const module of Object.keys(state.go ?? {}).filter((m) => !state.go[m])) {
      state.go[module] = Boolean(await fetchOk(deps, `https://proxy.golang.org/${module.replace(/[A-Z]/g, (c) => `!${c.toLowerCase()}`)}/@v/${tag}.info`));
    }
    if (state.release && state.go && Object.values(state.npm).every(Boolean) && Object.values(state.go).every(Boolean)) return state;
    if (deps.now().getTime() > deadline) throw new Error(`${repo} ${tag}: not all its files came in ${(deps.releaseMs ?? RELEASE_MS) / MINUTE} minutes: ${JSON.stringify(state)}`);
    await pause(deps);
  }
}

const inContainer = (deps, repo, clone, env, script, args = []) =>
  docker(deps, ["exec", "--user", "vscode", "--workdir", clone, ...Object.entries(env).flatMap(([k, v]) => ["--env", `${k}=${v}`]), containerId(repo, deps), "bash", "-lc", script, "bash", ...args], { timeout: 30 * MINUTE });

// The packages of names, every one by default, laid over node_modules by up, and the stamp that
// keeps _install from npm ci, gone: the next install takes the packages of the lock file.
export function unwireNpm(dir, repo, names) {
  const clone = path.join(dir, repo);
  const laid = laidOf(clone, names);
  for (const name of laid) fs.rmSync(path.join(clone, "node_modules", name), { recursive: true, force: true });
  if (laid.length) fs.rmSync(path.join(clone, "node_modules", ".installed-from"), { force: true });
  return laid.length > 0;
}

// The tag of spec a clone is on before the pin: its go.mod's, its package.json's, or its justfile's
// spec_tag.
function specTagOf(clone, mod, named) {
  const go = mod ? /^[ \t]*(?:require[ \t]+)?github\.com\/altnovatrail\/spec[ \t]+(v\S+)/m.exec(mod)?.[1] : null;
  if (go) return go;
  if (named["@altnovatrail/spec"]) return `v${named["@altnovatrail/spec"]}`;
  try {
    return /^spec_tag\s*:=\s*"(v[^"]+)"/m.exec(fs.readFileSync(path.join(clone, "justfile"), "utf8"))?.[1] ?? null;
  } catch {
    return null;
  }
}

// The line with the tag before put by the new one where it names the pin: in backticks, or after the
// word «tag» and not inside a longer version. A link's address and a mention of a move keep theirs.
function retagLine(line, before, tag) {
  const parts = line.replaceAll(`\`${before}\``, `\`${tag}\``).split(`tag ${before}`);
  let out = parts[0];
  for (const next of parts.slice(1)) out += (/^(?:[\w-]|\.\d)/.test(next) ? `tag ${before}` : `tag ${tag}`) + next;
  return out;
}

// The lines of CLAUDE.md and RUN.md that name spec at the tag before, and the justfile's spec_tag,
// at the new tag.
function retag(clone, before, tag) {
  const changed = [];
  for (const file of ["CLAUDE.md", "RUN.md"]) {
    const full = path.join(clone, file);
    const text = readText(full);
    if (text === null) continue;
    const next = text.split("\n").map((line) => (/\bspec\b/.test(line) ? retagLine(line, before, tag) : line)).join("\n");
    if (next !== text) {
      fs.writeFileSync(full, next);
      changed.push(file);
    }
  }
  const justfile = path.join(clone, "justfile");
  const text = readText(justfile);
  if (text !== null) {
    const next = text.replace(/^(spec_tag\s*:=\s*")v[^"]+(")/m, `$1${tag}$2`);
    if (next !== text) {
      fs.writeFileSync(justfile, next);
      changed.push("justfile");
    }
  }
  return changed;
}

// NOTICE's lines of the npm packages the pin moved, at their new versions: each package of the lock
// file is a line «<name> <version> — …», and one that holds a NOTICE of its own «Notice of <name>
// <version>:». A version the lock file still holds, nested under another package, keeps its line.
function renotice(clone, moved) {
  const file = path.join(clone, "NOTICE");
  let text = readText(file);
  if (text === null || !moved.length) return [];
  const held = Object.entries(readJson(path.join(clone, "package-lock.json"))?.packages ?? {}).map(([where, p]) => `${where.split("node_modules/").at(-1)} ${p?.version}`);
  const before = text;
  for (const { name, from, to } of moved.filter((m) => !held.includes(`${m.name} ${m.from}`))) for (const end of [" ", ":"]) text = text.split(`${name} ${from}${end}`).join(`${name} ${to}${end}`);
  if (text === before) return [];
  fs.writeFileSync(file, text);
  return ["NOTICE"];
}

// The files of parts/ that come from spec's release — the dependent's justfile verifies them at its
// spec_tag —, each with its signature downloaded from the new release into the epic's .stand/
// and verified there, before the pin writes anything in the clone. What to lay into parts/.
function partsOf(deps, dir, clone, dependent, tag) {
  const tracked = git(deps, clone, ["ls-files", "--", "parts"]).split("\n").filter(Boolean);
  if (!tracked.length) return [];
  const assets = json(deps, ["release", "view", tag, "-R", `${OWNER}/spec`, "--json", "assets"]).assets.map((a) => a.name);
  const taken = assets.filter((name) => !name.endsWith(".sigstore.json") && tracked.includes(`parts/${name}`));
  if (!taken.length) return [];
  const files = taken.flatMap((name) => [name, `${name}.sigstore.json`]).filter((name) => assets.includes(name));
  const staged = path.join(dir, STAND, `parts-${dependent}`);
  fs.rmSync(staged, { recursive: true, force: true });
  fs.mkdirSync(staged, { recursive: true });
  gh(deps, ["release", "download", tag, "-R", `${OWNER}/spec`, "--dir", staged, ...files.flatMap((name) => ["--pattern", name])]);
  for (const name of taken) inContainer(deps, dependent, clone, {}, 'just -f spec/justfile release-verify spec "$1" "$2"', [tag, path.join(staged, name)]);
  return files.map((name) => ({ from: path.join(staged, name), to: `parts/${name}` }));
}

// One dependent pinned to a release of repo: the submodule spec, go.mod by go get without the
// workspace, package.json and its lock file by npm and release-verify-npm, NOTICE's lines of
// those packages; for spec, the lines that name its tag and the files of parts/ from its release;
// the go.work without the repository; a commit, signed off. Nothing when it pins nothing.
function pinOne(dir, dependent, repo, tag, deps) {
  const clone = path.join(dir, dependent);
  if (git(deps, clone, ["status", "--porcelain", "--ignore-submodules=all"]).trim()) throw new Error(`${dependent} has changes not committed: commit them before the pin`);
  const done = [];
  const mod = goMod(clone);
  const manifest = readJson(path.join(clone, "package.json")) ?? {};
  const named = { ...manifest.dependencies, ...manifest.devDependencies };
  const before = repo === "spec" ? specTagOf(clone, mod, named) : null;
  if (repo === "spec" && git(deps, clone, ["ls-files", "--stage", "--", "spec"]).startsWith("160000 ")) {
    const sub = path.join(clone, "spec");
    if (!fs.existsSync(path.join(sub, ".git"))) git(deps, clone, ["submodule", "update", "--init", "--quiet", "--", "spec"]);
    git(deps, sub, ["fetch", "--quiet", "origin", `refs/tags/${tag}:refs/tags/${tag}`]);
    git(deps, sub, ["checkout", "--quiet", "--detach", tag]);
    done.push("submodule");
  }
  // Verified by the submodule at the tag; laid only once the rest of the pin is written.
  const parts = repo === "spec" && before !== tag ? partsOf(deps, dir, clone, dependent, tag) : [];
  const modules = mod ? [...mod.matchAll(REQUIRED)].map((m) => m[1]).filter((m) => m.slice(MODULE.length).split("/")[0] === repo) : [];
  if (modules.length) {
    inContainer(deps, dependent, clone, { GOWORK: "off", GOFLAGS: "-mod=mod" }, 'go get "$@" && go mod tidy', [...new Set(modules)].map((m) => `${m}@${tag}`));
    done.push("go.mod");
  }
  const names = (NPM_OF[repo] ?? []).filter((name) => Object.hasOwn(named, name));
  if (names.length) {
    unwireNpm(dir, dependent, names);
    inContainer(deps, dependent, clone, {}, 'npm install --save-exact --ignore-scripts --no-audit --no-fund "$@" && just -f spec/justfile release-verify-npm package-lock.json', names.map((n) => `${n}@${tag.slice(1)}`));
    done.push("package.json");
  }
  const moved = names.filter((name) => named[name] !== tag.slice(1)).map((name) => ({ name, from: named[name], to: tag.slice(1) }));
  for (const part of parts) fs.copyFileSync(part.from, path.join(clone, part.to));
  const retagged = [...(before && before !== tag ? retag(clone, before, tag) : []), ...renotice(clone, moved), ...parts.map((p) => p.to)];
  done.push(...retagged);
  wireGo(dir, dependent);
  if (!done.length) return null;
  // Only what the pin wrote: the gate moved the submodule's tree to the clone of spec, which no
  // pin to another repository commits.
  const files = [...(done.includes("submodule") ? ["spec"] : []), ...(done.includes("go.mod") ? ["go.mod", "go.sum"] : []), ...(done.includes("package.json") ? ["package.json", "package-lock.json"] : []), ...retagged];
  git(deps, clone, ["add", "--", ...files.filter((f) => fs.existsSync(path.join(clone, f)))]);
  if (!git(deps, clone, ["diff", "--cached", "--name-only"]).trim()) return { repo: dependent, pinned: done, commit: null };
  git(deps, clone, [...(deps.identity ?? []), "commit", "--quiet", "--signoff", "-m", `Pin ${repo} ${tag}\n\nxrepo ship: ${repo}'s release ${tag}, which this branch builds against.`]);
  return { repo: dependent, pinned: done, commit: git(deps, clone, ["rev-parse", "HEAD"]).trim() };
}

// The epic's clones that depend on repo, pinned to its release tag — by default its latest — and
// the release written to .stand/pinned.json, which the wiring leaves out from then on.
export function pin(named, asked, tag, deps, only = null) {
  checkRepo(asked);
  const { epic, dir } = epicOf(deps, named);
  const repo = releasingOf(asked);
  const release = checkTag(tag ?? json(deps, ["api", "--", `repos/${OWNER}/${repo}/releases/latest`]).tag_name);
  const pinned = { ...pinnedOf(dir), [repo]: release };
  fs.writeFileSync(path.join(dir, STAND, "pinned.json"), `${JSON.stringify(pinned, null, 1)}\n`);
  const dependents = (only ?? clonesOf(dir)).filter((r) => r !== repo && dependsOn(dir, r).has(repo));
  return { epic, repo, tag: release, dependents: dependents.map((d) => pinOne(dir, d, repo, release, deps)).filter(Boolean) };
}

// A check of a pull request, by its bucket: pending, pass, fail or skipping.
export function bucketOf(check) {
  if (check.__typename === "StatusContext") return { name: check.context, bucket: check.state === "SUCCESS" ? "pass" : ["PENDING", "EXPECTED"].includes(check.state) ? "pending" : "fail", link: check.targetUrl ?? null };
  const bucket = check.status !== "COMPLETED" ? "pending" : ["SUCCESS", "NEUTRAL"].includes(check.conclusion) ? "pass" : check.conclusion === "SKIPPED" ? "skipping" : "fail";
  return { name: check.name, bucket, link: check.detailsUrl ?? null };
}

const SONAR = /sonarcloud/i;

// The checks the repository's last merged pull request had that post late: codecov/patch and
// SonarCloud's.
function lateChecks(repo, deps) {
  const [last] = json(deps, ["pr", "list", "-R", `${OWNER}/${repo}`, "--state", "merged", "--limit", "1", "--json", "number,statusCheckRollup"]);
  return (last?.statusCheckRollup ?? []).map(bucketOf).map((c) => c.name).filter((n) => n === "codecov/patch" || SONAR.test(n));
}

// SonarCloud's issues of the pull request and its quality gate, by its API: none open and OK, or why
// not. It is asked only where the last merged pull request had SonarCloud's check, so an API that
// does not answer is a stop, never a pass.
async function sonarOf(repo, number, deps) {
  const key = `${OWNER}_${repo}`;
  const found = await fetchOk(deps, `https://sonarcloud.io/api/issues/search?componentKeys=${key}&pullRequest=${number}&resolved=false`, { asJson: true });
  const quality = (await fetchOk(deps, `https://sonarcloud.io/api/qualitygates/project_status?projectKey=${key}&pullRequest=${number}`, { asJson: true }))?.projectStatus?.status ?? null;
  if (!found || !quality) throw new Stop(`${repo} #${number}: SonarCloud's API did not answer for its issues and gate: ship again`);
  return { total: found.total, issues: (found.issues ?? []).map((i) => `${i.rule} ${i.component}:${i.line ?? "-"} ${i.message}`), gate: quality };
}

// What failed, from GitHub's log of each failed job, cut to its end.
function failuresOf(repo, failed, deps) {
  return failed.map((c) => {
    const run = /\/actions\/runs\/(\d+)/.exec(c.link ?? "")?.[1];
    let log = null;
    if (run) {
      try {
        log = gh(deps, ["run", "view", run, "-R", `${OWNER}/${repo}`, "--log-failed"]).trimEnd().split("\n").slice(-60).join("\n");
      } catch (error) {
        log = error.message;
      }
    }
    return { check: c.name, link: c.link, log };
  });
}

class Stop extends Error {
  constructor(message, details = {}) {
    super(message);
    this.details = details;
  }
}

// The pull request's checks until they are green and the merge can go: a failed check, SonarCloud's
// issue, a conflict or a block stops the ship; BEHIND takes main by GitHub's update and starts again.
async function awaitChecks(dir, repo, number, epic, deps) {
  const late = lateChecks(repo, deps);
  const deadline = deps.now().getTime() + (deps.checksMs ?? CHECKS_MS);
  let settled = null;
  let lagging = null;
  for (;;) {
    const view = json(deps, ["pr", "view", String(number), "-R", `${OWNER}/${repo}`, "--json", "state,mergeStateStatus,headRefOid,statusCheckRollup"]);
    if (view.state === "MERGED") return "merged";
    const clone = path.join(dir, repo);
    const head = git(deps, clone, ["rev-parse", "HEAD"]).trim();
    if (view.headRefOid !== head) {
      // The clone's head on origin is waited for until GitHub names it, up to HEAD_MS in all; any other
      // is a stop.
      git(deps, clone, ["fetch", "--quiet", "origin", epic]);
      lagging ??= deps.now().getTime();
      const pushed = git(deps, clone, ["rev-parse", `origin/${epic}`]).trim() === head;
      if (!pushed || deps.now().getTime() - lagging > (deps.headMs ?? HEAD_MS) || deps.now().getTime() > deadline) throw new Stop(`${repo} #${number}: its head ${view.headRefOid} is not the clone's ${head}: pull it, gate it, then ship`);
      await pause(deps);
      continue;
    }
    const checks = (view.statusCheckRollup ?? []).map(bucketOf);
    const failed = checks.filter((c) => c.bucket === "fail");
    if (failed.length) {
      const failures = failuresOf(repo, failed, deps);
      const file = path.join(dir, STAND, `ship-${repo}-${number}-failed.json`);
      fs.writeFileSync(file, `${JSON.stringify(failures, null, 1)}\n`);
      throw new Stop(`${repo} #${number}: ${failed.map((c) => c.name).join(", ")} failed; what failed is ${file}. A failure of the infrastructure is rerun (gh run rerun --failed), any other fixed and pushed; then ship again`, { failures });
    }
    const missing = late.filter((n) => !checks.some((c) => c.name === n));
    const pending = checks.filter((c) => c.bucket === "pending");
    if (checks.length && !pending.length) {
      settled ??= deps.now().getTime();
      if (!missing.length || deps.now().getTime() - settled > (deps.lateMs ?? LATE_MS)) {
        if (missing.length) throw new Stop(`${repo} #${number}: ${missing.join(", ")} never came, though its last merged pull request had them`);
        const sonar = late.some((n) => SONAR.test(n)) ? await sonarOf(repo, number, deps) : null;
        if (sonar && (sonar.total !== 0 || sonar.gate !== "OK")) throw new Stop(`${repo} #${number}: SonarCloud has ${sonar.total} issues, its gate ${sonar.gate}: fix them, push, then ship again`, { sonar });
        if (view.mergeStateStatus === "BEHIND") {
          gh(deps, ["pr", "update-branch", String(number), "-R", `${OWNER}/${repo}`]);
          git(deps, path.join(dir, repo), ["fetch", "--quiet", "origin", epic]);
          git(deps, path.join(dir, repo), ["merge", "--quiet", "--ff-only", `origin/${epic}`]);
          settled = null;
        } else if (view.mergeStateStatus === "DIRTY") {
          throw new Stop(`${repo} #${number}: it conflicts with main: xrepo sync, resolve, gate, push, then ship again`);
        } else if (view.mergeStateStatus === "BLOCKED") {
          throw new Stop(`${repo} #${number}: blocked with every check green: the ruleset asks for what ship does not give — a question to the author`);
        } else if (["CLEAN", "HAS_HOOKS", "UNSTABLE"].includes(view.mergeStateStatus)) {
          return { sonar };
        }
      }
    }
    if (deps.now().getTime() > deadline) throw new Stop(`${repo} #${number}: its checks did not end in ${(deps.checksMs ?? CHECKS_MS) / MINUTE} minutes`);
    await pause(deps);
  }
}

// The runs of main on the merge commit: each must end green; then the repository's release — its
// workflow Release, on the merge, after CI —, and the tag of a release that holds the merge, or
// null where Release made none: no path it releases changed.
async function awaitMain(repo, sha, deps) {
  const start = deps.now().getTime();
  const workflows = json(deps, ["api", "--", `repos/${OWNER}/${repo}/actions/workflows`]).workflows.map((w) => w.name);
  const releases = workflows.includes("Release");
  for (;;) {
    const runs = json(deps, ["run", "list", "-R", `${OWNER}/${repo}`, "--branch", "main", "--commit", sha, "--json", "databaseId,workflowName,status,conclusion"]);
    const red = runs.filter((r) => r.status === "completed" && !["success", "skipped", "neutral"].includes(r.conclusion));
    if (red.length) throw new Stop(`${repo}: ${red.map((r) => r.workflowName).join(", ")} of main on ${sha} failed — a question to the author: ship mends no main`);
    const going = runs.filter((r) => r.status !== "completed");
    const release = runs.find((r) => r.workflowName === "Release");
    const elapsed = deps.now().getTime() - start;
    if (runs.length && !going.length && (!releases || release)) break;
    if (!runs.length && elapsed > (deps.runsMs ?? RUNS_MS)) throw new Stop(`${repo}: no run of main on ${sha} in ${(deps.runsMs ?? RUNS_MS) / MINUTE} minutes — a question to the author`);
    if (elapsed > (deps.mainMs ?? MAIN_MS)) throw new Stop(`${repo}: the runs of main on ${sha} did not end in ${(deps.mainMs ?? MAIN_MS) / MINUTE} minutes`);
    await pause(deps);
  }
  if (!releases) return null;
  const tag = json(deps, ["api", "--", `repos/${OWNER}/${repo}/releases/latest`]).tag_name;
  const status = json(deps, ["api", "--", `repos/${OWNER}/${repo}/compare/${sha}...${tag}`]).status;
  return ["identical", "ahead"].includes(status) ? tag : null;
}

// The title and description of a pull request, which the session writes before ship: the first
// line of <epic folder>/pr-<repo>.md, and the rest.
function textOf(dir, repo) {
  const file = path.join(dir, `pr-${repo}.md`);
  if (!fs.existsSync(file)) throw new Stop(`no ${file}: the title on its first line, the description after it, in English`);
  const [title, ...body] = fs.readFileSync(file, "utf8").split("\n");
  if (!title.trim()) throw new Stop(`${file} has no title on its first line`);
  return { title: title.replace(/^#\s*/, "").trim(), file, body: body.join("\n").trim() };
}

// The pull request of the epic's branch, the open one or a new one.
function pullRequestOf(dir, repo, epic, deps) {
  const [open] = json(deps, ["pr", "list", "-R", `${OWNER}/${repo}`, "--head", epic, "--state", "open", "--json", "number"]);
  if (open) return open.number;
  const { title, body } = textOf(dir, repo);
  const bodyFile = path.join(dir, STAND, `pr-${repo}-body.md`);
  fs.writeFileSync(bodyFile, `${body}\n`);
  const url = gh(deps, ["pr", "create", "-R", `${OWNER}/${repo}`, "--base", "main", "--head", epic, "--title", title, "--body-file", bodyFile]).trim();
  const number = Number(/\/pull\/(\d+)\s*$/.exec(url)?.[1]);
  if (!number) throw new Stop(`${repo}: gh pr create printed no pull request: ${url}`);
  return number;
}

const shipFile = (dir) => path.join(dir, STAND, "ship.json");

const PHASES = ["gated", "pushed", "checks", "merged", "done"];

// .stand/ship.json as ship wrote it, each value held to its form, or null: its numbers, tags and
// names go into the addresses of GitHub, npm and the Go proxy, and the file may have been edited.
export function shipStateOf(raw, epic, clones) {
  const order = Array.isArray(raw?.order) ? raw.order.map((r) => clones.find((c) => c === r)) : [];
  if (!order.length || order.includes(undefined)) return null;
  const nodes = {};
  for (const repo of order) {
    const node = raw.nodes?.[repo] ?? {};
    const pr = Number(node.pr);
    const tag = /^v(\d+)\.(\d+)\.(\d+)$/.exec(node.tag ?? "");
    nodes[repo] = {
      phase: PHASES.find((p) => p === node.phase) ?? "gated",
      pinned: Array.isArray(node.pinned) ? order.filter((r) => node.pinned.includes(r)) : [],
      pr: Number.isInteger(pr) && pr > 0 ? pr : null,
      merge: /^[0-9a-f]{40}$/.test(node.merge ?? "") ? node.merge : null,
      tag: tag ? `v${Number(tag[1])}.${Number(tag[2])}.${Number(tag[3])}` : null,
    };
  }
  return { epic, order, nodes };
}

const save = (file, state) => fs.writeFileSync(file, `${JSON.stringify(state, null, 1)}\n`);

// A ship done moves aside, its state as .stand/ship-<n>.json and each text as pr-<repo>-ship-<n>.md,
// n the next number free: the epic's next ship begins anew, and takes no text of this one.
function setAside(dir, state) {
  const stand = path.join(dir, STAND);
  const used = fs.readdirSync(stand).map((f) => Number(/^ship-(\d+)(?=[.-])/.exec(f)?.[1] ?? 0));
  const n = Math.max(0, ...used) + 1;
  fs.renameSync(shipFile(dir), path.join(stand, `ship-${n}.json`));
  for (const repo of state.order) {
    const text = path.join(dir, `pr-${repo}.md`);
    if (fs.existsSync(text)) fs.renameSync(text, path.join(dir, `pr-${repo}-ship-${n}.md`));
  }
  return `${STAND}/ship-${n}.json`;
}

// One node to its release: the pins of what it depends on and its gate again without the wiring,
// its pull request, its checks, the merge, main and the release.
async function shipOne(dir, epic, repo, state, deps) {
  const node = state.nodes[repo];
  const say = (event) => deps.progress?.({ repo, ...event });
  if (node.phase === "gated") {
    const upstream = state.order.slice(0, state.order.indexOf(repo)).filter((r) => dependsOn(dir, repo).has(r));
    for (const r of upstream) {
      if (state.nodes[r].tag && !node.pinned.includes(r)) {
        say({ pin: pin(epic, r, state.nodes[r].tag, deps, [repo]).dependents });
        node.pinned.push(r);
      }
    }
    const wired = fs.existsSync(path.join(dir, repo, "go.work")) || laidOf(path.join(dir, repo)).length > 0;
    // At ship, a node builds against releases alone: what its go.work still replaces is a clone
    // the epic did not change, which CI takes from go.mod too.
    for (const f of ["go.work", "go.work.sum"]) fs.rmSync(path.join(dir, repo, f), { force: true });
    unwireNpm(dir, repo);
    if (GATES[repo] && (wired || node.pinned.length || !gatedAt(dir, repo, deps))) {
      const result = await gate(epic, [repo], deps);
      say({ gate: result.pass });
      if (!result.pass) throw new Stop(`${repo}: the gate without the wiring failed: .stand/gate.json says what; fix, commit, then ship again`, { gate: result.repos[0] });
    }
    say({ push: push(epic, deps, [repo]) });
    node.phase = "pushed";
    save(shipFile(dir), state);
  }
  if (node.phase === "pushed") {
    node.pr = pullRequestOf(dir, repo, epic, deps);
    node.phase = "checks";
    save(shipFile(dir), state);
    say({ pr: node.pr });
  }
  if (node.phase === "checks") {
    const checked = await awaitChecks(dir, repo, node.pr, epic, deps);
    if (checked !== "merged") {
      gh(deps, ["pr", "merge", String(node.pr), "-R", `${OWNER}/${repo}`, "--merge"]);
      say({ merged: node.pr, sonar: checked.sonar });
    }
    node.merge = json(deps, ["pr", "view", String(node.pr), "-R", `${OWNER}/${repo}`, "--json", "mergeCommit"]).mergeCommit.oid;
    node.phase = "merged";
    save(shipFile(dir), state);
  }
  if (node.phase === "merged") {
    node.tag = await awaitMain(repo, node.merge, deps);
    if (node.tag) say({ release: await waitRelease(repo, node.tag, deps) });
    if (repo === "spec" && deps.home && deps.specUrl) say({ orchestrator: syncOwn({ home: deps.home, url: deps.specUrl }) });
    node.phase = "done";
    save(shipFile(dir), state);
  }
}

// A stop unless infra's deploy/production.json, at its committed head, names each release of api
// and app this ship made.
function undeployed(dir, released, deps) {
  const deployed = ["api", "app"].filter((r) => released[r]);
  let production = {};
  try {
    production = JSON.parse(git(deps, path.join(dir, "infra"), ["show", "HEAD:deploy/production.json"]));
  } catch {
    // no such file at the head: every release is still to be named
  }
  const left = deployed.filter((r) => production[r]?.release !== released[r]);
  if (left.length) throw new Stop(`infra: raise deploy/production.json to ${left.map((r) => `${r} ${released[r]}`).join(", ")} — the tags and the sha256 of their files by each release's SHA256SUMS —, commit, then ship again`);
}

// The ship of the epic: the repositories it changed, by .stand/ship.json when a ship began already.
// Before the first pull request, each must have passed the gate at its head and have its text.
export async function ship(named, deps) {
  const { epic, dir } = epicOf(deps, named);
  const file = shipFile(dir);
  let state = shipStateOf(readJson(file), epic, clonesOf(dir));
  if (!state) {
    const touched = touchedOf(dir, deps);
    if (!touched.length) throw new Error("no clone has commits beyond main: nothing to ship");
    const order = orderOf(dir, touched);
    for (const repo of order) {
      if (GATES[repo] && !gatedAt(dir, repo, deps)) throw new Error(`${repo} has not passed the gate at its head: xrepo gate first`);
      textOf(dir, repo);
    }
    state = { epic, order, nodes: Object.fromEntries(order.map((r) => [r, { phase: "gated", pinned: [], pr: null, merge: null, tag: null }])) };
  }
  // infra deploys the releases of api and app: its pins are edited by the session, and infra ships
  // only once its committed deploy/production.json names each release this ship made. A ship that
  // released either is not done before infra has shipped.
  const released = Object.fromEntries(Object.entries(state.nodes).filter(([, n]) => n.tag).map(([r, n]) => [r, n.tag]));
  try {
    for (const repo of state.order) {
      if (state.nodes[repo].phase === "done") continue;
      if (repo === "infra" && state.nodes.infra.phase === "gated") undeployed(dir, released, deps);
      await shipOne(dir, epic, repo, state, deps);
      if (state.nodes[repo].tag) released[repo] = state.nodes[repo].tag;
    }
    const deployed = ["api", "app"].filter((r) => released[r]);
    if (deployed.length && !clonesOf(dir).includes("infra")) throw new Stop(`infra: ${deployed.map((r) => `${r} ${released[r]}`).join(", ")} reach the deployment, and the epic has no clone of infra: xrepo up ${epic} infra, then ship again`);
    if (deployed.length && !state.order.includes("infra")) {
      undeployed(dir, released, deps);
      state.order.push("infra");
      state.nodes.infra = { phase: "gated", pinned: [], pr: null, merge: null, tag: null };
      save(file, state);
      await shipOne(dir, epic, "infra", state, deps);
    }
  } catch (error) {
    save(file, state);
    if (error instanceof Stop) return { epic, stopped: error.message, ...error.details, nodes: state.nodes };
    throw error;
  }
  return { epic, shipped: true, nodes: state.nodes, record: setAside(dir, state) };
}
