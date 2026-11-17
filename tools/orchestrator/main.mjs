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
//
// It runs in spec's orchestrator container, which sees the host's Docker, and is what «Сделай эпик
// E…» calls (RUN.md, T170). start and resume return at once; the run goes on in its container and
// writes its files to the run's folder, and status and wait read them; stop ends the run's attempt
// and returns once it has ended. Each command prints JSON, a line for each run; next, the next free
// number of a repository's task, by GitHub and the runs; sync, the path and the commit of the
// orchestrator's clone of spec; rebuild and create, the container before and after, once the Dev
// Containers CLI has built it (R158). Exits 0 when done, 1 when what it was asked cannot be done or wait's
// time ran out, 2 on a wrong command line.
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
import { allRuns, DEFAULT_CEILING, homeOf, loadRun, openRuns, resume, SPEC_URL, start, stateOf, stop, sync, waitFor } from "./runs.mjs";

const USAGE =
  "orchestrator: start <repo> <task> [--ceiling <usd>] [--prompt <file>] [--container <name>] [--folder <folder>], resume <run> [--answers <file>] [--ceiling <usd>], stop <run>, status [<run>…], wait <run>… [--timeout <seconds>], next <repo>, rebuild <repo> [--container <name>] [--folder <folder>], create <repo> [--folder <folder>] or sync";

// The options of each command, and how many runs or names it takes.
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
};

class UsageError extends Error {}

// What parseArgs found wrong, by its error's code.
const PARSE_ERRORS = {
  ERR_PARSE_ARGS_UNKNOWN_OPTION: "an unknown option",
  ERR_PARSE_ARGS_INVALID_OPTION_VALUE: "an option without its value",
};

// The command, its words and its options, or a UsageError.
export function argumentsOf(argv) {
  const [command, ...rest] = argv;
  const spec = COMMANDS[command];
  if (!spec) throw new UsageError(USAGE);
  let parsed;
  try {
    parsed = parseArgs({ args: rest, options: spec.options, strict: true, allowPositionals: true });
  } catch (error) {
    // Node's message repeats the word of the command line; its code does not.
    throw new UsageError(`${command}: ${PARSE_ERRORS[error.code] ?? "a wrong option"}`);
  }
  const words = parsed.positionals;
  if (words.length < spec.min || words.length > spec.max) throw new UsageError(USAGE);
  const values = { ...parsed.values };
  for (const key of ["ceiling", "timeout"]) {
    if (values[key] === undefined) continue;
    if (!/^\d+(\.\d+)?$/.test(values[key]) || Number(values[key]) <= 0) throw new UsageError(`--${key}: not a positive number`);
    values[key] = Number(values[key]);
  }
  return { command, words, values };
}

// What the commands run on by default: the host's Docker, GitHub, the volume's folder, spec on
// GitHub, the clock.
export function defaults(env = process.env) {
  return {
    docker: (args) => runDocker(args, { env }),
    dockerLong: (args, options) => runLong(args, { env, ...options }),
    gh: (args) => runGh(args, { env }),
    home: homeOf(env),
    specUrl: SPEC_URL,
    hostname: os.hostname(),
    now: () => new Date(),
    uuid: randomUUID,
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
  // A prompt's file lies in the orchestrator's folder, where the procedure writes it (README.md):
  // the command line that names it is written by a session of Claude Code.
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
    } else {
      deps.out(JSON.stringify(sync({ home: deps.home, url: deps.specUrl })));
    }
  } catch (error) {
    deps.err(`orchestrator: ${error.message}`);
    return 1;
  }
  return 0;
}

if (isMain(import.meta.url)) process.exitCode = await main(process.argv.slice(2));
