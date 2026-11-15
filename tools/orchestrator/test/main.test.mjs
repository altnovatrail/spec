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
import { CONTINUE, GIT_ENV, homeOf, SCRIPT, sync } from "../runs.mjs";
import { allowed, host, init, QUESTION, result, STATUS } from "./fakes.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN = path.join(HERE, "..", "main.mjs");
const CONTRACT = fs.readFileSync(path.join(HERE, "..", "executor.md"), "utf8");
const SCHEMA = fs.readFileSync(path.join(HERE, "..", "status.schema.json"), "utf8");
const SESSION = "0f0e0d0c-0b0a-4908-8706-050403020100";
const RUN = "sim-T7-20261115T220000Z";

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
  const env = Object.entries(GIT_ENV).flatMap(([k, v]) => ["--env", `${k}=${v}`]);
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
  h.edit((cs) => cs.splice(2, 1));
  assert.throws(() => resume(RUN, {}, h.deps), /No such object: cccc3333sim/);
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
