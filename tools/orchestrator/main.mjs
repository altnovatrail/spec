// orchestrator: runs a task of a NovaTrail repository in that repository's container, and continues
// the same session with the author's answers (R156).
//
//   node tools/orchestrator/main.mjs start <repo> <task> [--ceiling <usd>] [--prompt <file>]
//                                          [--container <name or id>] [--folder <host's folder>]
//   node tools/orchestrator/main.mjs resume <run> [--answers <file>] [--ceiling <usd>]
//   node tools/orchestrator/main.mjs stop <run>
//   node tools/orchestrator/main.mjs status [<run>…]
//   node tools/orchestrator/main.mjs wait <run>… [--timeout <seconds>]
//   node tools/orchestrator/main.mjs next <repo>
//   node tools/orchestrator/main.mjs rebuild <repo> [--container <name or id>] [--folder <host's folder>]
//   node tools/orchestrator/main.mjs create <repo> [--folder <host's folder>]
//   node tools/orchestrator/main.mjs sync
//   node tools/orchestrator/main.mjs xrepo up <epic> [<repo>…]
//   node tools/orchestrator/main.mjs xrepo status|stop|down [--epic <epic>]
//   node tools/orchestrator/main.mjs xrepo test <repo> [<target>…] [--epic <epic>]
//   node tools/orchestrator/main.mjs xrepo serve [--ai] [--limit <usd>] [--mockup] [--epic <epic>]
//   node tools/orchestrator/main.mjs xrepo sync|push|ship [--epic <epic>]
//   node tools/orchestrator/main.mjs xrepo gate [<repo>…] [--epic <epic>]
//   node tools/orchestrator/main.mjs xrepo pin <repo> [<tag>] [--epic <epic>]
//   node tools/orchestrator/main.mjs xrepo wait-release <repo> <tag>
//
// It runs in spec's orchestrator container, which sees the host's Docker, and is what «Сделай эпик
// E…» calls. start and resume return at once; the run goes on in its container and writes its files
// to the run's folder, and status and wait read them; stop ends the run's attempt and returns once
// it has ended. Each command prints JSON, a line for each run; next, the next free number of a
// repository's task, by GitHub and the runs; sync, the path and the commit of the orchestrator's
// clone of spec; rebuild and create, the container before and after, once the Dev Containers CLI
// has built it (R158); xrepo, a task across repositories in the clones of .epics and its stand
// (R166), xrepo.mjs, its gate, gate.mjs, and its ship after the author's «да», ship.mjs. Exits 0 when done, 1 when what it was asked cannot be done or wait's time ran
// out, 2 on a wrong command line.
// README.md says what each file of a run holds. It takes only Node's own modules, so that it runs
// from the clone that sync keeps, which has no node_modules.

import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { isMain } from "../shared.mjs";
import { runDocker } from "./containers.mjs";
import { create, rebuild, runLong } from "./devcontainers.mjs";
import { nextTask, runGh } from "./numbers.mjs";
import { down as xrepoDown, serve, status as xrepoStatus, stop as xrepoStop, test as xrepoTest, up } from "./xrepo.mjs";
import { gate, push, sync as xrepoSync } from "./gate.mjs";
import { pin, ship, waitRelease } from "./ship.mjs";
import { allRuns, DEFAULT_CEILING, homeOf, loadRun, openRuns, resume, SPEC_URL, start, stateOf, stop, sync, waitFor } from "./runs.mjs";

const USAGE =
  "orchestrator: start <repo> <task> [--ceiling <usd>] [--prompt <file>] [--container <name>] [--folder <folder>], resume <run> [--answers <file>] [--ceiling <usd>], stop <run>, status [<run>…], wait <run>… [--timeout <seconds>], next <repo>, rebuild <repo> [--container <name>] [--folder <folder>], create <repo> [--folder <folder>], sync, or xrepo up <epic> [<repo>…], xrepo status|stop|down [<epic>], xrepo test <repo> [<target>…] [--browser] [--epic <epic>], xrepo serve [<epic>] [--ai] [--limit <usd>] [--mockup], xrepo sync|push|ship [<epic>], xrepo gate [<repo>…] [--epic <epic>], xrepo pin <repo> [<tag>] [--epic <epic>], xrepo wait-release <repo> <tag>";

const COMMANDS = {
  start: { options: { ceiling: { type: "string" }, prompt: { type: "string" }, container: { type: "string" }, folder: { type: "string" } }, min: 2, max: 2 },
  resume: { options: { answers: { type: "string" }, ceiling: { type: "string" } }, min: 1, max: 1 },
  stop: { options: {}, min: 1, max: 1 },
  status: { options: {}, min: 0, max: Infinity },
  wait: { options: { timeout: { type: "string" } }, min: 1, max: Infinity },
  next: { options: {}, min: 1, max: 1 },
  rebuild: { options: { container: { type: "string" }, folder: { type: "string" } }, min: 1, max: 1 },
  create: { options: { folder: { type: "string" } }, min: 1, max: 1 },
  sync: { options: {}, min: 0, max: 0 },
  "xrepo up": { options: {}, min: 1, max: Infinity },
  "xrepo status": { options: { epic: { type: "string" } }, min: 0, max: 1, epic: true },
  "xrepo test": { options: { epic: { type: "string" }, browser: { type: "boolean" } }, min: 1, max: Infinity },
  "xrepo serve": { options: { epic: { type: "string" }, ai: { type: "boolean" }, limit: { type: "string" }, mockup: { type: "boolean" } }, min: 0, max: 1, epic: true },
  "xrepo stop": { options: { epic: { type: "string" } }, min: 0, max: 1, epic: true },
  "xrepo down": { options: { epic: { type: "string" } }, min: 0, max: 1, epic: true },
  "xrepo sync": { options: { epic: { type: "string" } }, min: 0, max: 1, epic: true },
  "xrepo push": { options: { epic: { type: "string" } }, min: 0, max: 1, epic: true },
  "xrepo gate": { options: { epic: { type: "string" } }, min: 0, max: Infinity },
  "xrepo pin": { options: { epic: { type: "string" } }, min: 1, max: 2 },
  "xrepo wait-release": { options: {}, min: 2, max: 2 },
  "xrepo ship": { options: { epic: { type: "string" } }, min: 0, max: 1, epic: true },
};

class UsageError extends Error {}

const PARSE_ERRORS = {
  ERR_PARSE_ARGS_UNKNOWN_OPTION: "an unknown option",
  ERR_PARSE_ARGS_INVALID_OPTION_VALUE: "an option without its value",
};

// The command, its words and its options, or a UsageError.
export function argumentsOf(argv) {
  const [first, ...more] = argv;
  // xrepo's commands are its second word.
  const [command, rest] = first === "xrepo" ? [`xrepo ${more[0]}`, more.slice(1)] : [first, more];
  const spec = Object.hasOwn(COMMANDS, command) ? COMMANDS[command] : null;
  if (!spec) throw new UsageError(USAGE);
  let parsed;
  try {
    parsed = parseArgs({ args: rest, options: spec.options, strict: true, allowPositionals: true });
  } catch (error) {
    // Node's message repeats the word of the command line; its code does not.
    throw new UsageError(`${command}: ${PARSE_ERRORS[error.code] ?? "a wrong option"}`);
  }
  let words = parsed.positionals;
  if (words.length < spec.min || words.length > spec.max) throw new UsageError(USAGE);
  const values = { ...parsed.values };
  // A command with no other word takes the epic as its word too, as up does.
  if (spec.epic && words.length) {
    if (values.epic !== undefined && values.epic !== words[0]) throw new UsageError(`${command}: the epic named twice`);
    values.epic = words[0];
    words = [];
  }
  for (const key of ["ceiling", "timeout", "limit"]) {
    if (values[key] === undefined) continue;
    if (!/^\d+(\.\d+)?$/.test(values[key]) || Number(values[key]) <= 0) throw new UsageError(`--${key}: not a positive number`);
    values[key] = Number(values[key]);
  }
  return { command, words, values };
}

// What the commands run on by default: the host's Docker, GitHub, the volume's folder, spec on
// GitHub, the clock; xrepo's .epics and organization are xrepo.mjs's own.
export function defaults(env = process.env) {
  return {
    docker: (args) => runDocker(args, { env }),
    dockerLong: (args, options) => runLong(args, { env, ...options }),
    gh: (args) => runGh(args, { env }),
    env,
    home: homeOf(env),
    specUrl: SPEC_URL,
    hostname: os.hostname(),
    now: () => new Date(),
    uuid: randomUUID,
    fetch: (url, options) => fetch(url, options),
    sleep: (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms),
    interval: 10_000,
    out: (line) => console.log(line),
    err: (line) => console.error(line),
  };
}

// Runs a command line; the status to exit with.
export async function main(argv, overrides = {}) {
  const deps = { ...defaults(), ...overrides };
  let args;
  try {
    args = argumentsOf(argv);
  } catch (error) {
    deps.err(error.message);
    return 2;
  }
  const { command, words, values } = args;
  // A prompt's file must lie in the orchestrator's folder, where the procedure writes it: the
  // command line that names it is written by a session of Claude Code.
  const read = (file) => {
    const inside = path.resolve(deps.home) + path.sep;
    const full = path.resolve(file);
    if (!full.startsWith(inside)) throw new Error(`a prompt's file must lie in ${deps.home}`);
    return fs.readFileSync(full, "utf8");
  };
  try {
    if (command === "start") {
      const prompt = values.prompt === undefined ? null : read(values.prompt);
      const run = start({ repo: words[0], task: words[1], ceiling: values.ceiling ?? DEFAULT_CEILING, prompt, container: values.container ?? null, folder: values.folder ?? null }, deps);
      deps.out(JSON.stringify(stateOf(deps.home, run, deps)));
    } else if (command === "resume") {
      const prompt = values.answers === undefined ? null : read(values.answers);
      const run = resume(words[0], { prompt, ceiling: values.ceiling ?? null }, deps);
      deps.out(JSON.stringify(stateOf(deps.home, run, deps)));
    } else if (command === "stop") {
      deps.out(JSON.stringify(stateOf(deps.home, stop(words[0], deps), deps)));
    } else if (command === "next") {
      deps.out(JSON.stringify(nextTask(words[0], { gh: deps.gh, runs: openRuns(deps.home, words[0]) })));
    } else if (command === "rebuild") {
      deps.out(JSON.stringify(rebuild(words[0], { container: values.container ?? null, folder: values.folder ?? null }, deps)));
    } else if (command === "create") {
      deps.out(JSON.stringify(create(words[0], { folder: values.folder ?? null }, deps)));
    } else if (command === "status") {
      for (const id of words.length ? words : allRuns(deps.home)) deps.out(JSON.stringify(stateOf(deps.home, loadRun(deps.home, id), deps)));
    } else if (command === "wait") {
      const all = await waitFor(words, { interval: deps.interval, timeout: (values.timeout ?? 0) * 1000, ended: (state) => deps.out(JSON.stringify(state)) }, deps);
      if (!all) {
        deps.err(`orchestrator: --timeout of ${values.timeout} s came before every run ended`);
        return 1;
      }
    } else if (command === "sync") {
      deps.out(JSON.stringify(sync({ home: deps.home, url: deps.specUrl })));
    } else if (command === "xrepo up") {
      for (const row of up(words[0], words.slice(1), deps)) deps.out(JSON.stringify(row));
    } else if (command === "xrepo status") {
      deps.out(JSON.stringify(xrepoStatus(values.epic ?? null, deps)));
    } else if (command === "xrepo test") {
      const result = xrepoTest(words[0], words.slice(1), values.epic ?? null, deps, { browser: values.browser ?? false });
      deps.out(JSON.stringify(result));
      if (result.status !== 0) return 1;
    } else if (command === "xrepo serve") {
      deps.out(JSON.stringify(await serve({ named: values.epic ?? null, ai: values.ai ?? false, limit: values.limit ?? null, mockup: values.mockup ?? false }, deps)));
    } else if (command === "xrepo stop") {
      deps.out(JSON.stringify(await xrepoStop(values.epic ?? null, deps)));
    } else if (command === "xrepo sync") {
      const result = xrepoSync(values.epic ?? null, deps);
      deps.out(JSON.stringify(result));
      if (result.conflicts.length) return 1;
    } else if (command === "xrepo push") {
      for (const row of push(values.epic ?? null, deps)) deps.out(JSON.stringify(row));
    } else if (command === "xrepo gate") {
      const result = await gate(values.epic ?? null, words, deps);
      deps.out(JSON.stringify(result));
      if (!result.pass) return 1;
    } else if (command === "xrepo pin") {
      deps.out(JSON.stringify(pin(values.epic ?? null, words[0], words[1] ?? null, deps)));
    } else if (command === "xrepo wait-release") {
      deps.out(JSON.stringify(await waitRelease(words[0], words[1], deps)));
    } else if (command === "xrepo ship") {
      const result = await ship(values.epic ?? null, { ...deps, progress: (event) => deps.out(JSON.stringify(event)) });
      deps.out(JSON.stringify(result));
      if (result.stopped) return 1;
    } else {
      deps.out(JSON.stringify(await xrepoDown(values.epic ?? null, deps)));
    }
  } catch (error) {
    deps.err(`orchestrator: ${error.message}`);
    return 1;
  }
  return 0;
}

if (isMain(import.meta.url)) process.exitCode = await main(process.argv.slice(2));
