// Stand-ins for docker and claude, and a host of made-up containers for them: none of it is a real
// container, session or stream. The fake docker keeps its containers in a JSON file, writes down
// each call, and runs the command of an exec here, with the environment the exec gives; the fake
// claude writes down its arguments, its stdin and the git variables it got, and prints the stream
// that the test laid out for its call.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { homeOf } from "../runs.mjs";
import { runDocker } from "../containers.mjs";

const DOCKER = `#!/usr/bin/env node
const fs = require("node:fs");
const { spawn, spawnSync } = require("node:child_process");
const dir = process.env.FAKE_DOCKER;
const file = dir + "/containers.json";
const state = JSON.parse(fs.readFileSync(file, "utf8"));
const args = process.argv.slice(2);
fs.appendFileSync(dir + "/calls.jsonl", JSON.stringify(args) + "\\n");
const find = (key) => state.containers.find((c) => c.Id === key || c.Id.startsWith(key) || c.Name === "/" + key);
const fail = (text) => { process.stderr.write(text + "\\n"); process.exit(1); };
const [command, ...rest] = args;
if (command === "ps") {
  const filters = [];
  for (let i = 0; i < rest.length; i += 1) if (rest[i] === "--filter") filters.push(rest[++i].slice("label=".length));
  for (const c of state.containers) {
    const labels = c.Config.Labels || {};
    if (filters.every((f) => { const at = f.indexOf("="); return labels[f.slice(0, at)] === f.slice(at + 1); })) console.log(c.Id);
  }
} else if (command === "inspect") {
  if (rest[0] !== "--type" || rest[1] !== "container") fail("fake docker: inspect without --type container");
  rest.splice(0, 2);
  const found = rest.map(find);
  if (found.some((c) => !c)) fail("Error: No such object: " + rest[found.indexOf(undefined)]);
  console.log(JSON.stringify(found));
} else if (command === "start") {
  const c = find(rest[0]);
  if (!c) fail("Error: No such container: " + rest[0]);
  if (!c.stuck) c.State.Running = true;
  fs.writeFileSync(file, JSON.stringify(state));
} else if (command === "exec") {
  let detach = false, workdir = null; const env = {}; let i = 0;
  for (; i < rest.length; i += 1) {
    if (rest[i] === "--detach") detach = true;
    else if (rest[i] === "--user") i += 1;
    else if (rest[i] === "--workdir") workdir = rest[++i];
    else if (rest[i] === "--env") { const kv = rest[++i]; const at = kv.indexOf("="); env[kv.slice(0, at)] = kv.slice(at + 1); }
    else break;
  }
  const c = find(rest[i]);
  if (!c) fail("Error: No such container: " + rest[i]);
  if (!c.State.Running) fail("Error response from daemon: container " + c.Id + " is not running");
  const [program, ...more] = rest.slice(i + 1);
  const options = { cwd: workdir, env: { ...process.env, ...env } };
  if (detach) spawn(program, more, { ...options, detached: true, stdio: "ignore" }).unref();
  else process.exit(spawnSync(program, more, { ...options, stdio: "inherit" }).status ?? 1);
} else fail("fake docker: no " + command);
`;

const CLAUDE = `#!/usr/bin/env node
const fs = require("node:fs");
const dir = process.env.FAKE_CLAUDE;
const n = fs.readdirSync(dir).filter((f) => /^call-\\d+\\.json$/.test(f)).length + 1;
const git = Object.fromEntries(Object.entries(process.env).filter(([k]) => k.startsWith("GIT_CONFIG_")));
fs.writeFileSync(dir + "/call-" + n + ".json", JSON.stringify({ argv: process.argv.slice(2), stdin: fs.readFileSync(0, "utf8"), git }));
const plan = fs.existsSync(dir + "/plan-" + n + ".json") ? JSON.parse(fs.readFileSync(dir + "/plan-" + n + ".json", "utf8")) : { lines: [], exit: 0 };
for (const line of plan.lines) process.stdout.write((typeof line === "string" ? line : JSON.stringify(line)) + "\\n");
const end = () => process.exit(plan.exit ?? 0);
if (plan.hold) { const t = setInterval(() => { if (fs.existsSync(dir + "/release-" + n)) { clearInterval(t); end(); } }, 20); } else end();
`;

// The host's folders of the clones, as Dev Containers labels the containers.
export const HOST = "/home/someone/projects/novatrail";

function container(id, name, folder, { config = `${folder}/.devcontainer/devcontainer.json`, running = false, mounts = [] } = {}) {
  return { Id: id, Name: `/${name}`, State: { Running: running }, Config: { Labels: { "devcontainer.local_folder": folder, "devcontainer.config_file": config } }, Mounts: mounts };
}

// A host in a temporary folder: the fake programs, the volume of Claude Code, the clones' folders
// inside the containers, and the containers — the orchestrator's own, spec's for documents, sim's
// stopped, two of infra in the folder of novatrail and one in that of mathtrail, two of dup running,
// and bare without the volume. `deps` are the overrides of main.mjs for this host.
export function host() {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "orchestrator-")));
  const bin = path.join(root, "bin");
  const dockerDir = path.join(root, "docker");
  const claudeDir = path.join(root, "claude-calls");
  const volume = path.join(root, "volume");
  for (const d of [bin, dockerDir, claudeDir, volume]) fs.mkdirSync(d);
  fs.writeFileSync(path.join(bin, "docker"), DOCKER, { mode: 0o755 });
  fs.writeFileSync(path.join(bin, "claude"), CLAUDE, { mode: 0o755 });
  const work = (repo) => {
    const dir = path.join(root, "workspaces", repo);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  };
  const mounts = (repo, folder = `${HOST}/${repo}`) => [
    { Type: "bind", Source: folder, Destination: work(repo) },
    { Type: "volume", Name: "novatrail-claude", Destination: volume },
  ];
  const containers = [
    container("aaaa1111self", "busy_gauss", `${HOST}/spec`, { config: `${HOST}/spec/.devcontainer/orchestrator/devcontainer.json`, running: true, mounts: mounts("spec") }),
    container("bbbb2222spec", "modest_lichterman", `${HOST}/spec`, { mounts: mounts("spec") }),
    container("cccc3333sim", "jovial_cannon", `${HOST}/sim`, { mounts: mounts("sim") }),
    container("dddd4444infra", "dreamy_robinson", `${HOST}/infra`, { running: true, mounts: mounts("infra") }),
    container("eeee5555infra", "old_infra", `${HOST}/infra`, { mounts: mounts("infra") }),
    container("ffff6666infra", "elastic_liskov", "/home/someone/projects/mathtrail/infra", { mounts: mounts("infra", "/home/someone/projects/mathtrail/infra") }),
    container("abab7777dup", "dup_one", `${HOST}/dup`, { running: true, mounts: mounts("dup") }),
    container("cdcd8888dup", "dup_two", `${HOST}/dup`, { running: true, mounts: mounts("dup") }),
    container("efef9999bare", "bare_one", `${HOST}/bare`, { running: true, mounts: [{ Type: "bind", Source: `${HOST}/bare`, Destination: work("bare") }] }),
  ];
  fs.writeFileSync(path.join(dockerDir, "containers.json"), JSON.stringify({ containers }));
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, FAKE_DOCKER: dockerDir, FAKE_CLAUDE: claudeDir, CLAUDE_CONFIG_DIR: volume };
  const docker = (args) => runDocker(args, { program: path.join(bin, "docker"), env });
  const out = [];
  const err = [];
  let clock = new Date("2026-11-15T22:00:00Z");
  const deps = {
    docker,
    home: homeOf({ CLAUDE_CONFIG_DIR: volume }),
    hostname: "aaaa1111",
    now: () => clock,
    uuid: () => "0f0e0d0c-0b0a-4908-8706-050403020100",
    sleep: () => {},
    interval: 20,
    out: (line) => out.push(line),
    err: (line) => err.push(line),
  };
  return {
    root,
    volume,
    deps,
    docker,
    out,
    err,
    // Lays out what the fake claude prints on its n-th call.
    plan: (n, plan) => fs.writeFileSync(path.join(claudeDir, `plan-${n}.json`), JSON.stringify(plan)),
    release: (n) => fs.writeFileSync(path.join(claudeDir, `release-${n}`), ""),
    call: (n) => JSON.parse(fs.readFileSync(path.join(claudeDir, `call-${n}.json`), "utf8")),
    dockerCalls: () => fs.readFileSync(path.join(dockerDir, "calls.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)),
    edit: (change) => {
      const file = path.join(dockerDir, "containers.json");
      const state = JSON.parse(fs.readFileSync(file, "utf8"));
      change(state.containers);
      fs.writeFileSync(file, JSON.stringify(state));
    },
    tick: (ms) => {
      clock = new Date(clock.getTime() + ms);
    },
    done: () => fs.rmSync(root, { recursive: true, force: true }),
  };
}

// The events of a made-up stream.
export const init = (session = "0f0e0d0c-0b0a-4908-8706-050403020100") => ({ type: "system", subtype: "init", session_id: session, model: "claude-opus-5-5" });
export const allowed = { type: "rate_limit_event", rate_limit_info: { status: "allowed", resetsAt: 1795352400, rateLimitType: "seven_day" } };
export const STATUS = { status: "done", report: "Сделано: проверка.", plan: "", pull_request: "https://github.com/altnovatrail/sim/pull/1", questions: [], failure: null };
export const QUESTION = {
  row: "В7",
  question: "Какой критерий взять?",
  options: [
    { label: "Первый", description: "Рекомендуемый." },
    { label: "Второй", description: "Дороже." },
  ],
  recommendation: "Первый: дешевле.",
};
export const result = (cost, structured = STATUS, extra = {}) => ({
  type: "result",
  subtype: "success",
  is_error: false,
  total_cost_usd: cost,
  num_turns: 3,
  duration_ms: 1200,
  modelUsage: { "claude-opus-5-5": { inputTokens: 10, outputTokens: 5, costUSD: cost } },
  structured_output: structured,
  ...extra,
});
