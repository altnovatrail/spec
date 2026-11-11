// tokens-report: where the tokens of a repository's Claude Code sessions go (repositories 9).
//
//   node tools/tokens/main.mjs [--since <date|time>] [--until <date|time>] [--top <n>] [--project <name>] [--json]
//
// Reads the transcripts this machine keeps of the sessions of the git repository it runs in —
// spec, or another NovaTrail repository through `just -f spec/justfile tokens-report` — or of the
// project --project names, by the name of its folder of transcripts under <config>/projects, and
// prints, in all and by session: the calls of the model, cache reads and writes, output, uncached
// input, the context of a call and its cost at the API's prices; what entered the context between
// calls — the results of tools by tool, by file and by program, the author's words, reminders,
// attachments — and what each carried; and what a session starts with. --since and --until bound
// the calls by their time, in UTC unless it names a zone, --until not included; a date is its
// first moment. --json prints what it counted as JSON instead. Prints numbers, paths and names
// alone, never what a transcript says. Exits 0 when it read the folder; 2 when there is none, or
// an argument is wrong.

import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { byCodeUnits, isMain } from "../shared.mjs";
import { format, measure, timeOf } from "./report.mjs";
import { projectsRoot, readTranscript, repositoryRoot, slugOf, transcriptsOf } from "./transcripts.mjs";

// The name of a folder of transcripts, never a path: the report reads nothing outside <config>/projects.
const PROJECT_NAME = /^[A-Za-z0-9._-]+$/;

const OPTIONS = { since: { type: "string" }, until: { type: "string" }, top: { type: "string" }, project: { type: "string" }, json: { type: "boolean" } };

// The arguments, or an error that names the wrong one. A name of a folder of transcripts starts
// with "-", so --project takes it as --project=-workspaces-app.
export function argumentsOf(argv) {
  const { values } = parseArgs({ args: argv, options: OPTIONS, strict: true, allowPositionals: false });
  if (values.top !== undefined && !/^\d+$/.test(values.top)) throw new Error(`--top: not a number: ${values.top}`);
  return {
    since: timeOf(values.since ?? null),
    until: timeOf(values.until ?? null),
    top: values.top === undefined ? 20 : Number(values.top),
    project: values.project ?? null,
    json: values.json ?? false,
  };
}

// The folder a project's sessions started in, as their transcripts give it: the folder most of them
// begin in, or null when none says.
export function rootOfTranscripts(transcripts, firstCwd = firstCwdOf) {
  const counts = new Map();
  for (const { file, subagent } of transcripts) {
    if (subagent) continue;
    const cwd = firstCwd(file);
    if (cwd) counts.set(cwd, (counts.get(cwd) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1] || byCodeUnits(a[0], b[0]))[0]?.[0] ?? null;
}

// The folder the first record that names one gives, read from the start of a transcript alone.
function firstCwdOf(file) {
  const head = Buffer.alloc(1 << 20);
  const fd = fs.openSync(file, "r");
  let length;
  try {
    length = fs.readSync(fd, head, 0, head.length, 0);
  } finally {
    fs.closeSync(fd);
  }
  for (const line of head.subarray(0, length).toString("utf8").split("\n")) {
    try {
      const cwd = JSON.parse(line).cwd;
      if (typeof cwd === "string") return cwd;
    } catch {
      // A line cut by the end of what was read, or not JSON.
    }
  }
  return null;
}

// The whole run: { lines, status }.
export function tokensReport(argv, { cwd = process.cwd(), env = process.env } = {}) {
  let options;
  let root;
  let dir;
  try {
    options = argumentsOf(argv);
    if (options.project === null) dir = path.join(projectsRoot(env), slugOf(repositoryRoot(cwd)));
    else if (PROJECT_NAME.test(options.project) && !/^\.+$/.test(options.project)) dir = path.join(projectsRoot(env), options.project);
    else throw new Error(`--project takes the name of a folder under ${projectsRoot(env)}, not a path: ${options.project}`);
    if (!fs.statSync(dir, { throwIfNoEntry: false })?.isDirectory()) throw new Error(`no transcripts of this repository on this machine: ${dir}`);
  } catch (error) {
    return { lines: [`tokens-report: ${error.message}`], status: 2 };
  }
  const transcripts = transcriptsOf(dir);
  // The root paths print from: the repository's, or for a project named, where its sessions began.
  root = options.project === null ? repositoryRoot(cwd) : rootOfTranscripts(transcripts);
  const data = measure(transcripts, { read: readTranscript, root, since: options.since, until: options.until });
  if (options.json) return { lines: [JSON.stringify({ project: dir, since: options.since, until: options.until, ...data }, null, 1)], status: 0 };
  return { lines: format(data, { top: options.top, project: path.basename(dir) }), status: 0 };
}

if (isMain(import.meta.url)) {
  const { lines, status } = tokensReport(process.argv.slice(2));
  (status ? console.error : console.log)(lines.join("\n"));
  process.exitCode = status;
}
