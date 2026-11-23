// What a main call of an executor of the orchestrator did, by the class of the paths its tools
// named, and what each class of calls carried, wrote and took of the model's time. An executor's
// session is one whose first prompt came by `claude -p`, entrypoint sdk-cli.
//
// A Bash command's class comes from the paths it names, by their words alone: the files of the
// other repositories are not on this machine, so filesOf of report.mjs, which asks the disk, would
// miss them. The words are read by their characters, not by patterns that would backtrack.

// The classes of documents; any other path is code and data.
const DOCS = new Set(["decisions", "plan", "architecture", "docs other", "archive", "rules", "readme", "md other", "several docs"]);

// The class of a path, inside a repository or its spec/ submodule, from its root.
export function classOf(file) {
  const p = String(file)
    .replace(/^\/workspaces\/[^/]+\//, "")
    .replace(/^\.\//, "")
    .replace(/^spec\//, "");
  if (p === "docs/decisions.md") return "decisions";
  if (p.startsWith("docs/plan/")) return "archive";
  if (p.startsWith("RUN.md") || p.startsWith("run/") || p.startsWith("COORDINATION.md")) return "plan";
  if (p === "docs/architecture.md") return "architecture";
  if (p.startsWith("docs/") && p.endsWith(".md")) return "docs other";
  if (["CLAUDE.md", "RULES.md", "AGENTS.md"].some((name) => p.startsWith(name)) || p.startsWith(".claude/rules/")) return "rules";
  if (p === "README.md" || p.endsWith("/README.md")) return "readme";
  return p.endsWith(".md") ? "md other" : "code and data";
}

// The extensions a path a command names may end in. One ends where no letter, digit or "_"
// follows, so that `lines.shift()` of a script names no file "lines.sh".
const EXTENSIONS = ["md", "go", "ts", "tsx", "mjs", "js", "cjs", "json", "yaml", "yml", "proto", "sh", "css", "html", "txt"];
const endsAt = (run, at) => at === run.length || !/\w/.test(run[at]);
const FOLDERS = ["docs", "run", "src", "internal", "cmd", "tools", "format", "contracts", "deploy"];
const WORD = /^[\w./-]*/;

// The path a word of a command starts with: its longest run of path characters cut after the
// extension that follows its last dot after a character other than "/", or else the whole run
// when it starts with a folder of FOLDERS; or null.
function pathOf(word) {
  const run = WORD.exec(word)[0];
  for (let dot = run.lastIndexOf("."); dot > 0; dot = run.lastIndexOf(".", dot - 1)) {
    if (run[dot - 1] === "/") continue;
    const extension = EXTENSIONS.find((e) => run.startsWith(e, dot + 1) && endsAt(run, dot + 1 + e.length));
    if (extension) return run.slice(0, dot + 1 + extension.length);
  }
  return FOLDERS.some((f) => run.startsWith(f + "/") && run.length > f.length + 1) ? run : null;
}

// The paths a shell command names, a word after a redirection too: `cat >docs/x.md`.
export function pathsOf(command) {
  return String(command)
    .split(/[\s'"=(:<>]/)
    .map(pathOf)
    .filter((p) => p !== null);
}

const REDIRECTED = ["md", "go", "ts", "tsx", "json", "mjs", "yaml", "yml"];
// The run of path characters after a redirection, read where the redirection is.
const TARGET = /\s*([\w./-]*)/y;

// Whether a shell command writes a file: in place by sed or perl, by tee, cat or a script of node,
// or by a redirection into a file of code or a document.
export function writes(command) {
  const text = String(command);
  if (["sed -i", "perl -pi", "writeFileSync"].some((s) => text.includes(s)) || /\btee\b/.test(text) || /cat\s*>/.test(text)) return true;
  for (let at = text.indexOf(">"); at !== -1; at = text.indexOf(">", at + 1)) {
    TARGET.lastIndex = at + 1;
    const run = TARGET.exec(text)[1];
    // The arrow of a function in a script, `(r) => r.json`, redirects nothing.
    if (text[at - 1] === "=") continue;
    for (let dot = run.indexOf(".", 1); dot !== -1; dot = run.indexOf(".", dot + 1)) {
      if (REDIRECTED.some((e) => run.startsWith(e, dot + 1) && endsAt(run, dot + 1 + e.length))) return true;
    }
  }
  return false;
}

// Strips the `cd <folder> &&` a command starts with, as many as there are.
function pastCd(command) {
  let rest = command.trim();
  while (rest.startsWith("cd ")) {
    const and = rest.indexOf("&");
    if (and < 4 || rest[and + 1] !== "&" || rest.slice(3, and).includes(";")) break;
    rest = rest.slice(and + 2).trimStart();
  }
  return rest;
}

// The classes of the folders of documents that a Grep or a Glob may search.
const FOLDER_CLASSES = { docs: "docs other", "docs/plan": "archive", run: "plan", ".claude/rules": "rules" };

// A file of the temporary folder or of the transcripts is the session's own, not the repository's.
// The report names such a path; it never opens it.
const TEMPORARY = /^\/tmp\//;
const ownFile = (p) => TEMPORARY.test(p) || p.includes(".claude/projects");

// What a tool's call did, as a kind: "read <class>", "write <class>", "git and gh", "checks and
// builds", "status" or "other".
export function kindOf(block) {
  const name = block?.name;
  const input = block?.input ?? {};
  if (["Read", "Grep", "Glob"].includes(name)) {
    const p = String(input.file_path || input.path || "").replace(/^\/workspaces\/[^/]+\/?/, "").replace(/^spec\/?/, "");
    if (p === "" || ownFile(p)) return "other";
    const c = FOLDER_CLASSES[p.replace(/\/$/, "")] ?? classOf(p);
    return "read " + (DOCS.has(c) ? c : "code and data");
  }
  if (["Edit", "Write", "MultiEdit", "NotebookEdit"].includes(name)) return "write " + classOf(input.file_path || input.notebook_path || "");
  if (name === "StructuredOutput") return "status";
  if (name !== "Bash") return "other";
  const command = String(input.command ?? "");
  const named = pathsOf(command);
  const classes = [...new Set(named.filter((p) => !ownFile(p)).map(classOf))];
  const docs = classes.filter((c) => DOCS.has(c));
  const write = writes(command);
  const program = pastCd(command);
  if (program.startsWith("git ") || program.startsWith("gh ")) return "git and gh";
  if (/^(just|npm|npx|go|buf)\b/.test(program) && !write) return "checks and builds";
  if (write && classes.includes("code and data")) return "write code and data";
  if (docs.length) return (write ? "write " : "read ") + (docs.length === 1 ? docs[0] : "several docs");
  if (write) return named.some((p) => TEMPORARY.test(p) && p.endsWith(".md")) ? "write md other" : "write code and data";
  return classes.length ? "read code and data" : "other";
}

// The group a kind is summed in: read or write, of documents or of code and data; the start of a
// session; the status; or other.
export function groupOf(kind) {
  if (kind === "start" || kind === "status") return kind;
  const match = /^(read|write) (.+)$/.exec(kind);
  if (!match) return "other";
  return `${match[1]} ${DOCS.has(match[2]) ? "docs" : "code and data"}`;
}

// What the classes of an executor's main calls sum to, from the counted main calls of the
// executors' sessions and what entered their context: { sessions, calls, context, output, ms,
// wallMs, wallSessions, cost, inputCost, subagentCost, kinds, groups }, each kind and group with
// what it carried, the output and the model's time, in milliseconds, it took. The wall time is
// that of the sessions that began in the window, wallSessions of them, whose wallMs is not null.
export function classesOf({ calls, entries, sessions }) {
  const kinds = new Map();
  const add = (name, field, value) => {
    const k = kinds.get(name) ?? { name, group: groupOf(name), carried: 0, output: 0, ms: 0 };
    kinds.set(name, k);
    k[field] += value;
  };
  const totals = { sessions: sessions.length, calls: 0, context: 0, output: 0, ms: 0, wallMs: 0, wallSessions: 0, cost: 0, inputCost: 0, subagentCost: 0 };
  for (const s of sessions) {
    if (s.wallMs !== null) {
      totals.wallMs += s.wallMs;
      totals.wallSessions += 1;
    }
    totals.subagentCost += s.subagentCost;
  }
  for (const call of calls) {
    totals.calls += 1;
    totals.context += call.context;
    totals.output += call.output;
    totals.cost += call.cost;
    totals.inputCost += call.inputCost;
    const ms = Math.max(0, call.end - call.start);
    totals.ms += ms;
    const own = call.kinds.length ? call.kinds : ["other"];
    for (const k of own) {
      add(k, "output", call.output / own.length);
      add(k, "ms", ms / own.length);
    }
  }
  for (const { kind, carried } of entries) add(kind, "carried", carried);
  const groups = new Map();
  for (const k of kinds.values()) {
    const g = groups.get(k.group) ?? { name: k.group, carried: 0, output: 0, ms: 0 };
    groups.set(k.group, g);
    for (const f of ["carried", "output", "ms"]) g[f] += k[f];
  }
  const byCarried = (a, b) => b.carried - a.carried || b.output - a.output || (a.name < b.name ? -1 : 1);
  return { ...totals, groups: [...groups.values()].sort(byCarried), kinds: [...kinds.values()].sort(byCarried) };
}

// The classes as lines of text: the totals a session, and the groups, each followed by its kinds,
// with the shares of the context carried, of the output and of the model's time.
export function formatClasses(classes, { project = "" } = {}) {
  const c = classes;
  const share = (x, all) => (all ? `${((100 * x) / all).toFixed(1)}%` : "—");
  const perSession = (x) => (c.sessions ? x / c.sessions : 0);
  const minutes = (ms) => perSession(ms / 6e4).toFixed(1);
  const wall = c.wallSessions ? (c.wallMs / 6e4 / c.wallSessions).toFixed(1) : "—";
  const began = c.wallSessions === c.sessions ? "" : ` of the ${c.wallSessions} that began in the window`;
  const cells = (x) => [share(x.carried, c.context), share(x.output, c.output), share(x.ms, c.ms), minutes(x.ms)];
  const lines = [
    `classes: ${project} — ${c.sessions} executors' sessions, ${c.calls.toLocaleString("en-US")} main calls, ${(c.context / 1e6).toFixed(0)}M tokens of context, ${(c.output / 1e6).toFixed(2)}M output`,
    `a session: wall ${wall} min${began}, model ${minutes(c.ms)} min; $${perSession(c.cost).toFixed(2)} at API prices, $${perSession(c.inputCost).toFixed(2)} of it input; subagents $${perSession(c.subagentCost).toFixed(2)} more`,
    "",
    "| What a call did | Context it carried | Output | Model time | Model minutes a session |",
    "|---|---|---|---|---|",
  ];
  for (const g of c.groups) {
    lines.push(`| ${g.name} | ${cells(g).join(" | ")} |`);
    const own = c.kinds.filter((x) => x.group === g.name);
    if (own.length > 1 || own[0]?.name !== g.name) for (const k of own) lines.push(`| — ${k.name} | ${cells(k).join(" | ")} |`);
  }
  return lines;
}
