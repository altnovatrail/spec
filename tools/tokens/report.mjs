// What tokens-report counts in a project's transcripts, and how it prints it (measurements 1.1).
//
// A call of the model is an assistant record's message, counted once by its id: a transcript
// repeats the message, and its usage, in a record for each block of its content. The fields of
// the cache are the same in every repeat; output_tokens may grow, so the greatest is the call's.
// The context of a call is what it sent: uncached input, cache reads and cache writes.
//
// What a tool's result costs is measured, not guessed from its length: whatever enters a
// transcript between two calls — results of tools, the author's words, reminders — grows the
// next call's context by the difference of the two contexts less the first call's output, and
// that growth is shared among what entered in proportion to its characters. A result then rides
// in the context of every later call of its transcript until a compaction: "carried" is its
// tokens times those calls, which is what it costs through the cache.
//
// Nothing a transcript says is printed: only numbers, the paths of files, the names of tools and
// attachments, the programs a command ran, IDs of sessions and the first task ID the author
// named. A program or a second word that is not a plain name is printed as "other".

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { byCodeUnits } from "../shared.mjs";
import { costOf, PRICES } from "./prices.mjs";
import { promptOf } from "../session/session.mjs";

// Tools whose results are counted by the file they read or wrote.
const BY_FILE = { Read: "file_path", Edit: "file_path", Write: "file_path", NotebookEdit: "notebook_path", Grep: "path", Glob: "path" };
// Programs whose second word names what ran: `just docs-check`, `gh api`, `node -e`.
const TWO_WORDS = new Set(["just", "gh", "git", "npm", "npx", "node", "go", "buf"]);
const PLAIN_PROGRAM = /^[A-Za-z0-9._+-]{1,40}$/;
const PLAIN_WORD = /^-?[A-Za-z0-9][A-Za-z0-9:._/-]{0,80}$/;

// Options of a program that take a value before the word that names what ran.
const OPTIONS_WITH_VALUE = { just: ["-f", "--justfile", "-d", "--working-directory"], git: ["-C", "-c"], timeout: ["-s", "--signal", "-k", "--kill-after"] };

// A part of a shell command without the brackets and spaces around it, by its characters rather
// than by a pattern, which would backtrack on a long run of them.
function unbracketed(part) {
  let start = 0;
  let end = part.length;
  while (start < end && "({ \t\r\n".includes(part[start])) start += 1;
  while (end > start && ")} \t\r\n".includes(part[end - 1])) end -= 1;
  return part.slice(start, end);
}

// The simple commands of a shell command, each as its words past the brackets of a subshell and
// the assignments of variables: `cd tools && (FOO=1 node x.mjs)` gives [cd, tools] and [node, x.mjs].
function commandsOf(command) {
  const commands = [];
  for (const part of String(command).split(/&&|\|\||[;|\n]/)) {
    const words = unbracketed(part).split(/\s+/).filter(Boolean);
    while (words.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(words[0])) words.shift();
    if (words.length) commands.push(words);
  }
  return commands;
}

// The words after a program's name, past its options that come before what ran: `git -C dir log`
// gives [log], `timeout -s KILL 10 just x` gives [just, x].
function argumentsOf(program, words) {
  let rest = words.slice(1);
  const withValue = OPTIONS_WITH_VALUE[program] ?? [];
  for (;;) {
    const word = rest[0];
    if (!word?.startsWith("-")) break;
    if (withValue.includes(word)) rest = rest.slice(2);
    else if (program === "timeout") rest = rest.slice(1);
    else break;
  }
  if (program === "timeout" && /^\d/.test(rest[0] ?? "")) rest = rest.slice(1);
  return rest;
}

// The program a shell command ran, for grouping: the first command that is not `cd`, past a
// subshell's bracket, assignments of variables and `timeout`, and for some programs their second
// word, past the options that come before it.
export function programOf(command) {
  for (let words of commandsOf(command)) {
    if (words[0] === "timeout") words = argumentsOf("timeout", words);
    if (!words.length || words[0] === "cd") continue;
    const program = path.basename(words[0]);
    if (!PLAIN_PROGRAM.test(program)) return "other";
    if (!TWO_WORDS.has(program)) return program;
    const second = argumentsOf(program, words)[0];
    return second && PLAIN_WORD.test(second) ? `${program} ${second}` : program;
  }
  return "other";
}

const SESSION_ID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;

// A path as the report prints it: inside the repository, from its root; in the home folder, from
// ~. A session's own folders — its scratchpad, the output of a tool it kept in a file — are one
// group for every session: an ID of a session reads <session>, and a kept output's name *.
export function shownPath(file, root, home = os.homedir()) {
  if (typeof file !== "string" || !file) return ".";
  let shown = file;
  if (root && (file === root || file.startsWith(root + "/"))) shown = path.relative(root, file) || ".";
  else if (home && file.startsWith(home + "/")) shown = "~/" + path.relative(home, file);
  shown = shown.replace(SESSION_ID, "<session>");
  return shown.replace(/\/tool-results\/[^/]+$/, "/tool-results/*");
}

// A word of path characters with a dot or a slash among them, by two patterns, so that neither
// backtracks.
const PATH_CHARS = /^[A-Za-z0-9_.~/-]+$/;
const isPathWord = (word) => PATH_CHARS.test(word) && /[./]/.test(word);
const MAX_FILES = 10;

const home = (word) => (word.startsWith("~/") ? path.join(os.homedir(), word.slice(2)) : word);

// The files a shell command names — `sed -n 1,40p RUN.md`, `grep -n R19 docs/decisions.md` — as
// far as they are files on this machine now; at most MAX_FILES of them. A relative path is read
// from the folder the command is in at that point: the repository's root, where every command of
// a session starts, or wherever a `cd` or `git -C` before it went. `isFile` is asked once for each
// path.
export function filesOf(command, root, isFile) {
  const files = [];
  let folder = root ?? "/";
  for (const words of commandsOf(command)) {
    if (words[0] === "cd") {
      if (words[1]) folder = path.resolve(folder, home(words[1].replace(/^["']|["']$/g, "")));
      continue;
    }
    const gitC = words[0] === "git" && words[1] === "-C" && words[2];
    const here = gitC ? path.resolve(folder, home(words[2])) : folder;
    for (const raw of (gitC ? words.slice(3) : words).join(" ").split(/[\s'"=<>()]+/)) {
      if (files.length >= MAX_FILES) return files;
      if (!raw || !isPathWord(raw) || raw.startsWith("-") || raw === "." || raw === "..") continue;
      const absolute = path.resolve(here, home(raw));
      if (isFile(absolute)) {
        const shown = shownPath(absolute, root);
        if (!files.includes(shown)) files.push(shown);
      }
    }
  }
  return files;
}

// Whether a path is a file, asked of the disk once for each path. A path the disk will not answer for
// — another user's home, such as /root/.config/go in a command of module-kit, or a word too long to
// be a name — is not a file here.
export function fileCheck(stat = fs.statSync) {
  const known = new Map();
  const isFile = (file) => {
    try {
      return Boolean(stat(file, { throwIfNoEntry: false })?.isFile());
    } catch {
      return false;
    }
  };
  return (file) => {
    if (!known.has(file)) known.set(file, isFile(file));
    return known.get(file);
  };
}

// How a tool's call is grouped: { tool, key, partial, files }.
function describe(block, root, isFile) {
  const tool = String(block.name);
  const input = block.input ?? {};
  if (tool === "Bash") return { tool, key: programOf(input.command ?? ""), files: filesOf(input.command ?? "", root, isFile) };
  if (tool in BY_FILE) {
    const partial = tool === "Read" && (input.offset != null || input.limit != null || input.pages != null);
    return { tool, key: shownPath(input[BY_FILE[tool]], root), partial };
  }
  return { tool, key: null };
}

// The characters of every string in a value: what an attachment puts into the context.
function charsOf(value) {
  if (typeof value === "string") return value.length;
  if (Array.isArray(value)) return value.reduce((sum, v) => sum + charsOf(v), 0);
  if (value && typeof value === "object") return Object.entries(value).reduce((sum, [k, v]) => sum + (k === "type" ? 0 : charsOf(v)), 0);
  return 0;
}

// The characters of a tool's result as the model saw it: text blocks, or a string.
function resultChars(content) {
  if (typeof content === "string") return content.length;
  if (!Array.isArray(content)) return 0;
  return content.reduce((sum, b) => sum + (b?.type === "text" ? String(b.text ?? "").length : 0), 0);
}


function inWindow(timestamp, since, until) {
  return (!since || timestamp >= since) && (!until || timestamp < until);
}

const TIME = /^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)(Z|[+-]\d{2}:\d{2})?)?$/;

// A time from the command line, as ISO 8601: a date is its first moment, and a time without a zone
// is in UTC, whatever the zone of the machine.
export function timeOf(text) {
  if (text == null) return null;
  const parts = TIME.exec(text);
  const date = parts && new Date(`${parts[1]}T${parts[2] ?? "00:00"}${parts[3] ?? "Z"}`);
  if (!date || Number.isNaN(date.getTime())) throw new Error(`not a date or a time of ISO 8601: ${text}`);
  return date.toISOString();
}

// What a group counts for an entry that carries nothing of its own.
const NOTHING = Object.freeze({ chars: 0 });

// What the transcripts hold, from those `read` returns for each of `transcripts`.
export function measure(transcripts, { read, root, since = null, until = null, prices = PRICES, isFile = fileCheck() } = {}) {
  const calls = new Map();
  const sessions = new Map();
  const segments = [];
  const costStates = new Map();
  let broken = 0;
  let compactions = 0;
  let resumed = 0;
  for (const transcript of transcripts) {
    const { records, broken: bad } = read(transcript.file);
    broken += bad;
    const uses = new Map();
    let window = [];
    let segment = { before: null, items: [], window, start: !transcript.subagent };
    const session = sessions.get(transcript.session) ?? { id: transcript.session, task: null, start: null, transcripts: 0, subagents: 0 };
    sessions.set(transcript.session, session);
    if (transcript.subagent) session.subagents += 1;
    else session.transcripts += 1;
    for (const r of records) {
      if (r.type === "cost-state" && typeof r.totalCostUSD === "number") {
        costStates.set(r.sessionId ?? transcript.session, Math.max(costStates.get(r.sessionId ?? transcript.session) ?? 0, r.totalCostUSD));
      } else if (r.type === "system" && r.subtype === "compact_boundary") {
        if (inWindow(r.timestamp ?? "", since, until)) compactions += 1;
        window = [];
        segment = { before: null, items: [], window, start: false, compacted: true };
      } else if (r.type === "attachment" && r.attachment) {
        const a = r.attachment;
        // What an attachment puts into the context is what it rendered. A snapshot of the system
        // prompt renders nothing: the prompt goes first in every call, so it is counted once, at
        // the start of a session. Other records without a rendering — of deferred tools, of
        // dropped thinking — put nothing in.
        if (a.type === "instructions" && Array.isArray(a.files)) {
          for (const f of a.files) segment.items.push({ kind: "instructions", key: shownPath(f.path, root), chars: String(f.content ?? "").length });
        } else if (a.type === "prompt_snapshot") {
          if (segment.start && !segment.items.some((i) => i.kind === "system prompt")) segment.items.push({ kind: "system prompt", key: null, chars: charsOf(a.systemPrompt) + charsOf(a.tools) });
        } else if (r.rendered != null) segment.items.push({ kind: "attachment", key: String(a.type), chars: charsOf(r.rendered) });
      } else if (r.type === "user" && r.message) {
        const content = r.message.content;
        // The first prompt the author sent, read for a task ID alone, by the rule the hook of
        // tools/session/ reads prompts by.
        if (!transcript.subagent && session.task === null) {
          const text = promptOf(r);
          if (text != null) session.task = /\bT(\d{1,4})\b/.exec(text)?.[0] ?? "";
        }
        if (Array.isArray(content)) {
          for (const b of content) {
            if (b?.type === "tool_result") {
              const use = uses.get(b.tool_use_id) ?? { tool: "unknown", key: null };
              segment.items.push({ kind: "tool", ...use, chars: resultChars(b.content) });
            } else if (b?.type === "text") segment.items.push({ kind: r.isMeta || r.isCompactSummary ? "reminder" : "prompt", key: null, chars: String(b.text ?? "").length });
          }
        } else if (typeof content === "string") {
          segment.items.push({ kind: r.isMeta || r.isCompactSummary ? "reminder" : "prompt", key: null, chars: content.length });
        }
      } else if (r.type === "assistant" && r.message?.id && r.message.usage && r.message.model !== "<synthetic>") {
        const m = r.message;
        for (const b of Array.isArray(m.content) ? m.content : []) if (b?.type === "tool_use") uses.set(b.id, describe(b, root, isFile));
        const u = m.usage;
        const known = calls.get(m.id);
        if (known) {
          known.output = Math.max(known.output, u.output_tokens ?? 0);
          // A call of another transcript: this one resumes a session and copies its history, which
          // that transcript has counted. What came with the copy is dropped, and the next call of
          // this transcript grows from the copied call.
          if (known.file !== transcript.file && !segment.resumed) resumed += 1;
          if (known.file !== transcript.file) segment = { before: known, items: [], window, start: false, resumed: true };
          continue;
        }
        const write = u.cache_creation_input_tokens ?? 0;
        const write1h = u.cache_creation?.ephemeral_1h_input_tokens ?? 0;
        const call = {
          file: transcript.file,
          session: transcript.session,
          subagent: transcript.subagent,
          model: m.model,
          speed: u.speed,
          timestamp: r.timestamp ?? "",
          input: u.input_tokens ?? 0,
          read: u.cache_read_input_tokens ?? 0,
          write,
          write1h,
          write5m: u.cache_creation ? (u.cache_creation.ephemeral_5m_input_tokens ?? 0) : write,
          output: u.output_tokens ?? 0,
        };
        call.context = call.input + call.read + call.write;
        call.counted = inWindow(call.timestamp, since, until);
        calls.set(m.id, call);
        window.push(call);
        segment.after = call;
        segment.at = window.length - 1;
        segments.push(segment);
        segment = { before: call, items: [], window, start: false };
        if (call.counted && (session.start === null || call.timestamp < session.start)) session.start = call.timestamp;
      }
    }
  }
  return summarize({ calls: [...calls.values()], sessions, segments, costStates, broken, compactions, resumed, prices });
}

function emptyTotals() {
  return { calls: 0, input: 0, read: 0, write5m: 0, write1h: 0, output: 0, context: 0, maxContext: 0, cost: 0, unpriced: 0 };
}

function add(totals, call, prices) {
  totals.calls += 1;
  totals.input += call.input;
  totals.read += call.read;
  totals.write5m += call.write5m;
  totals.write1h += call.write1h;
  totals.output += call.output;
  totals.context += call.context;
  totals.maxContext = Math.max(totals.maxContext, call.context);
  const cost = costOf(call.model, call, prices);
  if (cost === null) totals.unpriced += 1;
  else totals.cost += cost;
}

function summarize({ calls, sessions, segments, costStates, broken, compactions, resumed, prices }) {
  const main = emptyTotals();
  const subagents = emptyTotals();
  const models = new Map();
  const bySession = new Map();
  for (const call of calls) {
    if (!call.counted) continue;
    add(call.subagent ? subagents : main, call, prices);
    const s = bySession.get(call.session) ?? { main: emptyTotals(), subagents: emptyTotals() };
    bySession.set(call.session, s);
    add(call.subagent ? s.subagents : s.main, call, prices);
    models.set(call.model, (models.get(call.model) ?? 0) + 1);
  }

  // Growth shared among what entered, then carried until a compaction.
  const groups = new Map();
  let chars = 0;
  let tokens = 0;
  const starts = [];
  const count = (name, share, later, item = NOTHING) => {
    const g = groups.get(name) ?? { name, count: 0, partial: 0, chars: 0, tokens: 0, carried: 0 };
    groups.set(name, g);
    g.count += 1;
    if (item.partial) g.partial += 1;
    g.chars += item.chars;
    g.tokens += share;
    g.carried += share * later;
  };
  // How many counted calls a window has from each of its calls on, counted once for each window.
  const suffixes = new Map();
  const laterOf = ({ window, at }) => {
    let suffix = suffixes.get(window);
    if (!suffix) {
      suffix = new Array(window.length + 1).fill(0);
      for (let i = window.length - 1; i >= 0; i -= 1) suffix[i] = suffix[i + 1] + (window[i].counted ? 1 : 0);
      suffixes.set(window, suffix);
    }
    return suffix[at];
  };
  for (const segment of segments) {
    const { before, after, items } = segment;
    if (!after.counted) continue;
    const later = laterOf(segment);
    // The history a resumed session copied rides on as a whole, like what a compaction leaves.
    if (segment.resumed) count("history of a resumed session", before.context, later);
    // What a transcript starts with — a session's or a subagent's —, and what a compaction leaves,
    // enter as a whole: the first call's context.
    if (!before) {
      if (segment.start) starts.push({ context: after.context, items });
      count(segment.start ? "start of a session" : segment.compacted ? "after a compaction" : "start of a subagent", after.context, later);
      continue;
    }
    // The model's own output rides on in the context too.
    count("model output", Math.min(before.output, Math.max(0, after.context - before.context)), later);
    const growth = Math.max(0, after.context - before.context - before.output);
    const total = items.reduce((sum, i) => sum + i.chars, 0);
    for (const item of items) {
      const share = total ? (growth * item.chars) / total : 0;
      chars += item.chars;
      tokens += share;
      for (const [name, weight] of groupsOf(item)) count(name, share * weight, later, { chars: item.chars * weight, partial: item.partial });
    }
  }
  const charsPerToken = tokens ? chars / tokens : null;
  // Every token a call sent, but what a growth below zero lost, is carried by one group: by tool
  // or kind, without its files and programs.
  const carried = [...groups.values()].filter((g) => !/^(file|program) /.test(g.name)).reduce((sum, g) => sum + g.carried, 0);

  // The start of a session: its first call's context, and what the transcript shows of it.
  const start = new Map();
  for (const { context, items } of starts) {
    let known = 0;
    for (const item of items) {
      const name = item.kind === "instructions" ? `instructions ${item.key}` : item.kind === "attachment" ? `attachment ${item.key}` : item.kind;
      const estimate = charsPerToken ? item.chars / charsPerToken : 0;
      known += estimate;
      const g = start.get(name) ?? { name, chars: 0, tokens: 0 };
      start.set(name, g);
      g.chars += item.chars;
      g.tokens += estimate;
    }
    const rest = start.get("rest") ?? { name: "rest", chars: 0, tokens: 0 };
    start.set("rest", rest);
    rest.tokens += context - known;
  }

  const sessionRows = [];
  for (const [id, s] of bySession) {
    const info = sessions.get(id);
    sessionRows.push({ id, start: info.start, task: info.task || null, subagentTranscripts: info.subagents, main: s.main, subagents: s.subagents });
  }
  sessionRows.sort((a, b) => byCodeUnits(a.start ?? "", b.start ?? "") || byCodeUnits(a.id, b.id));
  const costState = sessionRows.reduce((sum, s) => sum + (costStates.get(s.id) ?? 0), 0);
  const contexts = starts.map((s) => s.context).sort((a, b) => a - b);
  const middle = contexts.length >> 1;
  const medianContext = contexts.length % 2 ? contexts[middle] : contexts.length ? (contexts[middle - 1] + contexts[middle]) / 2 : 0;

  return {
    sessions: sessionRows.length,
    subagentTranscripts: sessionRows.reduce((sum, s) => sum + s.subagentTranscripts, 0),
    first: sessionRows[0]?.start ?? null,
    last: calls.filter((c) => c.counted).reduce((max, c) => (c.timestamp > max ? c.timestamp : max), "") || null,
    main,
    subagents,
    models: Object.fromEntries([...models].sort((a, b) => byCodeUnits(a[0], b[0]))),
    compactions,
    resumed,
    broken,
    costState,
    charsPerToken,
    carried,
    groups: [...groups.values()],
    start: {
      sessions: starts.length,
      medianContext,
      parts: [...start.values()].map((g) => ({ name: g.name, chars: g.chars / (starts.length || 1), tokens: g.tokens / (starts.length || 1) })),
    },
    bySession: sessionRows,
  };
}

// The groups an item counts in, each with the part of it that counts there: by tool or kind; by
// tool and file, or by program; and a command's result shared among the files it names.
function groupsOf(item) {
  if (item.kind === "tool") {
    const names = [[`tool ${item.tool}`, 1]];
    if (item.tool === "Bash") {
      names.push([`program ${item.key}`, 1]);
      for (const file of item.files ?? []) names.push([`file ${file} (Bash)`, 1 / item.files.length]);
    } else if (item.key !== null) names.push([`file ${item.key} (${item.tool})`, 1]);
    return names;
  }
  if (item.kind === "attachment") return [[`attachment ${item.key}`, 1]];
  if (item.kind === "instructions") return [[`instructions ${item.key}`, 1]];
  return [[item.kind, 1]];
}

// --- printing ---

const int = (n) => Math.round(n).toLocaleString("en-US");
const millions = (n) => (n / 1e6).toFixed(2);
const thousands = (n) => (n / 1e3).toFixed(1);
const dollars = (n) => `$${n.toFixed(2)}`;

function table(header, rows) {
  const all = [header, ...rows];
  const widths = header.map((_, i) => Math.max(...all.map((r) => String(r[i]).length)));
  return all.map((r) => r.map((cell, i) => (i === 0 ? String(cell).padEnd(widths[i]) : String(cell).padStart(widths[i]))).join("  ").trimEnd());
}

function totalsOf(a, b) {
  const t = emptyTotals();
  for (const k of Object.keys(t)) t[k] = k === "maxContext" ? Math.max(a[k], b[k]) : a[k] + b[k];
  return t;
}

// The report as one row of the table of measurements 1.9: the project, the window, sessions, calls,
// the context of a call and the cost, main and subagents apart, and compactions. The window is the
// one asked for, or else that of the calls counted; a time prints to the minute, in UTC.
export function row(data, { project = "", since = null, until = null } = {}) {
  const avg = (t) => (t.calls ? thousands(t.context / t.calls) : "—");
  const minute = (time) => (time ? time.slice(0, 16) : "—");
  const cost = totalsOf(data.main, data.subagents).cost;
  const cells = [
    project,
    `${minute(since ?? data.first)} … ${minute(until ?? data.last)}`,
    int(data.sessions),
    `${int(data.main.calls)} / ${int(data.subagents.calls)}`,
    `${avg(data.main)} / ${avg(data.subagents)}`,
    int(data.compactions),
    `$${cost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  ];
  return `| ${cells.join(" | ")} |`;
}

// The report as lines of text: the totals, the start of a session, the groups by what they carried,
// and every session. `top` is how many groups of each kind are listed.
export function format(data, { top = 20, project = "" } = {}) {
  const both = totalsOf(data.main, data.subagents);
  const avg = (t) => (t.calls ? thousands(t.context / t.calls) : "—");
  const lines = [
    `tokens: ${project} — ${data.sessions} sessions, ${data.subagentTranscripts} subagent transcripts, ${data.first ?? "—"} … ${data.last ?? "—"}`,
    "",
    ...table(
      ["", "main", "subagents", "total"],
      [
        ["calls", int(data.main.calls), int(data.subagents.calls), int(both.calls)],
        ["cache read, M", millions(data.main.read), millions(data.subagents.read), millions(both.read)],
        ["cache write 5m, M", millions(data.main.write5m), millions(data.subagents.write5m), millions(both.write5m)],
        ["cache write 1h, M", millions(data.main.write1h), millions(data.subagents.write1h), millions(both.write1h)],
        ["output, M", millions(data.main.output), millions(data.subagents.output), millions(both.output)],
        ["uncached input", int(data.main.input), int(data.subagents.input), int(both.input)],
        ["context per call, k", avg(data.main), avg(data.subagents), avg(both)],
        ["largest context, k", thousands(data.main.maxContext), thousands(data.subagents.maxContext), thousands(both.maxContext)],
        ["cost at API prices", dollars(data.main.cost), dollars(data.subagents.cost), dollars(both.cost)],
      ],
    ),
    "",
    `compactions ${data.compactions}; resumed transcripts ${data.resumed}; calls without a price ${both.unpriced}; lines not JSON ${data.broken}; models ${Object.entries(data.models).map(([m, n]) => `${m} ${int(n)}`).join(", ") || "—"}`,
    `Claude Code's own estimate (cost-state, whole sessions): ${dollars(data.costState)}; characters per token of what entered between calls: ${data.charsPerToken ? data.charsPerToken.toFixed(2) : "—"}`,
    `carried by all groups ${millions(data.carried)}M of the context of all calls ${millions(both.context)}M`,
    "",
    `start of a session — ${data.start.sessions} sessions, median context of the first call ${thousands(data.start.medianContext)}k; mean per session:`,
    ...table(
      ["part", "chars", "tokens, k"],
      [...data.start.parts].sort((a, b) => b.tokens - a.tokens).map((p) => [p.name, int(p.chars), thousands(p.tokens)]),
    ),
  ];
  const kinds = [
    ["by tool or kind", (g) => !g.name.startsWith("file ") && !g.name.startsWith("program ")],
    ["by file", (g) => g.name.startsWith("file ")],
    ["by program of Bash", (g) => g.name.startsWith("program ")],
  ];
  for (const [title, keep] of kinds) {
    const rows = data.groups.filter(keep).sort((a, b) => b.carried - a.carried || byCodeUnits(a.name, b.name)).slice(0, top);
    lines.push("", `what entered between calls, ${title}, by what it carried (top ${top}):`);
    lines.push(...table(["group", "count", "partial", "chars", "tokens, k", "carried, M"], rows.map((g) => [g.name.replace(/^(file|program) /, ""), int(g.count), int(g.partial), int(g.chars), thousands(g.tokens), millions(g.carried)])));
  }
  lines.push("", "sessions:");
  lines.push(
    ...table(
      ["session", "start", "task", "calls", "sub", "ctx/call, k", "read, M", "write, M", "output, M", "cost"],
      data.bySession.map((s) => {
        const t = totalsOf(s.main, s.subagents);
        return [s.id.slice(0, 8), (s.start ?? "").slice(0, 16), s.task ?? "—", int(s.main.calls), int(s.subagents.calls), avg(t), millions(t.read), millions(t.write5m + t.write1h), millions(t.output), dollars(t.cost)];
      }),
    ),
  );
  return lines;
}
