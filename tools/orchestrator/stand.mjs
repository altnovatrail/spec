// The stand of a task across repositories: api by `just dev-app`, on the stub of tutor or
// on the models; canvas built, then rebuilt by tsc on each change; app by `just dev-canvas
// ../canvas`; spec's mockup when asked; each in its own repository's container, on the epic's
// clones, so that no code of a clone runs in the orchestrator's container, which holds the socket.
// A relay listens on app's port, and the mockup's, in the orchestrator's container, whose window
// of VS Code forwards them to the author's browser: each server listens on 127.0.0.1 in its
// container, which publishes no port and shares no network with the orchestrator's. api is restarted on a change of what its build reads, and the models' spend is
// held to the stand's limit.
//
//   node tools/orchestrator/stand.mjs <epic's folder> [--docker <program>] [--hostname <name>]
//
// `xrepo serve` starts it as a process of its own, detached, and `xrepo stop` ends it by SIGTERM.
// Its files are in the epic's folder, under .stand/, which is the same path in every container:
// stand.json, what serve asked; state.json, where the stand is; <server>.pid, `<pid>:<start>` of
// each server's group of processes in its container; and a log of each start of a server. Every
// container can write the folder, so nothing in it names a program to run: the commands are this
// module's own, and what it reads there is held to numbers and to paths inside the epic's folder.

import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { DOCKER, isMain } from "../shared.mjs";
import { ensureRunning, findContainer, runDocker } from "./containers.mjs";

export const STAND = ".stand";
// The host's folder .epics, as every container mounts it, and an epic's name in it.
export const EPICS = "/workspaces/.epics";
export const EPIC = /^[a-z0-9][a-z0-9-]*$/;
// The ports: Vite's of app, which strictPort keeps; api's of dev-app, which app's Vite proxies to;
// spec's mockup. The relays listen on app's and the mockup's in the orchestrator's container.
export const PORTS = { app: 5173, api: 8080, mockup: 8156 };
// The models on the stand run on the developer key, up to $2 a session of the stand; above it, a
// question to the author.
export const LIMIT_USD = 2;
// A first dev-app in a fresh clone builds api and downloads its modules.
const READY_MS = 15 * 60_000;
// Edits come in bursts: a save of several files, a switch of branch.
export const DEBOUNCE_MS = 2000;
const STOP_WAIT_S = 30;
// What api's build does not read: a change there restarts nothing. In api's clone, `spec` is the
// submodule, which the go.work replaces with the epic's clone.
const IGNORED = new Set([".git", ".stand", "node_modules", "bin", "coverage", "lib", "build", "dist", "docs", "draft"]);

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export const stamp = (time) => time.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");

// A server's command in its container, by login bash, whose profile puts node, go and just on
// PATH: the pid's file and the log, then the command. setsid has made the bash the leader of a
// session and of its group, so one signal to the group reaches every process the server starts;
// the time of start, the twentieth field after the name in /proc/<pid>/stat, tells the group from
// a later one that got the same number. Each start writes a log of its own: a `>` over a log that
// an old process still writes leaves zeros at its head.
export const SERVER = [
  'pidfile=$1; log=$2; shift 2',
  'read -r stat < /proc/$$/stat',
  'start=$(set -- ${stat##*") "}; echo "${20}")',
  'echo "$$:$start" > "$pidfile.part" && mv "$pidfile.part" "$pidfile"',
  'exec "$@" >> "$log" 2>&1',
].join("\n");

// Counts the processes of the group $2 in the session of the same number — a server's —, and
// signals the group with $1 unless it is "-": prints the count from before the signal. A leader
// of that number with another time of start than $3 is another process, and the group is gone.
export const GROUP = [
  'sig=$1; pg=$2; start=$3; n=0',
  'for f in /proc/[0-9]*/stat; do',
  '  stat=; { read -r stat < "$f"; } 2>/dev/null || continue',
  '  p=${f#/proc/}; p=${p%/stat}',
  '  set -- ${stat##*") "}',
  '  [ "$1" = Z ] && continue',
  '  if [ "$p" = "$pg" ] && [ "${20}" != "$start" ]; then echo 0; exit 0; fi',
  '  [ "$3" = "$pg" ] && [ "$4" = "$pg" ] && n=$((n + 1))',
  'done',
  '[ "$sig" = - ] || [ "$n" = 0 ] || kill -s "$sig" -- "-$pg" 2>/dev/null || true',
  'echo "$n"',
].join("\n");

// What each server runs: commands of this module alone.
export function commandsOf({ ai = false, canvas = true, mockup = PORTS.mockup } = {}) {
  return {
    api: ai ? ["env", "API_DEV_APP_AI=1", "just", "dev-app"] : ["just", "dev-app"],
    canvas: ["node_modules/.bin/tsc", "-p", "tsconfig.build.json", "--watch", "--preserveWatchOutput"],
    app: canvas ? ["just", "dev-canvas", "../canvas"] : ["just", "dev"],
    mockup: ["node", "tools/mockup/serve.mjs", "--port", String(mockup)],
  };
}

// The repository each server runs in: the mockup in spec's documents container.
export const SERVERS = { api: "api", canvas: "canvas", app: "app", mockup: "spec" };

// `<pid>:<start>` of a pid's file, or null.
export function readPid(file) {
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
  const match = /^(\d+):(\d+)\n?$/.exec(text);
  return match ? { pid: Number(match[1]), start: Number(match[2]) } : null;
}

// How many processes the server's group has in its container, after the signal `sig` given.
export function groupOf(docker, id, record, sig = "-") {
  return Number(docker(["exec", "--user", "vscode", id, "bash", "-c", GROUP, "bash", sig, String(record.pid), String(record.start)]).trim()) || 0;
}

// Starts a server in its container, in its clone; its pid's record and its log.
export async function startServer(dir, name, { docker, id, clone, command, now }) {
  const pidFile = path.join(dir, `${name}.pid`);
  fs.rmSync(pidFile, { force: true });
  const log = path.join(dir, `${name}-${stamp(now())}.log`);
  docker(["exec", "--detach", "--user", "vscode", "--workdir", clone, id, "setsid", "bash", "-lc", SERVER, "bash", pidFile, log, ...command]);
  for (let i = 0; i < 200; i += 1) {
    const record = readPid(pidFile);
    if (record) return { ...record, log };
    await pause(50);
  }
  throw new Error(`${name}: no pid in 10 s; its log is ${log}`);
}

// Ends a server's group: SIGINT, as Ctrl-C, which dev.sh and Vite end on; then SIGKILL to what
// is left after STOP_WAIT_S seconds. How it ended: "gone", "INT" or "KILL".
export async function stopServer(docker, id, record, { wait = STOP_WAIT_S, step = 1000 } = {}) {
  if (!groupOf(docker, id, record, "INT")) return "gone";
  for (let i = 0; i < wait; i += 1) {
    await pause(step);
    if (!groupOf(docker, id, record)) return "INT";
  }
  groupOf(docker, id, record, "KILL");
  for (let i = 0; i < 10; i += 1) {
    await pause(step);
    if (!groupOf(docker, id, record)) return "KILL";
  }
  throw new Error(`the group ${record.pid} in ${id} outlived SIGKILL`);
}

// Whether a port of a container answers on 127.0.0.1, by node in the container.
export function portBusy(docker, id, port) {
  const code = 'const s=require("net").connect(Number(process.argv[1]),"127.0.0.1");s.on("connect",()=>{console.log("busy");s.destroy()});s.on("error",()=>console.log("free"))';
  return docker(["exec", "--user", "vscode", id, "bash", "-lc", 'exec node -e "$1" "$2"', "bash", code, String(port)]).trim() === "busy";
}

// The status of one request to 127.0.0.1:<port>, or null when nothing answers.
export function request(port, method, url, headers = {}) {
  return new Promise((resolve) => {
    const req = http.request({ host: "127.0.0.1", port, method, path: url, headers, timeout: 10_000 }, (res) => {
      res.resume();
      res.on("end", () => resolve(res.statusCode));
    });
    req.on("timeout", () => req.destroy());
    req.on("error", () => resolve(null));
    req.end();
  });
}

// The stand's own probe, through the relay, as the author's browser goes: app's page, its
// deployment configuration, and an RPC of api through app's proxy, which refuses a call with no
// token.
export async function probe(port) {
  return {
    root: await request(port, "GET", "/"),
    deployment: await request(port, "GET", "/deployment.json"),
    rpc: await request(port, "POST", "/novatrail.api.v1.AccountService/GetAccount", { "Content-Type": "application/proto", "Content-Length": "0" }),
  };
}

export const isReady = (p) => p.root === 200 && p.deployment === 200 && p.rpc === 401;

// What the models cost by api's logs, in dollars: each call of a model logs its cost by tutor's
// prices.
export function spentOf(logs) {
  let micro = 0;
  for (const log of logs) {
    let text = "";
    try {
      text = fs.readFileSync(log, "utf8");
    } catch {
      continue;
    }
    for (const [, n] of text.matchAll(/"cost_micro_usd":(\d+)/g)) micro += Number(n);
  }
  return micro / 1e6;
}

// The folders whose change restarts api: its clone, and each folder of the epic its go.work
// replaces a module with. The go.work is the clone's, which any container can write: a folder
// outside the epic's is not watched.
export function watchedOf(epicDir) {
  const api = path.join(epicDir, "api");
  const folders = new Set([api]);
  let work = "";
  try {
    work = fs.readFileSync(path.join(api, "go.work"), "utf8");
  } catch {
    return [...folders];
  }
  for (const [, target] of work.matchAll(/=>\s*(\S+)\s*$/gm)) {
    const full = path.resolve(api, target);
    const repo = path.relative(epicDir, full).split(path.sep)[0];
    if (!full.startsWith(epicDir + path.sep) || repo === ".." || !repo) continue;
    // A module inside a clone, as spec's contracts, is watched with its clone.
    folders.add(path.join(epicDir, repo));
  }
  return [...folders];
}

// Whether a change of `file`, relative to a watched folder, restarts api.
export function restarts(file, { inApi = false } = {}) {
  const parts = file.split(/[\\/]/);
  if (parts.some((p) => IGNORED.has(p)) || file.endsWith(".md")) return false;
  return !(inApi && parts[0] === "spec");
}

// The stand.json that serve wrote: what it asked, held to booleans and port numbers.
export function readConfig(dir) {
  const raw = JSON.parse(fs.readFileSync(path.join(dir, "stand.json"), "utf8"));
  const port = (p, fallback) => (Number.isInteger(p) && p >= 1024 && p <= 65535 ? p : fallback);
  const ports = raw.ports ?? {};
  return {
    ai: raw.ai === true,
    mockup: raw.mockup === true,
    limit_usd: typeof raw.limit_usd === "number" && raw.limit_usd > 0 ? raw.limit_usd : LIMIT_USD,
    ports: { app: port(ports.app, PORTS.app), api: port(ports.api, PORTS.api), mockup: port(ports.mockup, PORTS.mockup), relay: port(ports.relay, port(ports.app, PORTS.app)), mockup_relay: port(ports.mockup_relay, port(ports.mockup, PORTS.mockup)) },
  };
}

export function readState(dir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, "state.json"), "utf8"));
  } catch {
    return null;
  }
}

// The relay of a server's port: each connection to 127.0.0.1:<listen> here goes by `docker exec
// -i` into node in the server's container, to 127.0.0.1:<port> there. `container` gives its id,
// found again now and then: a rebuild gives it a new one. Its close ends the connections still open
// too: a browser keeps them, and Vite's websocket, which a server's own close would wait on for
// ever.
export const INNER = 'const s=require("net").connect(Number(process.argv[1]),"127.0.0.1");process.stdin.pipe(s);s.pipe(process.stdout);process.stdin.on("end",()=>s.end());s.on("error",()=>process.exit(1));s.on("close",()=>process.exit(0))';

export function relay({ listen, port, container, program, env, node }) {
  const open = new Set();
  const server = net.createServer((socket) => {
    open.add(socket);
    socket.on("close", () => open.delete(socket));
    let id;
    try {
      id = container();
    } catch {
      socket.destroy();
      return;
    }
    const child = spawn(program, ["exec", "--interactive", "--user", "vscode", id, node, "-e", INNER, String(port)], { env, stdio: ["pipe", "pipe", "ignore"] });
    socket.pipe(child.stdin);
    child.stdout.pipe(socket);
    socket.on("error", () => child.kill());
    socket.on("close", () => child.kill());
    child.stdin.on("error", () => socket.destroy());
    child.on("exit", () => socket.end());
  });
  const close = () =>
    new Promise((resolve) => {
      server.close(() => resolve());
      for (const socket of open) socket.destroy();
    });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(listen, "127.0.0.1", () => resolve({ close }));
  });
}

// Runs the stand of the epic's folder until stop() — the process's SIGTERM —, writing where it
// stands to state.json. Resolves `ready` once the probe passes, or rejects it with why not.
export function runStand(epicDir, { program = DOCKER, env = process.env, hostname = os.hostname(), now = () => new Date(), readyMs = READY_MS, debounceMs = DEBOUNCE_MS, wait = STOP_WAIT_S, step = 1000, countMs = 5000 } = {}) {
  const dir = path.join(epicDir, STAND);
  const config = readConfig(dir);
  const docker = (args, options = {}) => runDocker(args, { program, env, ...options });
  const sleepSync = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  const has = (repo) => fs.existsSync(path.join(epicDir, repo, ".git"));
  const containerOf = (repo) => ensureRunning(findContainer(repo, { docker, hostname }), { docker, sleep: sleepSync }).Id;
  // A relay's container, looked up again at most every ten seconds: each look is three calls of
  // docker, which would hold the stand's loop for every connection a browser opens.
  const cached = (repo) => {
    let id = null;
    let at = 0;
    return () => {
      if (!id || Date.now() - at > 10_000) {
        id = containerOf(repo);
        at = Date.now();
      }
      return id;
    };
  };
  const state = { phase: "starting", pid: process.pid, started: now().toISOString(), ai: config.ai, limit_usd: config.limit_usd, spent_usd: 0, restarts: 0, relay: config.ports.relay, servers: {}, mockup: null, probe: null, error: null };
  const save = () => {
    const file = path.join(dir, "state.json");
    fs.writeFileSync(`${file}.part`, `${JSON.stringify(state, null, 1)}\n`);
    fs.renameSync(`${file}.part`, file);
  };
  const ids = {};
  const watchers = [];
  const timers = [];
  const relays = [];
  let stopping = false;
  let restarting = null;

  const start = async (name) => {
    const repo = SERVERS[name];
    ids[name] = containerOf(repo);
    const record = await startServer(dir, name, { docker, id: ids[name], clone: path.join(epicDir, repo), command: commandsOf({ ai: config.ai, canvas: has("canvas"), mockup: config.ports.mockup })[name], now });
    const logs = [...(state.servers[name]?.logs ?? []), record.log];
    state.servers[name] = { repo, pid: record.pid, start: record.start, log: record.log, logs };
    save();
  };
  const stopOne = async (name) => {
    const s = state.servers[name];
    if (!s || !ids[name]) return;
    await stopServer(docker, ids[name], s, { wait, step });
  };
  const alive = (name) => groupOf(docker, ids[name], state.servers[name]) > 0;
  const until = async (what, deadline) => {
    for (;;) {
      // At the limit api is stopped for good: the stand waits for it no more.
      if (state.phase === "over-limit") return;
      state.probe = await probe(config.ports.relay);
      save();
      if (isReady(state.probe)) return;
      for (const name of Object.keys(state.servers)) {
        // api stopped at the limit is no failure.
        if ((name !== "api" || state.phase !== "over-limit") && !alive(name)) throw new Error(`${name} stopped ${what}; its log is ${state.servers[name].log}`);
      }
      if (now().getTime() > deadline) throw new Error(`the probe did not pass in ${readyMs / 60_000} minutes ${what}: ${JSON.stringify(state.probe)}`);
      await pause(Math.min(2000, readyMs));
    }
  };

  // The limit may come while api restarts: it stays stopped, and the phase stays over-limit.
  const restart = async () => {
    state.phase = "restarting";
    save();
    await stopOne("api");
    if (state.phase === "over-limit") return;
    await start("api");
    state.restarts += 1;
    await until("after a restart", now().getTime() + readyMs);
    if (state.phase === "restarting") state.phase = "ready";
    save();
  };
  // A change while api restarts restarts it once more, after.
  let pending = null;
  let again = false;
  const changed = () => {
    if (stopping || state.phase === "over-limit") return;
    clearTimeout(pending);
    pending = setTimeout(() => {
      if (stopping || state.phase === "over-limit") return;
      if (restarting) {
        again = true;
        return;
      }
      restarting = restart()
        .catch((error) => {
          if (state.phase === "over-limit") return;
          state.phase = "failed";
          state.error = error.message;
          save();
        })
        .finally(() => {
          restarting = null;
          if (again) {
            again = false;
            changed();
          }
        });
    }, debounceMs);
  };

  const count = async () => {
    if (!config.ai || stopping || state.phase === "over-limit") return;
    state.spent_usd = Number(spentOf(state.servers.api?.logs ?? []).toFixed(4));
    if (state.spent_usd >= config.limit_usd) {
      state.phase = "over-limit";
      state.error = `the models spent $${state.spent_usd} of the stand's limit of $${config.limit_usd}: api is stopped; ask the author, then serve --ai --limit <usd>`;
      save();
      clearTimeout(pending);
      await restarting;
      await stopOne("api");
    }
    save();
  };

  const ready = (async () => {
    save();
    if (!has("api") || !has("app")) throw new Error("the stand needs the clones of api and app in the epic");
    for (const [name, port] of [["api", config.ports.api], ["app", config.ports.app]]) {
      const id = containerOf(name);
      if (portBusy(docker, id, port)) throw new Error(`port ${port} is taken in ${name}'s container: a server outside the stand runs there; end it first`);
    }
    if (has("canvas")) {
      ids.canvas = containerOf("canvas");
      const log = path.join(dir, `canvas-build-${stamp(now())}.log`);
      try {
        docker(["exec", "--user", "vscode", "--workdir", path.join(epicDir, "canvas"), ids.canvas, "bash", "-lc", 'just build >> "$1" 2>&1', "bash", log], { timeout: readyMs });
      } catch (error) {
        // docker's time-out ends the client here, not the build in the container.
        throw new Error(`canvas: just build ${/no end in/.test(error.message) ? `ran past ${readyMs / 60_000} minutes and may still run in its container` : "failed"}; its log is ${log}`);
      }
      await start("canvas");
    }
    await start("api");
    await start("app");
    const node = (repo) => docker(["exec", "--user", "vscode", ids[repo === "spec" ? "mockup" : repo], "bash", "-lc", "command -v node"]).trim();
    relays.push(await relay({ listen: config.ports.relay, port: config.ports.app, container: cached("app"), program, env, node: node("app") }));
    if (config.mockup && has("spec")) {
      await start("mockup");
      relays.push(await relay({ listen: config.ports.mockup_relay, port: config.ports.mockup, container: cached("spec"), program, env, node: node("spec") }));
      state.mockup = { port: config.ports.mockup_relay };
    }
    // The watchers before ready: a stand that cannot watch fails before serve says it is ready.
    for (const folder of watchedOf(epicDir)) {
      const inApi = folder === path.join(epicDir, "api");
      watchers.push(fs.watch(folder, { recursive: true }, (_event, file) => file && restarts(String(file), { inApi }) && changed()));
    }
    if (config.ai) timers.push(setInterval(count, countMs));
    await until("before it was ready", now().getTime() + readyMs);
    if (state.phase === "starting") state.phase = "ready";
    save();
  })();
  ready.catch((error) => {
    state.phase = "failed";
    state.error = error.message;
    save();
  });

  const stop = async () => {
    stopping = true;
    clearTimeout(pending);
    for (const t of timers) clearInterval(t);
    for (const w of watchers) w.close();
    await restarting;
    for (const r of relays) await r.close();
    for (const name of ["mockup", "app", "api", "canvas"]) {
      try {
        await stopOne(name);
      } catch (error) {
        state.error = error.message;
      }
      fs.rmSync(path.join(dir, `${name}.pid`), { force: true });
    }
    if (config.ai) state.spent_usd = Number(spentOf(state.servers.api?.logs ?? []).toFixed(4));
    if (state.phase !== "failed" && state.phase !== "over-limit") state.phase = "stopped";
    state.stopped = now().toISOString();
    save();
  };
  return { ready, stop, state };
}

if (isMain(import.meta.url)) {
  // The epic by its name as .epics lists it. The tests' .epics, docker and host come by the
  // environment serve gives, the orchestrator's own by default: no command line names a program or
  // a folder.
  const { positionals } = parseArgs({ options: {}, allowPositionals: true });
  const env = process.env;
  const root = env.XREPO_EPICS ?? EPICS;
  const epic = positionals.length === 1 && EPIC.test(positionals[0]) && fs.existsSync(root) ? fs.readdirSync(root).find((d) => d === positionals[0]) : undefined;
  if (epic === undefined) {
    console.error("usage: node tools/orchestrator/stand.mjs <epic in .epics>");
    process.exit(2);
  }
  const stand = runStand(path.join(root, epic), { program: env.XREPO_DOCKER ?? DOCKER, hostname: env.XREPO_HOSTNAME ?? os.hostname() });
  let ending = null;
  const end = () => {
    ending ??= stand.stop().then(() => process.exit(0));
  };
  process.on("SIGTERM", end);
  process.on("SIGINT", end);
  stand.ready.then(
    () => console.log(`stand: ready on 127.0.0.1:${stand.state.relay}`),
    async (error) => {
      console.error(`stand: ${error.message}`);
      await stand.stop();
      process.exit(1);
    },
  );
}
