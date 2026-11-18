// Each test runs the orchestrator's commands on the made-up host of fakes.mjs — its fake docker runs
// each attempt here, with the fake claude — and sync on a repository made in a temporary folder:
// none is a real container, session or clone.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { git } from "../../shared.mjs";
import { argumentsOf, defaults, main } from "../main.mjs";
import { CONTINUE, GIT_ENV, homeOf, SCRIPT, STOP, sync } from "../runs.mjs";
import { allowed, host, init, message, QUESTION, result, STATUS } from "./fakes.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN = path.join(HERE, "..", "main.mjs");
const CONTRACT = fs.readFileSync(path.join(HERE, "..", "executor.md"), "utf8");
const SCHEMA = fs.readFileSync(path.join(HERE, "..", "status.schema.json"), "utf8");
const SESSION = "0f0e0d0c-0b0a-4908-8706-050403020100";
const RUN = "sim-T7-20261115T220000Z";

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

// Waits until the attempt's sh has written its pid, and gives it.
async function pidOf(h, n = 1, id = RUN) {
  const file = path.join(h.deps.home, "runs", id, `pid-${n}`);
  while (!fs.existsSync(file)) await pause(10);
  return Number(fs.readFileSync(file, "utf8"));
}

// Whether a process has ended: gone, or a zombie that nobody has reaped.
function ended(pid) {
  try {
    return /^\d+ \(.*\) Z/.test(fs.readFileSync(`/proc/${pid}/stat`, "utf8"));
  } catch {
    return true;
  }
}

const events = (h, id = RUN) =>
  fs
    .readFileSync(path.join(h.deps.home, "runs", id, "events.jsonl"), "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));

const saved = (h, id = RUN) => JSON.parse(fs.readFileSync(path.join(h.deps.home, "runs", id, "run.json"), "utf8"));

// A transcript of the session: a message of the model in two records, its output grown in the
// second; one more message; one the model did not make; half a line; and a subagent's message.
// $0.05 + $0.007 + $0.005 by the prices of tools/tokens.
function transcript(h) {
  const first = { input_tokens: 1000, cache_read_input_tokens: 100_000, cache_creation_input_tokens: 2000, cache_creation: { ephemeral_5m_input_tokens: 0, ephemeral_1h_input_tokens: 2000 }, output_tokens: 10 };
  h.transcript(
    "sim",
    SESSION,
    [
      { type: "user", message: { role: "user", content: "assistant" } },
      message("m1", first),
      message("m1", { ...first, output_tokens: 500 }),
      message("m2", { input_tokens: 0, cache_creation_input_tokens: 1000, output_tokens: 100 }),
      message("m0", { input_tokens: 0, output_tokens: 0 }, "<synthetic>"),
      '{"type":"assistant","message":{"id":"m9"',
    ],
    { "agent-a.jsonl": [message("m3", { output_tokens: 1000 }, "claude-haiku-4-5-20251001")], "notes.txt": ["assistant"] },
  );
}

// Runs a command line on the host; its status, and the JSON it printed.
async function run(h, argv) {
  h.out.length = 0;
  h.err.length = 0;
  const status = await main(argv, h.deps);
  return { status, out: h.out.map((l) => JSON.parse(l)), err: h.err.join("\n") };
}

test("start runs the task in its container by the contract, and wait gives its status and cost", async (t) => {
  const h = host();
  t.after(h.done);
  h.plan(1, { lines: [init(), allowed, result(2.5)] });
  const started = await run(h, ["start", "sim", "T7"]);
  assert.equal(started.status, 0, started.err);
  assert.equal(started.out[0].run, RUN);
  assert.equal(started.out[0].container, "jovial_cannon");
  // The stopped container was started first.
  assert.ok(h.dockerCalls().some((c) => c[0] === "start" && c[1] === "cccc3333sim"));
  const exec = h.dockerCalls().find((c) => c[0] === "exec" && c[1] === "--detach");
  const workdir = path.join(h.root, "workspaces", "sim");
  const inside = path.join(h.volume, "novatrail-orchestrator", "runs", RUN);
  const env = [...Object.entries(GIT_ENV).flatMap(([k, v]) => ["--env", `${k}=${v}`]), "--env", "NOVATRAIL_RUN_TASKS=T7"];
  assert.deepEqual(exec, ["exec", "--detach", "--user", "vscode", "--workdir", workdir, ...env, "cccc3333sim", "sh", "-c", SCRIPT, "sh", inside, "1", "-p", "--output-format", "stream-json", "--verbose", "--model", "opus", "--effort", "high", "--permission-mode", "bypassPermissions", "--max-budget-usd", "75.00", "--session-id", SESSION]);

  const waited = await run(h, ["wait", RUN]);
  assert.equal(waited.status, 0, waited.err);
  const [state] = waited.out;
  assert.equal(state.phase, "done");
  assert.deepEqual(state.status, STATUS);
  assert.equal(state.spent_usd, 2.5);
  assert.equal(state.unpriced_attempts, 0);
  assert.equal(state.ceiling_usd, 75);
  assert.equal(state.num_turns, 3);
  assert.deepEqual(Object.keys(state.model_usage), ["claude-opus-5-5"]);

  // What claude got: the contract and the schema of this copy, the prompt on stdin, git through gh.
  const call = h.call(1);
  assert.deepEqual(call.argv.slice(-4), ["--append-system-prompt", CONTRACT.replace(/\n+$/, ""), "--json-schema", SCHEMA.replace(/\n+$/, "")]);
  assert.equal(call.stdin, "Выполни задачу T7 из RUN.md");
  assert.deepEqual(call.git, GIT_ENV);
  assert.equal(call.tasks, "T7");
  const dir = path.join(homeOf({ CLAUDE_CONFIG_DIR: h.volume }), "runs", RUN);
  assert.deepEqual(fs.readdirSync(dir).sort(), ["events.jsonl", "executor.md", "exit-1", "pid-1", "prompt-1.txt", "run.json", "status.schema.json", "stderr-1.txt", "stream-1.jsonl"]);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir, "events.jsonl"), "utf8")).event, "start");
});

test("resume continues the same session with the answers and what is left of the ceiling", async (t) => {
  const h = host();
  t.after(h.done);
  fs.mkdirSync(h.deps.home, { recursive: true });
  const answers = path.join(h.deps.home, "answers.md");
  fs.writeFileSync(answers, "Ответ на В7: первый.");
  h.plan(1, { lines: [init(), result(2.5, { ...STATUS, status: "waiting", pull_request: null, questions: [QUESTION] })] });
  h.plan(2, { lines: [init(), result(4, STATUS)] });
  await run(h, ["start", "sim", "T7", "--ceiling", "10"]);
  const first = await run(h, ["wait", RUN]);
  assert.equal(first.out[0].phase, "waiting");
  assert.deepEqual(first.out[0].status.questions, [QUESTION]);

  const resumed = await run(h, ["resume", RUN, "--answers", answers]);
  assert.equal(resumed.status, 0, resumed.err);
  await run(h, ["wait", RUN]);
  const call = h.call(2);
  const at = call.argv.indexOf("--resume");
  assert.equal(call.argv[at + 1], SESSION);
  assert.equal(call.argv[call.argv.indexOf("--max-budget-usd") + 1], "7.50");
  assert.ok(!call.argv.includes("--session-id"));
  assert.equal(call.stdin, "Ответ на В7: первый.");
  // The contract goes with every attempt.
  assert.equal(call.argv[call.argv.indexOf("--append-system-prompt") + 1], CONTRACT.replace(/\n+$/, ""));
  const state = (await run(h, ["status", RUN])).out[0];
  assert.equal(state.phase, "done");
  assert.equal(state.attempt, 2);
  // The second total is the session's whole: 4, not 2.5 + 4.
  assert.equal(state.spent_usd, 4);
});

test("a run over its ceiling is refused until the author raises it", async (t) => {
  const h = host();
  t.after(h.done);
  h.plan(1, { lines: [init(), { type: "result", subtype: "error_max_budget_usd", is_error: true, total_cost_usd: 3.2 }] });
  h.plan(2, { lines: [init(), result(5)] });
  await run(h, ["start", "sim", "T7", "--ceiling", "3"]);
  assert.equal((await run(h, ["wait", RUN])).out[0].phase, "over-ceiling");
  const refused = await run(h, ["resume", RUN]);
  assert.equal(refused.status, 1);
  assert.match(refused.err, /spent \$3.2 of its ceiling of \$3; the author may raise it with --ceiling/);
  const raised = await run(h, ["resume", RUN, "--ceiling", "8"]);
  assert.equal(raised.status, 0, raised.err);
  await run(h, ["wait", RUN]);
  assert.equal(h.call(2).argv[h.call(2).argv.indexOf("--max-budget-usd") + 1], "4.80");
  assert.equal(h.call(2).stdin, CONTINUE);
  assert.equal((await run(h, ["status", RUN])).out[0].ceiling_usd, 8);
});

test("a running run is waited for, and resuming it is refused; wait's timeout is an error", async (t) => {
  const h = host();
  t.after(h.done);
  h.plan(1, { lines: [init(), result(1)], hold: true });
  await run(h, ["start", "sim", "T7"]);
  const dir = path.join(h.deps.home, "runs", RUN);
  // The pid comes once the attempt's sh has started.
  while (!fs.existsSync(path.join(dir, "pid-1"))) await new Promise((r) => setTimeout(r, 10));
  assert.equal((await run(h, ["status"])).out[0].phase, "running");
  const refused = await run(h, ["resume", RUN]);
  assert.match(refused.err, /still runs: wait for it first/);
  h.deps.now = () => new Date(Date.now());
  const timedOut = await run(h, ["wait", RUN, "--timeout", "0.05"]);
  assert.equal(timedOut.status, 1);
  assert.match(timedOut.err, /--timeout of 0.05 s came before every run ended/);
  // wait polls until the run ends.
  const waiting = run(h, ["wait", RUN]);
  setTimeout(() => h.release(1), 100);
  assert.equal((await waiting).out[0].phase, "done");
});

test("an attempt whose process is gone with no exit code is lost; one not started yet still runs a while", async (t) => {
  const h = host();
  t.after(h.done);
  h.plan(1, { lines: [init()], hold: true });
  await run(h, ["start", "sim", "T7"]);
  const dir = path.join(h.deps.home, "runs", RUN);
  while (!fs.existsSync(path.join(dir, "pid-1"))) await new Promise((r) => setTimeout(r, 10));
  const pid = Number(fs.readFileSync(path.join(dir, "pid-1"), "utf8"));
  process.kill(-pid, "SIGKILL");
  await new Promise((r) => setTimeout(r, 50));
  const lost = (await run(h, ["status", RUN])).out[0];
  assert.equal(lost.phase, "lost");
  assert.equal(lost.session, SESSION);
  fs.writeFileSync(path.join(dir, "pid-1"), "not a pid");
  assert.equal((await run(h, ["status", RUN])).out[0].phase, "lost");
  fs.rmSync(path.join(dir, "pid-1"));
  assert.equal((await run(h, ["status", RUN])).out[0].phase, "running");
  h.tick(61_000);
  assert.equal((await run(h, ["status", RUN])).out[0].phase, "lost");
  // A stopped container loses it too.
  h.edit((cs) => {
    cs[2].State.Running = false;
  });
  assert.equal((await run(h, ["status", RUN])).out[0].phase, "lost");
});

test("a container removed under a running attempt loses it; any other failure of docker is an error", async (t) => {
  const h = host();
  t.after(h.done);
  h.plan(1, { lines: [init()], hold: true });
  await run(h, ["start", "sim", "T7"]);
  const dir = path.join(h.deps.home, "runs", RUN);
  while (!fs.existsSync(path.join(dir, "pid-1"))) await new Promise((r) => setTimeout(r, 10));
  assert.equal((await run(h, ["status", RUN])).out[0].phase, "running");
  const docker = h.deps.docker;
  h.deps.docker = (args) => {
    if (args[0] === "exec") throw new Error("docker exec: Cannot connect to the Docker daemon");
    return docker(args);
  };
  const failed = await run(h, ["status", RUN]);
  assert.equal(failed.status, 1);
  assert.match(failed.err, /Cannot connect to the Docker daemon/);
  h.deps.docker = (args) => {
    if (args[0] === "exec") throw new Error("docker exec: Error response from daemon: container cccc3333sim is not running");
    return docker(args);
  };
  assert.equal((await run(h, ["status", RUN])).out[0].phase, "lost");
  h.deps.docker = docker;
  h.edit((cs) => cs.splice(2, 1));
  assert.equal((await run(h, ["status", RUN])).out[0].phase, "lost");
  h.release(1);
});

test("an earlier attempt with no exit code is lost, and its pid is not looked for again", async (t) => {
  const h = host();
  t.after(h.done);
  h.plan(1, { lines: [init()], hold: true });
  h.plan(2, { lines: [init(), result(2)] });
  await run(h, ["start", "sim", "T7"]);
  const dir = path.join(h.deps.home, "runs", RUN);
  while (!fs.existsSync(path.join(dir, "pid-1"))) await new Promise((r) => setTimeout(r, 10));
  const pid = Number(fs.readFileSync(path.join(dir, "pid-1"), "utf8"));
  process.kill(-pid, "SIGKILL");
  await new Promise((r) => setTimeout(r, 50));
  await run(h, ["resume", RUN]);
  await run(h, ["wait", RUN]);
  const execs = () => h.dockerCalls().filter((c) => c[0] === "exec" && c[1] !== "--detach").length;
  const before = execs();
  const state = (await run(h, ["status", RUN])).out[0];
  assert.equal(state.phase, "done");
  assert.equal(state.unpriced_attempts, 0);
  assert.equal(execs(), before, "no docker exec for the attempts that have ended");
});

test("a limit pauses the run until its reset, and the run then continues", async (t) => {
  const h = host();
  t.after(h.done);
  const reset = Date.parse("2026-11-15T23:00:00Z") / 1000;
  h.plan(1, { lines: [init(), { type: "rate_limit_event", rate_limit_info: { status: "rejected", resetsAt: reset, rateLimitType: "five_hour" } }, { type: "result", subtype: "success", is_error: true, result: "You've hit your session limit · resets 11pm (UTC)", total_cost_usd: 1.5 }], exit: 1 });
  h.plan(2, { lines: [init(), result(3)] });
  await run(h, ["start", "sim", "T7"]);
  const limited = (await run(h, ["wait", RUN])).out[0];
  assert.equal(limited.phase, "limited");
  assert.equal(limited.resets_at, "2026-11-15T23:00:00.000Z");
  assert.equal(limited.spent_usd, 1.5);
  assert.match((await run(h, ["resume", RUN])).err, /the limit resets at 2026-11-15T23:00:00.000Z; resume it after/);
  h.tick(3_600_000);
  // The container was stopped meanwhile: resume starts it again.
  h.edit((cs) => {
    cs[2].State.Running = false;
  });
  assert.equal((await run(h, ["resume", RUN])).status, 0);
  assert.equal((await run(h, ["wait", RUN])).out[0].phase, "done");
  assert.equal(h.call(2).argv[h.call(2).argv.indexOf("--max-budget-usd") + 1], "73.50");
});

test("an attempt that printed no result failed, and the attempts after the last price are counted", async (t) => {
  const h = host();
  t.after(h.done);
  h.plan(1, { lines: [init(), result(2, null)] });
  h.plan(2, { lines: [init(), "half a li"], exit: 1 });
  await run(h, ["start", "sim", "T7"]);
  assert.equal((await run(h, ["wait", RUN])).out[0].reason, "the run gave no status by status.schema.json");
  await run(h, ["resume", RUN]);
  const state = (await run(h, ["wait", RUN])).out[0];
  assert.equal(state.reason, "claude exited with 1 and printed no result");
  assert.equal(state.spent_usd, 2);
  assert.equal(state.unpriced_attempts, 1);
});

test("start takes a prompt, a container by name and a folder, and refuses what is not a task or a ceiling", async (t) => {
  const h = host();
  t.after(h.done);
  fs.mkdirSync(h.deps.home, { recursive: true });
  const prompt = path.join(h.deps.home, "prompt.md");
  fs.writeFileSync(prompt, "Запиши задачу T9 и выполни её.");
  // A prompt's file outside the orchestrator's folder is not read.
  const outside = path.join(h.root, "prompt.md");
  fs.writeFileSync(outside, "x");
  for (const file of [outside, path.join(h.deps.home, "..", "prompt.md")]) {
    assert.match((await run(h, ["start", "sim", "T9", "--prompt", file])).err, /a prompt's file must lie in /);
  }
  h.plan(1, { lines: [init(), result(1)] });
  h.plan(2, { lines: [init(), result(1)] });
  assert.equal((await run(h, ["start", "dup", "T9", "--container", "dup_two", "--prompt", prompt])).status, 0);
  await run(h, ["wait", "dup-T9-20261115T220000Z"]);
  assert.equal(h.call(1).stdin, "Запиши задачу T9 и выполни её.");
  h.tick(1000);
  const byFolder = await run(h, ["start", "infra", "T3", "--folder", "/home/someone/projects/mathtrail/infra"]);
  assert.equal(byFolder.out[0].container, "elastic_liskov");
  assert.match((await run(h, ["start", "sim", "7"])).err, /not a task: 7/);
  // T09 and T9 are one task, and the run is named by the number.
  h.plan(3, { lines: [init(), result(1)] });
  h.tick(1000);
  assert.equal((await run(h, ["start", "sim", "T09"])).out[0].run, "sim-T9-20261115T220002Z");
  h.tick(-1000);
  assert.match((await run(h, ["start", "tutor", "T7"])).err, /no container of tutor/);
  assert.match((await run(h, ["start", "bare", "T7"])).err, /the volume novatrail-claude is not mounted/);
  // Two starts of one task in the same second would share a folder.
  h.tick(-1000);
  assert.match((await run(h, ["start", "dup", "T9", "--container", "dup_two"])).err, /EEXIST/);
});

test("status of every run, oldest first; a run that is not there, or not a run's id, is an error", async (t) => {
  const h = host();
  t.after(h.done);
  assert.deepEqual((await run(h, ["status"])).out, []);
  h.plan(1, { lines: [init(), result(1)] });
  h.plan(2, { lines: [init(), result(1)] });
  h.tick(5000);
  await run(h, ["start", "sim", "T7"]);
  h.tick(-2000);
  await run(h, ["start", "infra", "T2"]);
  const all = (await run(h, ["status"])).out.map((s) => s.run);
  assert.deepEqual(all, ["infra-T2-20261115T220003Z", "sim-T7-20261115T220005Z"]);
  assert.match((await run(h, ["status", "sim-T7-20261115T230000Z"])).err, /no run sim-T7-20261115T230000Z in /);
  assert.match((await run(h, ["status", "../x"])).err, /not a run's id: \.\.\/x/);
  assert.match((await run(h, ["wait", "sim-T8-20261115T220000Z"])).err, /no run sim-T8/);
});

test("a wrong command line exits 2 with what is wrong", async (t) => {
  const h = host();
  t.after(h.done);
  for (const [argv, said] of [
    [[], /^orchestrator: start <repo>/],
    [["merge"], /^orchestrator: start <repo>/],
    [["start", "sim"], /^orchestrator: start <repo>/],
    [["wait"], /^orchestrator: start <repo>/],
    [["sync", "x"], /^orchestrator: start <repo>/],
    [["start", "sim", "T7", "--model", "sonnet"], /^start: an unknown option$/],
    [["start", "sim", "T7", "--ceiling", "-1"], /^start: an option without its value$|^--ceiling: not a positive number$/],
    [["start", "sim", "T7", "--ceiling", "lots"], /^--ceiling: not a positive number$/],
    [["wait", RUN, "--timeout", "0"], /^--timeout: not a positive number$/],
  ]) {
    const done = await run(h, argv);
    assert.equal(done.status, 2, argv.join(" "));
    assert.match(done.err, said);
  }
  assert.deepEqual(argumentsOf(["status", "a", "b"]), { command: "status", words: ["a", "b"], values: {} });
});

test("a ceiling is a positive number however it comes", async (t) => {
  const h = host();
  t.after(h.done);
  const { start, resume } = await import("../runs.mjs");
  assert.throws(() => start({ repo: "sim", task: "T7", ceiling: 0 }, h.deps), /not a ceiling of cost: 0/);
  h.plan(1, { lines: [init(), result(1)] });
  await run(h, ["start", "sim", "T7"]);
  await run(h, ["wait", RUN]);
  assert.throws(() => resume(RUN, { ceiling: Number.NaN }, h.deps), /not a ceiling of cost: NaN/);
  // A container gone, and none by its labels either.
  h.edit((cs) => cs.splice(2, 1));
  assert.throws(() => resume(RUN, {}, h.deps), /no container of sim by devcontainer.local_folder=/);
  // Any other failure of docker is no container gone.
  const docker = h.deps.docker;
  h.deps.docker = (args) => {
    if (args[0] === "inspect") throw new Error("docker inspect: Cannot connect to the Docker daemon");
    return docker(args);
  };
  assert.throws(() => resume(RUN, {}, h.deps), /Cannot connect to the Docker daemon/);
});

test("sync clones spec's main, moves it forward, and refuses a clone with changes", async (t) => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "orchestrator-sync-")));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const origin = path.join(root, "origin");
  fs.mkdirSync(origin);
  const commit = (text) => {
    fs.writeFileSync(path.join(origin, "RUN.md"), text);
    git(origin, ["add", "RUN.md"]);
    git(origin, ["-c", "user.name=t", "-c", "user.email=t@example.com", "commit", "--quiet", "-m", text]);
    return git(origin, ["rev-parse", "HEAD"]).trim();
  };
  git(origin, ["init", "--quiet", "--initial-branch=main"]);
  const first = commit("one");
  const home = path.join(root, "home");
  const out = [];
  assert.equal(await main(["sync"], { home, specUrl: origin, out: (l) => out.push(l), err: () => {} }), 0);
  assert.deepEqual(JSON.parse(out[0]), { path: path.join(home, "spec"), commit: first });
  const second = commit("two");
  assert.deepEqual(sync({ home, url: origin }), { path: path.join(home, "spec"), commit: second });
  fs.writeFileSync(path.join(home, "spec", "RUN.md"), "edited");
  assert.throws(() => sync({ home, url: origin }), /has changes of its own: the orchestrator's clone is never edited/);
});

test("the defaults are the host's docker, the volume and the clock, and the script runs as a program", () => {
  const d = defaults({ CLAUDE_CONFIG_DIR: "/somewhere" });
  assert.equal(d.home, "/somewhere/novatrail-orchestrator");
  assert.equal(homeOf({}), path.join(os.homedir(), ".claude", "novatrail-orchestrator"));
  assert.ok(d.now() instanceof Date);
  assert.match(d.uuid(), /^[0-9a-f-]{36}$/);
  d.sleep(1);
  assert.throws(() => d.docker(["--no-such-flag"]), /docker --no-such-flag/);
  const lines = [];
  const log = console.log;
  const error = console.error;
  console.log = (l) => lines.push(l);
  console.error = (l) => lines.push(l);
  try {
    d.out("out");
    d.err("err");
  } finally {
    console.log = log;
    console.error = error;
  }
  assert.deepEqual(lines, ["out", "err"]);
  const cli = spawnSync(process.execPath, [MAIN], { encoding: "utf8" });
  assert.equal(cli.status, 2);
  assert.match(cli.stderr, /^orchestrator: start <repo>/);
});

test("stop ends claude and what it left in the background, not its sh; the attempt is stopped, its cost from the transcript", async (t) => {
  const h = host();
  t.after(h.done);
  h.deps.sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Math.min(ms, 20));
  h.plan(1, { lines: [init()], hold: true, child: true });
  h.plan(2, { lines: [init(), result(0.08)] });
  await run(h, ["start", "sim", "T7"]);
  const sh = await pidOf(h);
  const { claude, child } = await h.pids(1);
  transcript(h);
  assert.equal((await run(h, ["status", RUN])).out[0].phase, "running");

  const stopped = await run(h, ["stop", RUN]);
  assert.equal(stopped.status, 0, stopped.err);
  const [state] = stopped.out;
  assert.equal(state.phase, "stopped");
  assert.equal(state.reason, "stopped by the orchestrator at 2026-11-15T22:00:00.000Z");
  assert.equal(state.spent_usd, 0.062);
  assert.equal(state.spent_from, "transcript");
  assert.equal(state.unpriced_attempts, 0);
  assert.equal(state.num_turns, null);
  // claude and its child got the signal; the sh wrote claude's exit code, 128 + SIGTERM.
  assert.ok(ended(claude) && ended(child));
  const dir = path.join(h.deps.home, "runs", RUN);
  assert.equal(fs.readFileSync(path.join(dir, "exit-1"), "utf8").trim(), "143");
  assert.deepEqual(saved(h).attempts[0].stopped, { time: "2026-11-15T22:00:00.000Z", by: "orchestrator", signal: "TERM" });
  assert.deepEqual(events(h).at(-1), { time: "2026-11-15T22:00:00.000Z", event: "stop", attempt: 1, signal: "TERM", processes: 2, survivors: 0, container: "jovial_cannon" });
  assert.deepEqual(h.dockerCalls().find((c) => c.includes(STOP)), ["exec", "--user", "vscode", "cccc3333sim", "sh", "-c", STOP, "sh", "TERM", String(sh)]);

  // A stopped run is not stopped again, and resumes; its next total is the session's.
  assert.match((await run(h, ["stop", RUN])).err, /does not run: its last attempt is stopped/);
  assert.equal((await run(h, ["resume", RUN])).status, 0);
  const done = (await run(h, ["wait", RUN])).out[0];
  assert.equal(done.phase, "done");
  assert.equal(done.spent_usd, 0.08);
  assert.equal(done.spent_from, "result");
  assert.equal(h.call(2).argv[h.call(2).argv.indexOf("--max-budget-usd") + 1], "74.94");
});

test("stop kills what SIGTERM did not end, and says so when even SIGKILL does not", async (t) => {
  const h = host();
  t.after(h.done);
  h.deps.stopWait = { TERM: 2, KILL: 30 };
  h.plan(1, { lines: [init()], hold: true, ignoreTerm: true, child: true });
  h.plan(2, { lines: [init()], hold: true });
  await run(h, ["start", "sim", "T7"]);
  await pidOf(h);
  const { claude } = await h.pids(1);
  const state = (await run(h, ["stop", RUN])).out[0];
  assert.equal(state.phase, "stopped");
  assert.ok(ended(claude));
  assert.equal(saved(h).attempts[0].stopped.signal, "KILL");
  assert.equal(fs.readFileSync(path.join(h.deps.home, "runs", RUN, "exit-1"), "utf8").trim(), "137");
  // Nothing priced, and no transcript: the attempt is unpriced.
  assert.equal(state.spent_from, null);
  assert.equal(state.unpriced_attempts, 1);

  // An attempt that has not written its pid yet is not stopped; nor one that a signal does not end.
  await run(h, ["resume", RUN]);
  const pid = await pidOf(h, 2);
  const file = path.join(h.deps.home, "runs", RUN, "pid-2");
  fs.renameSync(file, `${file}.away`);
  assert.match((await run(h, ["stop", RUN])).err, /attempt 2 has not written its pid yet; stop it in a minute/);
  fs.renameSync(`${file}.away`, file);
  const docker = h.deps.docker;
  h.deps.docker = (args) => (args.includes(STOP) ? "" : docker(args));
  h.deps.stopWait = { TERM: 1, KILL: 1 };
  assert.match((await run(h, ["stop", RUN])).err, /attempt 2 still runs after SIGKILL/);
  assert.equal(saved(h).attempts[1].stopped, undefined);
  h.release(2);
  while (!ended(pid)) await pause(10);
});

test("an attempt with no result is priced by the transcript, unless a call in it has no price", async (t) => {
  const h = host();
  t.after(h.done);
  h.plan(1, { lines: [init(), result(0.01, null)] });
  h.plan(2, { lines: [init(), "half a li"], exit: 1 });
  await run(h, ["start", "sim", "T7"]);
  await run(h, ["wait", RUN]);
  await run(h, ["resume", RUN]);
  transcript(h);
  const state = (await run(h, ["wait", RUN])).out[0];
  assert.equal(state.phase, "failed");
  assert.equal(state.spent_usd, 0.062);
  assert.equal(state.spent_from, "transcript");
  assert.equal(state.unpriced_attempts, 0);
  // A model with no price: the transcript's sum is a floor, and the attempt is still unpriced.
  h.transcript("sim", SESSION, [message("m1", { output_tokens: 100 }), message("m2", { output_tokens: 100 }, "claude-unknown")]);
  const floor = (await run(h, ["status", RUN])).out[0];
  assert.equal(floor.spent_usd, 0.01);
  assert.equal(floor.spent_from, "result");
  assert.equal(floor.unpriced_attempts, 1);
});

test("a run whose status names another number takes it, keeps the first, and goes by both", async (t) => {
  const h = host();
  t.after(h.done);
  h.plan(1, { lines: [init(), result(2, { ...STATUS, status: "waiting", task: "T08", pull_request: null, questions: [QUESTION] })] });
  h.plan(2, { lines: [init(), result(3, { ...STATUS, task: "T8" })] });
  await run(h, ["start", "sim", "T7"]);
  const state = (await run(h, ["wait", RUN])).out[0];
  assert.equal(state.task, "T8");
  assert.deepEqual(state.labels, ["T7", "T8"]);
  assert.equal(state.run, RUN, "the run's id stays");
  assert.deepEqual([saved(h).task, saved(h).labels], ["T8", ["T7", "T8"]]);
  assert.deepEqual(events(h).at(-1), { time: "2026-11-15T22:00:00.000Z", event: "relabel", from: "T7", to: "T8" });
  await run(h, ["resume", RUN]);
  // The hook of the session takes both numbers as one task.
  const exec = h.dockerCalls().filter((c) => c[1] === "--detach").at(-1);
  assert.ok(exec.includes("NOVATRAIL_RUN_TASKS=T7 T8"));
  await run(h, ["wait", RUN]);
  assert.equal(h.call(2).tasks, "T7 T8");
  assert.equal((await run(h, ["status", RUN])).out[0].task, "T8");
  assert.equal(events(h).filter((e) => e.event === "relabel").length, 1);
});

test("resume after a rebuild finds the new container by its labels and goes on in the same session", async (t) => {
  const h = host();
  t.after(h.done);
  h.plan(1, { lines: [init(), result(2, { ...STATUS, status: "waiting", pull_request: null, questions: [QUESTION] })] });
  h.plan(2, { lines: [init(), result(3)] });
  await run(h, ["start", "sim", "T7"]);
  await run(h, ["wait", RUN]);
  // The author rebuilt sim's container: the old one is gone, a new one has its labels.
  h.edit((cs) => {
    const [old] = cs.splice(2, 1);
    cs.push({ ...old, Id: "9999aaaasim", Name: "/brave_turing", State: { Running: false } });
  });
  const resumed = await run(h, ["resume", RUN]);
  assert.equal(resumed.status, 0, resumed.err);
  assert.equal(resumed.out[0].container, "brave_turing");
  const exec = h.dockerCalls().filter((c) => c[1] === "--detach").at(-1);
  assert.ok(exec.includes("9999aaaasim"));
  assert.ok(h.dockerCalls().some((c) => c[0] === "start" && c[1] === "9999aaaasim"));
  assert.equal((await run(h, ["wait", RUN])).out[0].phase, "done");
  assert.equal(h.call(2).argv[h.call(2).argv.indexOf("--resume") + 1], SESSION);
  assert.equal(saved(h).container.id, "9999aaaasim");
  const moved = events(h).find((e) => e.event === "container");
  assert.deepEqual(moved, { time: "2026-11-15T22:00:00.000Z", event: "container", from: "jovial_cannon", to: "brave_turing", id: "9999aaaasim" });
});

test("a running attempt whose container was rebuilt is lost, and the run takes the new container", async (t) => {
  const h = host();
  t.after(h.done);
  h.plan(1, { lines: [init()], hold: true });
  await run(h, ["start", "sim", "T7"]);
  await pidOf(h);
  h.edit((cs) => {
    const [old] = cs.splice(2, 1);
    cs.push({ ...old, Id: "9999aaaasim", Name: "/brave_turing" });
  });
  const state = (await run(h, ["status", RUN])).out[0];
  assert.equal(state.phase, "lost");
  assert.equal(state.container, "brave_turing");
  assert.match((await run(h, ["stop", RUN])).err, /does not run: its last attempt is lost/);
  h.release(1);
});

test("turns and time are summed over every result of every attempt; the usage is the last one's", async (t) => {
  const h = host();
  t.after(h.done);
  const waiting = { ...STATUS, status: "waiting", pull_request: null, questions: [QUESTION] };
  h.plan(1, { lines: [init(), result(1, waiting, { num_turns: 10, duration_ms: 1000 }), result(1.5, waiting, { num_turns: 5, duration_ms: 500 })] });
  h.plan(2, { lines: [init(), "half a li"], exit: 1 });
  h.plan(3, { lines: [init(), result(3, STATUS, { num_turns: 7, duration_ms: 700 })] });
  await run(h, ["start", "sim", "T7"]);
  assert.equal((await run(h, ["wait", RUN])).out[0].num_turns, 15);
  await run(h, ["resume", RUN]);
  await run(h, ["wait", RUN]);
  await run(h, ["resume", RUN]);
  const state = (await run(h, ["wait", RUN])).out[0];
  assert.equal(state.num_turns, 22);
  assert.equal(state.duration_ms, 2200);
  assert.equal(state.model_usage["claude-opus-5-5"].costUSD, 3);
  assert.equal(state.spent_usd, 3);
});

test("next is one above main's, the open pull requests' and the runs not done of the repository", async (t) => {
  const h = host();
  t.after(h.done);
  const run1 = "sim-T7-20261115T220000Z";
  h.plan(1, { lines: [init(), result(1, { ...STATUS, status: "waiting", pull_request: null, questions: [QUESTION], task: "T41" })] });
  h.plan(2, { lines: [init(), result(1, { ...STATUS, task: "T50" })] });
  h.plan(3, { lines: [init(), result(1, { ...STATUS, task: "T60" })] });
  await run(h, ["start", "sim", "T7"]);
  await run(h, ["wait", run1]);
  h.tick(1000);
  await run(h, ["start", "sim", "T9"]);
  await run(h, ["wait", "sim-T9-20261115T220001Z"]);
  h.tick(1000);
  await run(h, ["start", "infra", "T3"]);
  await run(h, ["wait", "infra-T3-20261115T220002Z"]);
  const trees = { main: [["RUN.md", "a"]], h1: [["RUN.md", "a"]] };
  h.deps.gh = (args) => {
    const endpoint = args.find((a) => a.startsWith("repos/"));
    if (endpoint.includes("/pulls?")) return JSON.stringify([[{ number: 4, head: { sha: "h1" } }]]);
    if (endpoint.includes("/branches?")) return JSON.stringify([[{ name: "main", commit: { sha: "m0" } }]]);
    const tree = /git\/trees\/([^?]+)/.exec(endpoint);
    if (tree) return JSON.stringify({ truncated: false, tree: trees[tree[1]].map(([p, sha]) => ({ path: p, type: "blob", sha })) });
    return "| [x] | T40 | Задача |\n";
  };
  const next = await run(h, ["next", "sim"]);
  assert.equal(next.status, 0, next.err);
  // sim T7, relabelled T41, waits; sim T9, done as T50, is main's or a pull request's to hold.
  assert.deepEqual(next.out[0], { repo: "sim", next: "T42", main: "T40", pull_requests: [{ number: 4, task: "T40" }], branches: [], runs: [{ run: run1, task: "T41" }] });
  assert.match((await run(h, ["next", "../sim"])).err, /not a repository's name: \.\.\/sim/);
  // A run still running is counted, by its files alone: next asks docker nothing.
  h.plan(4, { lines: [init()], hold: true });
  h.tick(1000);
  await run(h, ["start", "sim", "T11"]);
  await pidOf(h, 1, "sim-T11-20261115T220003Z");
  const docker = h.deps.docker;
  h.deps.docker = () => assert.fail("next asked docker");
  assert.deepEqual((await run(h, ["next", "sim"])).out[0].runs.map((r) => r.task), ["T41", "T11"]);
  h.deps.docker = docker;
  h.release(4);
});

// The orchestrator runs from its clone of spec, which has no node_modules: its modules, and every
// module of tools/ they import — the prices of tokens-report, the hook's numbers —, take only Node's
// own modules and each other.
test("the orchestrator takes nothing from node_modules", () => {
  const seen = new Set();
  const visit = (file) => {
    if (seen.has(file)) return;
    seen.add(file);
    for (const [, specifier] of fs.readFileSync(file, "utf8").matchAll(/^import\s[^"']*["']([^"']+)["']/gm)) {
      if (specifier.startsWith("node:")) continue;
      assert.ok(specifier.startsWith("."), `${path.relative(HERE, file)} imports ${specifier}`);
      visit(path.resolve(path.dirname(file), specifier));
    }
  };
  visit(MAIN);
  assert.ok([...seen].some((f) => f.endsWith(path.join("tokens", "prices.mjs"))));
  assert.ok([...seen].some((f) => f.endsWith(path.join("session", "session.mjs"))));
});

test("a run started by the earlier contract, whose schema named no task, is read with its own number", async (t) => {
  const h = host();
  t.after(h.done);
  const { task, ...earlier } = STATUS;
  h.plan(1, { lines: [init(), result(1, earlier)], hold: true });
  await run(h, ["start", "sim", "T7"]);
  const dir = path.join(h.deps.home, "runs", RUN);
  const schema = JSON.parse(fs.readFileSync(path.join(dir, "status.schema.json"), "utf8"));
  delete schema.properties.task;
  schema.required = schema.required.filter((k) => k !== "task");
  fs.writeFileSync(path.join(dir, "status.schema.json"), JSON.stringify(schema));
  h.release(1);
  const state = (await run(h, ["wait", RUN])).out[0];
  assert.equal(state.phase, "done");
  assert.deepEqual(state.status, { ...earlier, task: "T7" });
  // This copy's schema asks for the number: a status without it is none.
  fs.copyFileSync(path.join(HERE, "..", "status.schema.json"), path.join(dir, "status.schema.json"));
  assert.equal((await run(h, ["status", RUN])).out[0].reason, "the run gave no status by status.schema.json");
  fs.writeFileSync(path.join(dir, "status.schema.json"), "not JSON");
  assert.equal((await run(h, ["status", RUN])).out[0].phase, "failed");
});

test("a write of the run takes run.json as it is now: an older copy undoes nothing another command saved", async (t) => {
  const { loadRun, stateOf } = await import("../runs.mjs");
  const h = host();
  t.after(h.done);
  h.plan(1, { lines: [init(), result(2, { ...STATUS, task: "T8" })], hold: true });
  await run(h, ["start", "sim", "T7"]);
  // A wait loaded the run; then another command saved it, before the wait relabels it.
  const stale = loadRun(h.deps.home, RUN);
  h.release(1);
  while (!fs.existsSync(path.join(h.deps.home, "runs", RUN, "exit-1"))) await pause(10);
  const file = path.join(h.deps.home, "runs", RUN, "run.json");
  const other = JSON.parse(fs.readFileSync(file, "utf8"));
  fs.writeFileSync(file, JSON.stringify({ ...other, ceiling_usd: 9, attempts: [...other.attempts, { n: 2, kind: "resume", started: "2026-11-15T22:00:00.000Z", budget_usd: 7 }] }));
  stateOf(h.deps.home, stale, h.deps);
  const saved = JSON.parse(fs.readFileSync(file, "utf8"));
  assert.equal(saved.task, "T8");
  assert.equal(saved.ceiling_usd, 9);
  assert.equal(saved.attempts.length, 2);
  assert.equal(stale.ceiling_usd, 9, "the copy in hand is the file's after the write");
});

test("stop ends a child that outlived claude and SIGTERM, by the pid and time of start the first round named", async (t) => {
  const h = host();
  t.after(h.done);
  h.deps.sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Math.min(ms, 20));
  h.deps.stopWait = { TERM: 5, KILL: 30 };
  h.plan(1, { lines: [init()], hold: true, stubbornChild: true });
  await run(h, ["start", "sim", "T7"]);
  await pidOf(h);
  const { claude, child } = await h.pids(1);
  const stopped = await run(h, ["stop", RUN]);
  assert.equal(stopped.status, 0, stopped.err);
  assert.ok(ended(claude) && ended(child));
  // claude ended by SIGTERM; its child, which the first process took over, by SIGKILL.
  assert.equal(fs.readFileSync(path.join(h.deps.home, "runs", RUN, "exit-1"), "utf8").trim(), "143");
  assert.equal(saved(h).attempts[0].stopped.signal, "KILL");
  assert.equal(events(h).at(-1).survivors, 0);
  const kill = h.dockerCalls().find((c) => c.includes(STOP) && c.includes("KILL"));
  assert.ok(kill.some((word) => word.startsWith(`${child}:`)), "SIGKILL names the child the first round named");
});

for (const kind of ["child", "stubbornChild"]) {
  test(`a host's end leaves none of its runs' processes: a claude held and never released, and its ${kind}`, async () => {
    const h = host();
    h.plan(1, { lines: [init()], hold: true, [kind]: true });
    await run(h, ["start", "sim", "T7"]);
    const sh = await pidOf(h);
    const { claude, child } = await h.pids(1);
    h.done();
    await pause(50);
    assert.ok(ended(sh) && ended(claude) && ended(child));
  });
}

test("STOP signals a process it was given only while its time of start is the same: a pid passed on is left alone", () => {
  const start = (pid) => fs.readFileSync(`/proc/${pid}/stat`, "utf8").split(") ").at(-1).split(" ")[19];
  const child = spawnSync(process.execPath, ["-e", "1"]);
  assert.equal(child.status, 0);
  const named = (given) => spawnSync("sh", ["-c", STOP, "sh", "-", "999999999", ...given], { encoding: "utf8" }).stdout.trim();
  const mine = `${process.pid}:${start(process.pid)}`;
  assert.equal(named([mine]), mine);
  assert.equal(named([`${process.pid}:1`]), "");
  assert.equal(named(["999999998:1"]), "");
  // Nothing below a process that is not there, and its own sh is none of them.
  assert.equal(named([]), "");
});

test("a transcript that comes to less than the results leaves an attempt after them unpriced; it is read once while it is the same", async (t) => {
  const { sessionCost } = await import("../transcript.mjs");
  const h = host();
  t.after(h.done);
  h.plan(1, { lines: [init(), result(0.08, null)] });
  h.plan(2, { lines: [init(), "half a li"], exit: 1 });
  await run(h, ["start", "sim", "T7"]);
  await run(h, ["wait", RUN]);
  await run(h, ["resume", RUN]);
  transcript(h);
  const state = (await run(h, ["wait", RUN])).out[0];
  assert.equal(state.spent_usd, 0.08);
  assert.equal(state.spent_from, "result");
  assert.equal(state.unpriced_attempts, 1);
  // The same files, by size and time of change, give what they gave, unread.
  const workdir = path.join(h.root, "workspaces", "sim");
  const dir = path.join(h.volume, "projects", workdir.replace(/[^a-zA-Z0-9]/g, "-"));
  const main = path.join(dir, `${SESSION}.jsonl`);
  const mtime = new Date("2026-11-15T21:00:00Z");
  fs.utimesSync(main, mtime, mtime);
  const first = sessionCost(h.volume, workdir, SESSION);
  fs.writeFileSync(main, fs.readFileSync(main, "utf8").replace(/"m1"/g, '"x1"').replace(/"output_tokens":500/, '"output_tokens":999'));
  fs.utimesSync(main, mtime, mtime);
  assert.deepEqual(sessionCost(h.volume, workdir, SESSION), first);
  fs.utimesSync(main, new Date(mtime.getTime() + 1000), new Date(mtime.getTime() + 1000));
  assert.notDeepEqual(sessionCost(h.volume, workdir, SESSION), first);
});
