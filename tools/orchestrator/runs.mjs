// A run: one task of one repository, carried by one session of Claude Code across its attempts —
// the first, `claude -p` with a new session's id, and each `--resume` of it with the author's
// answers or the orchestrator's word (R156). Its folder is on the volume novatrail-claude, which the
// orchestrator's container and every repository's container mount, so the executor writes its
// stream there itself and the run outlives the orchestrator's session (README.md).

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { git as runGit } from "../shared.mjs";
import { ensureRunning, FOLDER_LABEL, findContainer, inspect, placeOf } from "./containers.mjs";
import { outcomeOf, readStream } from "./stream.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

// A task's ceiling of cost by default, in dollars at the API's prices, as total_cost_usd counts
// them: about the 95th percentile of a session's cost (measurements 1.12).
export const DEFAULT_CEILING = 75;
// Every run is Opus at effort high, unless the author's word or a measurement says otherwise (R156).
export const MODEL = "opus";
export const EFFORT = "high";
// What a resumed run is told when the orchestrator has nothing else to say: after a limit's reset,
// or a run that stopped.
export const CONTINUE = "Continue the task from where it stopped.";
// spec on GitHub, which `sync` clones.
export const SPEC_URL = "https://github.com/altnovatrail/spec.git";
// How long an attempt may take to write its pid before it counts as lost.
const STARTING_MS = 60_000;

// The executor's command in its container, by sh: the run's folder and the attempt's number, then
// the arguments of claude. It reads the contract, the schema and the prompt from files of the run,
// so that docker's arguments stay short whatever their size, writes its pid, the stream and what
// claude said on stderr, and last its exit code; the pid and the code by a rename, so that each is
// there whole or not at all.
export const SCRIPT = [
  'dir=$1; n=$2; shift 2',
  'echo $$ > "$dir/pid-$n.part" && mv "$dir/pid-$n.part" "$dir/pid-$n"',
  'claude "$@" --append-system-prompt "$(cat "$dir/executor.md")" --json-schema "$(cat "$dir/status.schema.json")" < "$dir/prompt-$n.txt" > "$dir/stream-$n.jsonl" 2> "$dir/stderr-$n.txt"',
  'echo $? > "$dir/exit-$n.part" && mv "$dir/exit-$n.part" "$dir/exit-$n"',
].join("\n");

// git in the executor's container pushes through gh: the helper the container's git has is VS
// Code's, which needs a window that a docker exec has not (sources 9.3). An empty helper first
// clears the ones the configuration files name.
export const GIT_ENV = {
  GIT_CONFIG_COUNT: "2",
  GIT_CONFIG_KEY_0: "credential.helper",
  GIT_CONFIG_VALUE_0: "",
  GIT_CONFIG_KEY_1: "credential.helper",
  GIT_CONFIG_VALUE_1: "!gh auth git-credential",
};

// The orchestrator's folder on the volume novatrail-claude: its runs and its clone of spec.
export function homeOf(env = process.env) {
  return path.join(env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude"), "novatrail-orchestrator");
}

function runsOf(home) {
  return path.join(home, "runs");
}

// A run's id: the repository, the task and the time it started, to the second, in UTC.
export function runId(repo, task, time) {
  return `${repo}-${task}-${time.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z")}`;
}

// A run's folder, for an id a command line gave: the folder is one of those the orchestrator made,
// never a path the id spells.
function folderOf(home, id) {
  if (!/^[.a-z0-9][a-z0-9._-]*-T\d+-\d{8}T\d{6}Z$/.test(id)) throw new Error(`not a run's id: ${id}`);
  const found = allRuns(home).find((run) => run === id);
  if (!found) throw new Error(`no run ${id} in ${runsOf(home)}`);
  return path.join(runsOf(home), found);
}

export function loadRun(home, id) {
  return JSON.parse(fs.readFileSync(path.join(folderOf(home, id), "run.json"), "utf8"));
}

function saveRun(home, run) {
  const file = path.join(runsOf(home), run.id, "run.json");
  fs.writeFileSync(`${file}.part`, `${JSON.stringify(run, null, 1)}\n`);
  fs.renameSync(`${file}.part`, file);
}

// The orchestrator's own log of the run: what it did, a line of JSON each.
function logEvent(home, run, event) {
  fs.appendFileSync(path.join(runsOf(home), run.id, "events.jsonl"), `${JSON.stringify(event)}\n`);
}

// The arguments of claude for an attempt (sources 2.11): the first gives the session the id the
// orchestrator chose, a later one resumes it; each gets what is left of the task's ceiling, since
// on a resume --max-budget-usd counts only what the new run spends (sources 2.11).
export function claudeArgs(run, attempt, budget) {
  return [
    "-p",
    "--output-format",
    "stream-json",
    "--verbose",
    "--model",
    MODEL,
    "--effort",
    EFFORT,
    "--permission-mode",
    "bypassPermissions",
    "--max-budget-usd",
    budget.toFixed(2),
    attempt === 1 ? "--session-id" : "--resume",
    run.session,
  ];
}

// Starts the next attempt of a run in its container, detached: docker exec returns at once, and
// the attempt's files say how it goes.
function launch(home, run, prompt, budget, deps) {
  const n = run.attempts.length + 1;
  const dir = path.join(runsOf(home), run.id);
  fs.writeFileSync(path.join(dir, `prompt-${n}.txt`), prompt);
  const inside = path.posix.join(run.container.claude, path.relative(path.dirname(home), dir).split(path.sep).join("/"));
  const env = Object.entries(GIT_ENV).flatMap(([k, v]) => ["--env", `${k}=${v}`]);
  deps.docker(["exec", "--detach", "--user", "vscode", "--workdir", run.container.workdir, ...env, run.container.id, "sh", "-c", SCRIPT, "sh", inside, String(n), ...claudeArgs(run, n, budget)]);
  const attempt = { n, kind: n === 1 ? "start" : "resume", started: deps.now().toISOString(), budget_usd: Number(budget.toFixed(2)) };
  run.attempts.push(attempt);
  saveRun(home, run);
  logEvent(home, run, { time: attempt.started, event: attempt.kind, attempt: n, budget_usd: attempt.budget_usd, container: run.container.name });
}

// Starts a task in its repository's container: finds the container, starts it if it is stopped,
// makes the run's folder with the contract and the schema of this copy of the orchestrator, and
// runs the first attempt with the prompt, «Выполни задачу <task> из RUN.md» by default.
export function start({ repo, task, ceiling = DEFAULT_CEILING, prompt = null, container = null, folder = null }, deps) {
  if (!/^T\d+$/.test(task)) throw new Error(`not a task: ${task}`);
  if (!(Number.isFinite(ceiling) && ceiling > 0)) throw new Error(`not a ceiling of cost: ${ceiling}`);
  const found = ensureRunning(findContainer(repo, { docker: deps.docker, container, folder, hostname: deps.hostname }), deps);
  const place = placeOf(found);
  // The run's folder is named by what docker and the number say, not by the command line's words:
  // the repository is the clone's folder, which findContainer has held to `repo`.
  const name = path.posix.basename(found.Config.Labels[FOLDER_LABEL]);
  const number = `T${Number(task.slice(1))}`;
  const run = { id: runId(name, number, deps.now()), repo: name, task: number, session: deps.uuid(), ceiling_usd: ceiling, container: place, attempts: [] };
  const dir = path.join(runsOf(deps.home), run.id);
  fs.mkdirSync(runsOf(deps.home), { recursive: true });
  fs.mkdirSync(dir);
  for (const name of ["executor.md", "status.schema.json"]) fs.copyFileSync(path.join(HERE, name), path.join(dir, name));
  launch(deps.home, run, prompt ?? `Выполни задачу ${task} из RUN.md`, ceiling, deps);
  return run;
}

// Whether an attempt with no exit code still runs: its container runs, and its sh is alive in it.
// One whose pid is not written yet is starting, for a while. A container that is gone or stopped
// has lost it; any other failure of docker is an error, not an answer.
function alive(run, attempt, dir, deps) {
  const pidFile = path.join(dir, `pid-${attempt.n}`);
  if (!fs.existsSync(pidFile)) return deps.now() - new Date(attempt.started) < STARTING_MS;
  const pid = fs.readFileSync(pidFile, "utf8").trim();
  if (!/^\d+$/.test(pid)) return false;
  const gone = (error) => /No such (object|container)|is not running/.test(error.message);
  try {
    const [now] = inspect([run.container.id], deps.docker);
    if (!now.State?.Running) return false;
    // kill is sh's own: an image need not have the program.
    return deps.docker(["exec", "--user", "vscode", run.container.id, "sh", "-c", 'if kill -0 "$1" 2>/dev/null; then echo alive; fi', "sh", pid]).trim() === "alive";
  } catch (error) {
    if (gone(error)) return false;
    throw error;
  }
}

// How an attempt went. Only the last one may still run: an earlier one with no exit code was lost
// before the next began, and its pid is not looked for again — a container started anew may have
// given it to another process.
function attemptOf(home, run, attempt, deps, last) {
  const dir = path.join(runsOf(home), run.id);
  const file = (name) => path.join(dir, `${name}-${attempt.n}${name === "stream" ? ".jsonl" : ""}`);
  const read = () => readStream(fs.existsSync(file("stream")) ? fs.readFileSync(file("stream"), "utf8") : "");
  const exited = () => fs.existsSync(file("exit"));
  if (!exited() && last && alive(run, attempt, dir, deps)) return { phase: "running", read: read() };
  // The exit code may have come between the two looks.
  if (!exited()) return { phase: "lost", status: null, reason: "the attempt's process is gone with no exit code: its container stopped, or it was killed", resetsAt: null, read: read() };
  const code = Number(fs.readFileSync(file("exit"), "utf8").trim());
  const stream = read();
  return { ...outcomeOf(stream, code), read: stream };
}

// Where a run stands: the phase of its last attempt, the executor's status, why it stopped, when a
// limit resets, and what it cost. A resumed run's total_cost_usd is the session's whole total
// (sources 2.11), so what the task spent is the largest of them; an attempt after it that printed
// none adds what it spent unseen, and is counted.
export function stateOf(home, run, deps) {
  const results = run.attempts.map((a, i) => attemptOf(home, run, a, deps, i === run.attempts.length - 1));
  const last = results.at(-1);
  let spent = 0;
  let pricedAt = -1;
  results.forEach((r, i) => {
    const cost = r.read.result?.total_cost_usd;
    if (typeof cost === "number" && cost >= spent) {
      spent = cost;
      pricedAt = i;
    }
  });
  const unpriced = results.slice(pricedAt + 1).filter((r) => r.phase !== "running").length;
  const result = last.read.result;
  return {
    run: run.id,
    repo: run.repo,
    task: run.task,
    container: run.container.name,
    session: run.session,
    attempt: run.attempts.length,
    phase: last.phase,
    status: last.status ?? null,
    reason: last.reason ?? null,
    resets_at: last.resetsAt ?? null,
    spent_usd: Number(spent.toFixed(4)),
    unpriced_attempts: unpriced,
    ceiling_usd: run.ceiling_usd,
    model_usage: result?.modelUsage ?? null,
    num_turns: result?.num_turns ?? null,
    duration_ms: result?.duration_ms ?? null,
  };
}

// Every run in the orchestrator's folder, oldest first.
export function allRuns(home) {
  const dir = runsOf(home);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((id) => fs.existsSync(path.join(dir, id, "run.json")))
    .sort((a, b) => a.slice(a.lastIndexOf("-") + 1).localeCompare(b.slice(b.lastIndexOf("-") + 1)) || a.localeCompare(b));
}

// Continues a run that has ended, in the same session: with the author's answers or the
// orchestrator's word as the prompt, and what is left of the ceiling as the attempt's budget. A new
// ceiling is the author's answer to a run over its own. A limit that has not reset yet, or nothing
// left of the ceiling, refuses.
export function resume(id, { prompt = null, ceiling = null }, deps) {
  const run = loadRun(deps.home, id);
  const state = stateOf(deps.home, run, deps);
  if (state.phase === "running") throw new Error(`${id} still runs: wait for it first`);
  if (state.phase === "limited" && state.resets_at && new Date(state.resets_at) > deps.now()) throw new Error(`${id}: the limit resets at ${state.resets_at}; resume it after`);
  if (ceiling !== null) {
    if (!(Number.isFinite(ceiling) && ceiling > 0)) throw new Error(`not a ceiling of cost: ${ceiling}`);
    run.ceiling_usd = ceiling;
  }
  const left = run.ceiling_usd - state.spent_usd;
  if (left < 0.01) throw new Error(`${id}: spent $${state.spent_usd} of its ceiling of $${run.ceiling_usd}; the author may raise it with --ceiling`);
  const [now] = inspect([run.container.id], deps.docker);
  ensureRunning(now, deps);
  launch(deps.home, run, prompt ?? CONTINUE, left, deps);
  return run;
}

// Waits until each of the runs has ended, `interval` apart, and calls `ended` with each one's state
// as it ends. True when all have, false when `timeout` came first; no timeout waits for ever.
export async function waitFor(ids, { interval = 10_000, timeout = 0, ended }, deps) {
  const pending = new Set(ids);
  for (const id of pending) loadRun(deps.home, id);
  const deadline = timeout ? deps.now().getTime() + timeout : Infinity;
  for (;;) {
    for (const id of [...pending]) {
      const state = stateOf(deps.home, loadRun(deps.home, id), deps);
      if (state.phase !== "running") {
        pending.delete(id);
        ended(state);
      }
    }
    if (pending.size === 0) return true;
    if (deps.now().getTime() >= deadline) return false;
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

// The orchestrator's own copy of spec — its code and its plan at one commit of main —, cloned from
// GitHub into its folder or moved forward to main's head. Both configurations of spec open the same
// folder, and a task of spec run in the other switches its branches (R156); the clone is never
// edited, so a change in it is an error rather than something to lose.
export function sync({ home, url = SPEC_URL, git = runGit }) {
  const dir = path.join(home, "spec");
  if (fs.existsSync(dir)) {
    if (git(dir, ["status", "--porcelain"]).trim()) throw new Error(`${dir} has changes of its own: the orchestrator's clone is never edited`);
    git(dir, ["fetch", "--quiet", "origin", "main"]);
    git(dir, ["merge", "--quiet", "--ff-only", "FETCH_HEAD"]);
  } else {
    fs.mkdirSync(home, { recursive: true });
    git(home, ["clone", "--quiet", "--branch", "main", "--single-branch", url, dir]);
  }
  return { path: dir, commit: git(dir, ["rev-parse", "HEAD"]).trim() };
}
