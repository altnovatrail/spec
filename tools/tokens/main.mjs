// tokens-report: where the tokens of a repository's Claude Code sessions go.
//
//   node tools/tokens/main.mjs [--since <date|time>] [--until <date|time>] [--top <n>] [--project <name>]... [--json | --row | --classes]
//
// Reads the transcripts this machine keeps of the sessions of the git repository it runs in —
// spec, or another NovaTrail repository through `just -f spec/justfile tokens-report` — or of the
// projects --project names, by the names of their folders of transcripts under <config>/projects.
// --since and --until bound the calls by their time, in UTC unless it names a zone, --until not
// included; a date is its first moment. --json prints what it counted as JSON instead; --row one
// row of the table that the monthly measurement and the archive of an epic add (R145); and
// --classes the main calls of the orchestrator's executors by the class of the paths they named
// (classes.mjs). Prints numbers, paths and names alone, never what a transcript says. Exits 0
// when it read the folder; 2 when there is none, or an argument is wrong.

import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { byCodeUnits, isMain } from "../shared.mjs";
import { format, measure, row, timeOf } from "./report.mjs";
import { formatClasses } from "./classes.mjs";
import { firstRecordOf, projectsRoot, readTranscript, repositoryRoot, slugOf, transcriptsOf } from "./transcripts.mjs";

// The name of a folder of transcripts, never a path: the report reads nothing outside <config>/projects.
const PROJECT_NAME = /^[A-Za-z0-9._-]+$/;

const OPTIONS = {
  since: { type: "string" },
  until: { type: "string" },
  top: { type: "string" },
  project: { type: "string", multiple: true },
  json: { type: "boolean" },
  row: { type: "boolean" },
  classes: { type: "boolean" },
};

// The arguments, or an error that names the wrong one. A name of a folder of transcripts starts
// with "-", so --project takes it as --project=-workspaces-app.
export function argumentsOf(argv) {
  const { values } = parseArgs({ args: argv, options: OPTIONS, strict: true, allowPositionals: false });
  if (values.top !== undefined && !/^\d+$/.test(values.top)) throw new Error(`--top: not a number: ${values.top}`);
  if ([values.json, values.row, values.classes].filter(Boolean).length > 1) throw new Error("--json, --row and --classes: one of them");
  return {
    since: timeOf(values.since ?? null),
    until: timeOf(values.until ?? null),
    top: values.top === undefined ? 20 : Number(values.top),
    projects: values.project ?? [],
    json: values.json ?? false,
    row: values.row ?? false,
    classes: values.classes ?? false,
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
  return firstRecordOf(file, (r) => typeof r?.cwd === "string")?.cwd ?? null;
}

// The folder of a project's transcripts that --project names.
function projectDir(name, env) {
  if (!PROJECT_NAME.test(name) || /^\.+$/.test(name)) throw new Error(`--project takes the name of a folder under ${projectsRoot(env)}, not a path: ${name}`);
  // The folder is the one of that name among those under <config>/projects, never the argument itself.
  const projects = projectsRoot(env);
  const found = (fs.statSync(projects, { throwIfNoEntry: false })?.isDirectory() ? fs.readdirSync(projects) : []).find((entry) => entry === name);
  if (!found) throw new Error(`no transcripts of this repository on this machine: ${projects}/${name}`);
  return path.join(projects, found);
}

// The whole run: { lines, status }.
export function tokensReport(argv, { cwd = process.cwd(), env = process.env } = {}) {
  let options;
  let dirs;
  try {
    options = argumentsOf(argv);
    dirs = options.projects.length ? [...new Set(options.projects)].map((name) => projectDir(name, env)) : [path.join(projectsRoot(env), slugOf(repositoryRoot(cwd)))];
    for (const dir of dirs) if (!fs.statSync(dir, { throwIfNoEntry: false })?.isDirectory()) throw new Error(`no transcripts of this repository on this machine: ${dir}`);
  } catch (error) {
    return { lines: [`tokens-report: ${error.message}`], status: 2 };
  }
  // The root paths print from: the repository's, or for a project named, where its sessions began.
  const root = options.projects.length ? null : repositoryRoot(cwd);
  const transcripts = dirs.flatMap((dir) => {
    const own = transcriptsOf(dir);
    const ownRoot = root ?? rootOfTranscripts(own);
    return own.map((t) => ({ ...t, root: ownRoot }));
  });
  const data = measure(transcripts, { read: readTranscript, root, since: options.since, until: options.until });
  const project = dirs.map((dir) => path.basename(dir)).join(", ");
  // The project's folder, or null when --project names several; projects, every folder read.
  if (options.json) return { lines: [JSON.stringify({ project: dirs.length === 1 ? dirs[0] : null, projects: dirs, since: options.since, until: options.until, ...data }, null, 1)], status: 0 };
  if (options.row) return { lines: [row(data, { project, since: options.since, until: options.until })], status: 0 };
  if (options.classes) return { lines: formatClasses(data.classes, { project }), status: 0 };
  return { lines: format(data, { top: options.top, project }), status: 0 };
}

if (isMain(import.meta.url)) {
  const { lines, status } = tokensReport(process.argv.slice(2));
  (status ? console.error : console.log)(lines.join("\n"));
  process.exitCode = status;
}
