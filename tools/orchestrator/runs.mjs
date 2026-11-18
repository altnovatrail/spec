// A run: one task of one repository, carried by one session of Claude Code across its attempts —
// the first, `claude -p` with a new session's id, and each `--resume` of it with the author's
// answers or the orchestrator's word (R156). Its folder is on the volume novatrail-claude, which the
// orchestrator's container and every repository's container mount, so the executor writes its
// stream there itself and the run outlives the orchestrator's session.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { git as runGit } from "../shared.mjs";
import { RUN_TASKS } from "../session/session.mjs";
import { ensureRunning, FOLDER_LABEL, findContainer, inspect, placeOf } from "./containers.mjs";
import { outcomeOf, readStream } from "./stream.mjs";
import { sessionCost } from "./transcript.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

// A task's ceiling of cost by default, in dollars at the API's prices, as total_cost_usd counts
// them: about the 95th percentile of a session's cost.
export const DEFAULT_CEILING = 75;
// Every run is Opus at effort high, unless the author's word or a measurement says otherwise (R156).
export const MODEL = "opus";
export const EFFORT = "high";
// What a resumed run is told when the orchestrator has nothing else to say: after a limit's reset,
// or a run that stopped.
export const CONTINUE = "Continue the task from where it stopped.";
export const SPEC_URL = "https://github.com/altnovatrail/spec.git";
// An attempt that has not written its pid by then counts as lost.
const STARTING_MS = 60_000;
// How many seconds `stop` waits for claude to end after SIGTERM, and then after SIGKILL.
export const STOP_WAIT = { TERM: 30, KILL: 10 };
const GONE = /No such (object|container)|is not running/;

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
// Code's, which needs a window that a docker exec has not. An empty helper first clears the ones
// the configuration files name.
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

// To the second, in UTC.
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

// Changes run.json by `change` on the file as it is now, not on the copy `run` was loaded from:
// a `wait` in the background and a `stop` or `resume` each hold a copy, and a write of a whole
// old copy would undo what the other saved. `run` is then the file's.
function updateRun(home, run, change) {
  const fresh = loadRun(home, run.id);
  change(fresh);
  saveRun(home, fresh);
  Object.assign(run, fresh);
}

function logEvent(home, run, event) {
  fs.appendFileSync(path.join(runsOf(home), run.id, "events.jsonl"), `${JSON.stringify(event)}\n`);
}

// The numbers a run goes by: every one it has had, `labels`, the one it started under first, and
// the one it goes by now. The hook of tools/session/ counts them as one task, so that a resume
// whose prompt names the real number is not refused in the session that started under another.
export function tasksOf(run) {
  return [...new Set([...(run.labels ?? []), run.task])];
}

// The run's container found again by its labels, when docker no longer has the one it stored: a
// rebuilt container has a new id. run.json and the log take the new one.
function relocate(home, run, deps) {
  const found = findContainer(run.repo, { docker: deps.docker, folder: run.container.folder });
  const place = placeOf(found);
  if (place.id !== run.container.id) {
    const from = run.container.name;
    updateRun(home, run, (r) => {
      // The attempts so far ran in the old one, and their pids are not looked for in the new.
      for (const attempt of r.attempts) attempt.container ??= r.container.id;
      r.container = place;
    });
    logEvent(home, run, { time: deps.now().toISOString(), event: "container", from, to: place.name, id: place.id });
  }
  return found;
}

// What docker says of the run's container now: the one it stored, or the one its labels find.
function containerOf(home, run, deps) {
  try {
    return inspect([run.container.id], deps.docker)[0];
  } catch (error) {
    if (!GONE.test(error.message)) throw error;
    return relocate(home, run, deps);
  }
}

// The first attempt gives the session the id the orchestrator chose, a later one resumes it; each
// gets what is left of the task's ceiling, since on a resume --max-budget-usd counts only what the
// new run spends.
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

// Detached: docker exec returns at once, and the attempt's files say how it goes.
function launch(home, run, prompt, budget, deps) {
  const n = run.attempts.length + 1;
  const dir = path.join(runsOf(home), run.id);
  fs.writeFileSync(path.join(dir, `prompt-${n}.txt`), prompt);
  const inside = path.posix.join(run.container.claude, path.relative(path.dirname(home), dir).split(path.sep).join("/"));
  const env = Object.entries({ ...GIT_ENV, [RUN_TASKS]: tasksOf(run).join(" ") }).flatMap(([k, v]) => ["--env", `${k}=${v}`]);
  deps.docker(["exec", "--detach", "--user", "vscode", "--workdir", run.container.workdir, ...env, run.container.id, "sh", "-c", SCRIPT, "sh", inside, String(n), ...claudeArgs(run, n, budget)]);
  const attempt = { n, kind: n === 1 ? "start" : "resume", started: deps.now().toISOString(), budget_usd: Number(budget.toFixed(2)), container: run.container.id };
  updateRun(home, run, (r) => r.attempts.push(attempt));
  logEvent(home, run, { time: attempt.started, event: attempt.kind, attempt: n, budget_usd: attempt.budget_usd, container: run.container.name });
}

// Starts a task in its repository's container, starting the container if it is stopped. The run's
// folder gets the contract and the schema of this copy of the orchestrator, which every attempt of
// the run is held to.
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
  saveRun(deps.home, run);
  launch(deps.home, run, prompt ?? `Выполни задачу ${task} из RUN.md`, ceiling, deps);
  return run;
}

// Whether the process $1 of a container lives: kill -0 answers for a zombie too, which a container
// whose first process reaps no children keeps — the one a test runs in, and maybe an executor's —,
// so the state in /proc that says Z is no life. Everything here is sh's own: an image need not have
// the programs.
const ALIVE = [
  'kill -0 "$1" 2>/dev/null || exit 0',
  'stat=; read -r stat 2>/dev/null < "/proc/$1/stat"',
  'case "${stat##*") "}" in Z*) ;; *) echo alive ;; esac',
].join("\n");

// Whether an attempt with no exit code still runs: its container runs, and its sh is alive in it.
// One whose pid is not written yet is starting, for a while. A container that is gone or stopped
// has lost it — a gone one is looked for again by its labels, for the run's next attempt —; any
// other failure of docker is an error, not an answer.
function alive(home, run, attempt, dir, deps) {
  const pidFile = path.join(dir, `pid-${attempt.n}`);
  if (!fs.existsSync(pidFile)) return deps.now() - new Date(attempt.started) < STARTING_MS;
  const pid = fs.readFileSync(pidFile, "utf8").trim();
  if (!/^\d+$/.test(pid)) return false;
  // An attempt of a container that was rebuilt since is gone with it.
  if ((attempt.container ?? run.container.id) !== run.container.id) return false;
  let now;
  try {
    [now] = inspect([run.container.id], deps.docker);
  } catch (error) {
    if (!GONE.test(error.message)) throw error;
    try {
      relocate(home, run, deps);
    } catch {
      // No container by its labels either: the run keeps the one it had, and resume says why.
    }
    return false;
  }
  if (!now.State?.Running) return false;
  try {
    return deps.docker(["exec", "--user", "vscode", run.container.id, "sh", "-c", ALIVE, "sh", pid]).trim() === "alive";
  } catch (error) {
    if (GONE.test(error.message)) return false;
    throw error;
  }
}

// Signals with $1 the processes of a container below the process $2 — claude, which the attempt's
// sh wraps, and all that claude started, the commands it left in the background too — and those of
// the rest of its words, each `<pid>:<start>`, that still run with the same time of start, and
// prints each one it signalled as `<pid>:<start>`; $1 "-" signals none, and only names them. The sh
// itself is left to write claude's exit code: a signal to the sh alone would not reach claude. A
// process that claude's end left to the container's first process is not below the sh, so stop
// gives back what its first round named; the time of start tells that the pid has not passed to
// another process since. A zombie is no process here. The fields of /proc/<pid>/stat are
// taken after the last ") ", since the name before may hold spaces and parentheses: the state is
// the first, the parent the second, the time of start the twentieth. Everything here is sh's own,
// as in ALIVE: an image need not have pkill or ps.
export const STOP = [
  'sig=$1; root=$2; shift 2; given=" $* "; rows=',
  'for f in /proc/[0-9]*/stat; do',
  '  stat=; { read -r stat < "$f"; } 2>/dev/null || continue',
  '  p=${f#/proc/}; set -- ${stat##*") "}',
  '  [ "$1" = Z ] || rows="$rows ${p%/stat}:$2:${20}"',
  'done',
  'found=" $root "; more=1',
  'while [ -n "$more" ]; do',
  '  more=',
  '  for row in $rows; do',
  '    pid=${row%%:*}; rest=${row#*:}',
  '    case "$found" in *" ${rest%%:*} "*) case "$found" in *" $pid "*) ;; *) found="$found$pid "; more=1 ;; esac ;; esac',
  '  done',
  'done',
  'targets=; pids=',
  'for row in $rows; do',
  '  pid=${row%%:*}; mark=$pid:${row##*:}',
  '  [ "$pid" = "$root" ] && continue',
  '  case "$found$given" in *" $pid "*|*" $mark "*) targets="$targets $mark"; pids="$pids $pid" ;; esac',
  'done',
  '[ "$sig" = - ] || [ -z "$pids" ] || kill -s "$sig" $pids 2>/dev/null',
  'echo $targets',
].join("\n");

// How an attempt went. Only the last one may still run: an earlier one with no exit code was lost
// before the next began, and its pid is not looked for again — a container started anew may have
// given it to another process.
function attemptOf(home, run, attempt, deps, last) {
  const dir = path.join(runsOf(home), run.id);
  const file = (name) => path.join(dir, `${name}-${attempt.n}${name === "stream" ? ".jsonl" : ""}`);
  const read = () => readStream(fs.existsSync(file("stream")) ? fs.readFileSync(file("stream"), "utf8") : "");
  const exited = () => fs.existsSync(file("exit"));
  if (!exited() && last && alive(home, run, attempt, dir, deps)) return { phase: "running", read: read() };
  // The exit code may have come between the two looks.
  const stream = read();
  const outcome = exited()
    ? outcomeOf(stream, Number(fs.readFileSync(file("exit"), "utf8").trim()), earlier(dir) ? run.task : null)
    : { phase: "lost", status: null, reason: "the attempt's process is gone with no exit code: its container stopped, or it was killed", resetsAt: null };
  // An attempt the orchestrator stopped is stopped, whatever it printed before it ended.
  if (attempt.stopped) return { ...outcome, phase: "stopped", reason: `stopped by the ${attempt.stopped.by} at ${attempt.stopped.time}`, read: stream };
  return { ...outcome, read: stream };
}

// Whether the schema in a run's folder asks for no task in the status. One whose schema cannot be
// read is held to this copy's.
function earlier(dir) {
  try {
    return !JSON.parse(fs.readFileSync(path.join(dir, "status.schema.json"), "utf8")).required.includes("task");
  } catch {
    return false;
  }
}

// Takes the number the executor's status names for its task, when it is not the run's: the
// executor wrote the task under the next free number, its own being taken. Every number the
// run has gone by stays in `labels`, the first first; the log says when it changed.
function relabel(home, run, named, deps) {
  const number = `T${Number(named.slice(1))}`;
  if (number === run.task) return;
  logEvent(home, run, { time: deps.now().toISOString(), event: "relabel", from: run.task, to: number });
  updateRun(home, run, (r) => {
    r.labels = [...new Set([...(r.labels ?? [r.task]), number])];
    r.task = number;
  });
}

// Where a run stands: the phase of its last attempt, the executor's status, why it stopped, when a
// limit resets, and what it cost. A resumed run's total_cost_usd is the session's whole total
// so what the task spent is the largest of them. An attempt after it that printed
// none — stopped, lost, cut short — spent what only the session's transcript shows: the transcript
// is read then, and the larger of the two is the spend, with where it came from. Such an attempt
// is counted as unpriced unless the transcript, every call of it priced, comes to more than the
// results' total: one that comes to less does not show what the attempt spent. Turns and time are
// summed over every result of every attempt; the usage of the models is the last result's.
export function stateOf(home, run, deps) {
  const results = run.attempts.map((a, i) => attemptOf(home, run, a, deps, i === run.attempts.length - 1));
  const last = results.at(-1);
  const named = results.map((r) => r.status?.task).filter(Boolean).at(-1);
  if (named) relabel(home, run, named, deps);
  let spent = 0;
  let pricedAt = -1;
  results.forEach((r, i) => {
    const cost = r.read.cost;
    if (typeof cost === "number" && cost >= spent) {
      spent = cost;
      pricedAt = i;
    }
  });
  let from = pricedAt >= 0 ? "result" : null;
  let unpriced = results.slice(pricedAt + 1).filter((r) => r.phase !== "running").length;
  if (unpriced > 0) {
    const transcript = sessionCost(path.dirname(home), run.container.workdir, run.session);
    if (transcript && transcript.usd > spent) {
      spent = transcript.usd;
      from = "transcript";
      if (transcript.unpriced === 0) unpriced = 0;
    }
  }
  const result = last.read.result;
  const summed = results.filter((r) => r.read.results > 0);
  return {
    run: run.id,
    repo: run.repo,
    task: run.task,
    labels: tasksOf(run),
    container: run.container.name,
    session: run.session,
    attempt: run.attempts.length,
    phase: last.phase,
    status: last.status ?? null,
    reason: last.reason ?? null,
    resets_at: last.resetsAt ?? null,
    spent_usd: Number(spent.toFixed(4)),
    spent_from: from,
    unpriced_attempts: unpriced,
    ceiling_usd: run.ceiling_usd,
    model_usage: result?.modelUsage ?? null,
    num_turns: summed.length ? summed.reduce((sum, r) => sum + r.read.turns, 0) : null,
    duration_ms: summed.length ? summed.reduce((sum, r) => sum + r.read.durationMs, 0) : null,
  };
}

// The runs of a repository not known to be done, each with every number it has gone by: what
// `next` counts beside the repository's own plan. Known done is a last attempt that exited with
// the executor's status done, by the run's files alone: no docker, and nothing written. A run done
// whose number a pull request or main holds is counted by them anyway.
export function openRuns(home, repo) {
  return allRuns(home)
    .map((id) => loadRun(home, id))
    .filter((run) => run.repo === repo && !knownDone(home, run))
    .map((run) => ({ run: run.id, tasks: tasksOf(run) }));
}

function knownDone(home, run) {
  const attempt = run.attempts.at(-1);
  const dir = path.join(runsOf(home), run.id);
  const exit = path.join(dir, `exit-${attempt?.n}`);
  const stream = path.join(dir, `stream-${attempt?.n}.jsonl`);
  if (!attempt || attempt.stopped || !fs.existsSync(exit) || !fs.existsSync(stream)) return false;
  const code = Number(fs.readFileSync(exit, "utf8").trim());
  return outcomeOf(readStream(fs.readFileSync(stream, "utf8")), code, earlier(dir) ? run.task : null).phase === "done";
}

// Oldest first.
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
    updateRun(deps.home, run, (r) => {
      r.ceiling_usd = ceiling;
    });
  }
  const left = run.ceiling_usd - state.spent_usd;
  if (left < 0.01) throw new Error(`${id}: spent $${state.spent_usd} of its ceiling of $${run.ceiling_usd}; the author may raise it with --ceiling`);
  ensureRunning(containerOf(deps.home, run, deps), deps);
  launch(deps.home, run, prompt ?? CONTINUE, left, deps);
  return run;
}

// Stops the last attempt of a run that runs, so that the orchestrator may resume it with a new word:
// SIGTERM to claude and every process below it; then, once STOP_WAIT.TERM seconds have
// passed with any of them still there, SIGKILL to what is left of them and to what is below the sh
// now. A process that outlived claude, which the container's first process took over, is still one
// of them: STOP names each by its pid and its time of start, so that a pid passed on since is never
// signalled. It returns once the attempt has ended — its sh wrote the exit code, or is gone —, with
// the attempt recorded as stopped: when, by whom, by which signal last; the log names how many
// processes it signalled, and how many outlived SIGKILL. What the attempt spent comes from the
// session's transcript (stateOf).
export function stop(id, deps) {
  const run = loadRun(deps.home, id);
  const state = stateOf(deps.home, run, deps);
  if (state.phase !== "running") throw new Error(`${id} does not run: its last attempt is ${state.phase}`);
  const attempt = run.attempts.at(-1);
  const dir = path.join(runsOf(deps.home), run.id);
  const pidFile = path.join(dir, `pid-${attempt.n}`);
  if (!fs.existsSync(pidFile)) throw new Error(`${id}: attempt ${attempt.n} has not written its pid yet; stop it in a minute`);
  // alive() has held it to digits.
  const pid = fs.readFileSync(pidFile, "utf8").trim();
  const waits = deps.stopWait ?? STOP_WAIT;
  // The words STOP gets back are its own output, `<pid>:<start>`, digits alone.
  const signal = (sig, known) =>
    deps
      .docker(["exec", "--user", "vscode", run.container.id, "sh", "-c", STOP, "sh", sig, pid, ...known])
      .split(/\s+/)
      .filter((word) => /^\d+:\d+$/.test(word));
  const ended = () => fs.existsSync(path.join(dir, `exit-${attempt.n}`)) || !alive(deps.home, run, attempt, dir, deps);
  const over = (known) => ended() && signal("-", known).length === 0;
  const waitOver = (seconds, known) => {
    for (let i = 0; i < seconds && !over(known); i += 1) deps.sleep(1000);
  };
  let known = signal("TERM", []);
  let last = "TERM";
  waitOver(waits.TERM, known);
  if (!over(known)) {
    known = [...new Set([...known, ...signal("KILL", known)])];
    last = "KILL";
    waitOver(waits.KILL, known);
  }
  if (!ended()) throw new Error(`${id}: attempt ${attempt.n} still runs after SIGKILL`);
  const survivors = signal("-", known).length;
  const stopped = { time: deps.now().toISOString(), by: "orchestrator", signal: last };
  updateRun(deps.home, run, (r) => {
    r.attempts[attempt.n - 1].stopped = stopped;
  });
  logEvent(deps.home, run, { time: stopped.time, event: "stop", attempt: attempt.n, signal: last, processes: known.length, survivors, container: run.container.name });
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
// folder, and a task of spec run in the other switches its branches; the clone is never edited, so
// a change in it is an error rather than something to lose (R156).
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
