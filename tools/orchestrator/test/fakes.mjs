// Stand-ins for docker, claude and the Dev Containers CLI, and a host of made-up containers for
// them: none of it is a real container, session or stream. The fake docker keeps its containers in a
// JSON file, writes down each call, runs the command of an exec here, with the environment the exec
// gives — a login bash as a plain one —, and the command of a run here too, in its workdir, once
// each folder it mounts is there; top prints the processes a test gave a container. The fake claude
// writes down its arguments, its stdin and the git variables it got, and prints the stream that the
// test laid out for its call. The fake devcontainer writes down its arguments, and makes a container
// labelled by its folder and configuration, removing the one there with --remove-existing-container,
// unless the test laid out that it fails.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { homeOf } from "../runs.mjs";
import { runDocker } from "../containers.mjs";
import { runLong } from "../devcontainers.mjs";

// The program of the fake claude's background command that outlives SIGTERM.
const STUBBORN = "process.on('SIGTERM', () => {}); setInterval(() => {}, 1000)";

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
    else if (rest[i] === "--interactive") continue;
    else if (rest[i] === "--user") i += 1;
    else if (rest[i] === "--workdir") workdir = rest[++i];
    else if (rest[i] === "--env") { const kv = rest[++i]; const at = kv.indexOf("="); env[kv.slice(0, at)] = kv.slice(at + 1); }
    else break;
  }
  const c = find(rest[i]);
  if (!c) fail("Error: No such container: " + rest[i]);
  if (!c.State.Running) fail("Error response from daemon: container " + c.Id + " is not running");
  const [program, ...more] = rest.slice(i + 1);
  // A login shell here would read this machine's profile, which may set PATH anew.
  if (program === "bash" && more[0] === "-lc") more[0] = "-c";
  if (program === "setsid" && more[0] === "bash" && more[1] === "-lc") more[1] = "-c";
  const options = { cwd: workdir, env: { ...process.env, ...env } };
  if (detach) spawn(program, more, { ...options, detached: true, stdio: "ignore" }).unref();
  else process.exit(spawnSync(program, more, { ...options, stdio: "inherit" }).status ?? 1);
} else if (command === "rm") {
  const c = find(rest.at(-1));
  if (!c) fail("Error response from daemon: No such container: " + rest.at(-1));
  state.containers = state.containers.filter((x) => x !== c);
  fs.writeFileSync(file, JSON.stringify(state));
} else if (command === "top") {
  const c = find(rest[0]);
  if (!c) fail("Error: No such container: " + rest[0]);
  console.log("PID                 COMMAND");
  for (const p of c.processes || []) console.log(p);
} else if (command === "run") {
  let workdir = null, i = 0;
  for (; i < rest.length && rest[i].startsWith("--"); i += 1) {
    if (rest[i] === "--rm" || rest[i] === "--init") continue;
    const value = rest[++i];
    if (rest[i - 1] === "--workdir") workdir = value;
    const source = rest[i - 1] === "--mount" && /(?:^|,)source=([^,]+)/.exec(value)?.[1];
    if (source && source !== "/var/run/docker.sock" && !fs.existsSync(source)) fail("docker: Error response from daemon: invalid mount config for type bind: bind source path does not exist: " + source);
  }
  const [program, ...more] = rest.slice(i + 1);
  process.exit(spawnSync(program, more, { cwd: workdir, stdio: "inherit" }).status ?? 1);
} else fail("fake docker: no " + command);
`;

const CLAUDE = `#!/usr/bin/env node
const fs = require("node:fs");
const dir = process.env.FAKE_CLAUDE;
const n = fs.readdirSync(dir).filter((f) => /^call-\\d+\\.json$/.test(f)).length + 1;
const git = Object.fromEntries(Object.entries(process.env).filter(([k]) => k.startsWith("GIT_CONFIG_")));
fs.writeFileSync(dir + "/call-" + n + ".json", JSON.stringify({ argv: process.argv.slice(2), stdin: fs.readFileSync(0, "utf8"), git, tasks: process.env.NOVATRAIL_RUN_TASKS ?? null }));
const plan = fs.existsSync(dir + "/plan-" + n + ".json") ? JSON.parse(fs.readFileSync(dir + "/plan-" + n + ".json", "utf8")) : { lines: [], exit: 0 };
// A command it leaves in the background, as claude's Bash may, and the pids of both.
if (plan.child) {
  const child = require("node:child_process").spawn("sleep", ["300"], { stdio: "ignore" });
  fs.writeFileSync(dir + "/pids-" + n + ".json", JSON.stringify({ claude: process.pid, child: child.pid }));
}
// A command in the background that outlives SIGTERM, and claude: the container's first process
// takes it over when claude ends.
if (plan.stubbornChild) {
  const child = require("node:child_process").spawn(process.execPath, ["-e", ${JSON.stringify(STUBBORN)}], { stdio: "ignore" });
  fs.writeFileSync(dir + "/pids-" + n + ".json", JSON.stringify({ claude: process.pid, child: child.pid }));
}
if (plan.ignoreTerm) process.on("SIGTERM", () => {});
for (const line of plan.lines) process.stdout.write((typeof line === "string" ? line : JSON.stringify(line)) + "\\n");
const end = () => process.exit(plan.exit ?? 0);
// A held claude also ends once its test's folder is gone, so that it never outlives the test.
if (plan.hold) { const t = setInterval(() => { if (fs.existsSync(dir + "/release-" + n)) { clearInterval(t); end(); } else if (!fs.existsSync(dir)) process.exit(1); }, 20); } else end();
`;

const DEVCONTAINER = `#!/usr/bin/env node
const fs = require("node:fs");
const dir = process.env.FAKE_DOCKER;
const args = process.argv.slice(2);
fs.appendFileSync(dir + "/devcontainer.jsonl", JSON.stringify(args) + "\\n");
const plan = fs.existsSync(dir + "/up.json") ? JSON.parse(fs.readFileSync(dir + "/up.json", "utf8")) : {};
if (plan.fail) {
  process.stderr.write("fake devcontainer: " + plan.fail + "\\n");
  console.log(JSON.stringify({ outcome: "error", message: plan.fail }));
  process.exit(1);
}
const value = (key) => args[args.indexOf(key) + 1];
const folder = value("--workspace-folder");
const config = value("--config");
const file = dir + "/containers.json";
const state = JSON.parse(fs.readFileSync(file, "utf8"));
const same = (c) => c.Config.Labels["devcontainer.local_folder"] === folder && c.Config.Labels["devcontainer.config_file"] === config;
if (args.includes("--remove-existing-container")) state.containers = state.containers.filter((c) => !same(c));
const id = "beef" + state.containers.length + "made";
state.containers.push({ Id: id, Name: "/made_" + state.containers.length, State: { Running: true }, Config: { Labels: { "devcontainer.local_folder": folder, "devcontainer.config_file": config } }, Mounts: [] });
fs.writeFileSync(file, JSON.stringify(state));
console.log("[made] " + folder);
console.log(JSON.stringify({ outcome: "success", containerId: id, remoteUser: "vscode" }));
`;

// The host's folders of the clones, as Dev Containers labels the containers.
export const HOST = "/home/someone/projects/novatrail";

export function container(id, name, folder, { config = `${folder}/.devcontainer/devcontainer.json`, running = false, mounts = [], image = `sha256:image-of-${name}` } = {}) {
  return { Id: id, Name: `/${name}`, Image: image, State: { Running: running }, Config: { Labels: { "devcontainer.local_folder": folder, "devcontainer.config_file": config } }, Mounts: mounts };
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
  fs.writeFileSync(path.join(bin, "devcontainer"), DEVCONTAINER, { mode: 0o755 });
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
    dockerLong: (args, options) => runLong(args, { program: path.join(bin, "docker"), env, ...options }),
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
    bin,
    env,
    deps,
    docker,
    out,
    err,
    // Lays out what the fake claude prints on its n-th call.
    plan: (n, plan) => fs.writeFileSync(path.join(claudeDir, `plan-${n}.json`), JSON.stringify(plan)),
    release: (n) => fs.writeFileSync(path.join(claudeDir, `release-${n}`), ""),
    // The pids of the n-th call of claude and of the command it left in the background, once both run.
    pids: async (n) => {
      const file = path.join(claudeDir, `pids-${n}.json`);
      while (!fs.existsSync(file)) await new Promise((r) => setTimeout(r, 10));
      return JSON.parse(fs.readFileSync(file, "utf8"));
    },
    // Writes the transcript of a session in a repository's container, and of its subagents, as
    // Claude Code keeps them on the volume: records of JSON, or lines as they are.
    transcript: (repo, session, records, subagents = {}) => {
      const dir = path.join(volume, "projects", path.join(root, "workspaces", repo).replace(/[^a-zA-Z0-9]/g, "-"));
      const lines = (list) => list.map((r) => (typeof r === "string" ? r : JSON.stringify(r))).join("\n");
      fs.mkdirSync(path.join(dir, session, "subagents"), { recursive: true });
      fs.writeFileSync(path.join(dir, `${session}.jsonl`), lines(records));
      for (const [name, list] of Object.entries(subagents)) fs.writeFileSync(path.join(dir, session, "subagents", name), lines(list));
    },
    call: (n) => JSON.parse(fs.readFileSync(path.join(claudeDir, `call-${n}.json`), "utf8")),
    // Lays out that the fake devcontainer fails, and what it says.
    failUp: (message) => fs.writeFileSync(path.join(dockerDir, "up.json"), JSON.stringify({ fail: message })),
    upCalls: () => (fs.existsSync(path.join(dockerDir, "devcontainer.jsonl")) ? fs.readFileSync(path.join(dockerDir, "devcontainer.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []),
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
    // Ends whatever the host's runs left — the attempts' sh, a claude the test held and never
    // released, the commands it left in the background — before the folder goes: a held claude
    // waits for its release file forever, and a test that ends without it would leave it running.
    done: () => {
      for (const pid of leftovers(root, claudeDir)) {
        try {
          process.kill(pid, "SIGKILL");
        } catch {
          // Gone between the look and the signal.
        }
      }
      fs.rmSync(root, { recursive: true, force: true });
    },
  };
}

// The processes a host started: those whose command line names its folder, and the background
// commands of its claude, which do not. Linux's /proc, as the orchestrator's STOP reads it.
export function leftovers(root, claudeDir) {
  const pids = new Set();
  for (const name of fs.readdirSync("/proc")) {
    if (!/^\d+$/.test(name) || Number(name) === process.pid) continue;
    let line;
    try {
      line = fs.readFileSync(`/proc/${name}/cmdline`, "utf8");
    } catch {
      continue;
    }
    if (line.includes(root)) pids.add(Number(name));
  }
  // A background command's pid may have passed to another process since: only one with the same
  // command line is the fake's.
  const background = (pid) => {
    try {
      const line = fs.readFileSync(`/proc/${pid}/cmdline`, "utf8");
      return line === "sleep\x00300\x00" || line.includes(STUBBORN);
    } catch {
      return false;
    }
  };
  if (fs.existsSync(claudeDir)) {
    for (const file of fs.readdirSync(claudeDir).filter((f) => /^pids-\d+\.json$/.test(f))) {
      const { child } = JSON.parse(fs.readFileSync(path.join(claudeDir, file), "utf8"));
      if (background(child)) pids.add(child);
    }
  }
  return [...pids];
}

// A message of the model in a transcript, one record of its blocks: its id, model and usage.
export const message = (id, usage, model = "claude-opus-5-5") => ({ type: "assistant", message: { id, model, usage } });

// The events of a made-up stream.
export const init = (session = "0f0e0d0c-0b0a-4908-8706-050403020100") => ({ type: "system", subtype: "init", session_id: session, model: "claude-opus-5-5" });
export const allowed = { type: "rate_limit_event", rate_limit_info: { status: "allowed", resetsAt: 1795352400, rateLimitType: "seven_day" } };
export const STATUS = { status: "done", task: "T7", report: "Сделано: проверка.", plan: "", pull_request: "https://github.com/altnovatrail/sim/pull/1", questions: [], failure: null };
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
