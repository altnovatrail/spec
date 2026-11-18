// Each test reads made-up transcripts, written to a temporary folder: none is a real session's.
// Every text a transcript holds carries SECRET, and no report may print it.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { GIT } from "../../shared.mjs";
import { costOf, PRICES } from "../prices.mjs";
import { FIRST_CALLS, filesOf, fileCheck, format, measure, programOf, row, shownPath, timeOf } from "../report.mjs";
import { classesOf, classOf, formatClasses, groupOf, kindOf, pathsOf, writes } from "../classes.mjs";
import { firstRecordOf, firstTimeOf, projectsRoot, readTranscript, repositoryRoot, slugOf, transcriptsOf } from "../transcripts.mjs";
import { argumentsOf, rootOfTranscripts, tokensReport } from "../main.mjs";

const SECRET = "SECRET-ТЕКСТ-7f3a";
const ROOT = "/r";
const OPUS = "claude-opus-5-5";

function usage({ input = 0, read = 0, w5 = 0, w1h = 0, output = 0, speed = "standard" } = {}) {
  return {
    input_tokens: input,
    cache_read_input_tokens: read,
    cache_creation_input_tokens: w5 + w1h,
    cache_creation: { ephemeral_5m_input_tokens: w5, ephemeral_1h_input_tokens: w1h },
    output_tokens: output,
    speed,
  };
}

// A call of the model whose context is `read` tokens from the cache, with the tools it calls.
function call(id, read, { output = 10, ts = "2026-11-09T10:00:00Z", tools = [], model = OPUS, extra = {} } = {}) {
  return {
    type: "assistant",
    timestamp: ts,
    message: {
      id,
      model,
      usage: usage({ read, output, ...extra }),
      content: [{ type: "thinking", thinking: SECRET }, ...tools.map(([toolId, name, input]) => ({ type: "tool_use", id: toolId, name, input }))],
    },
  };
}

const result = (toolId, text) => ({ type: "user", message: { role: "user", content: [{ type: "tool_result", tool_use_id: toolId, content: [{ type: "text", text }] }] } });
const prompt = (text) => ({ type: "user", message: { role: "user", content: text } });
const attachment = (a, rendered) => ({ type: "attachment", attachment: a, ...(rendered === undefined ? {} : { rendered }) });

// A project's folder: { session: records } and, for subagents, { session: { agent: records } }.
function project(sessions, subagents = {}, broken = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tokens-"));
  const lines = (records, extra = "") => records.map((r) => JSON.stringify(r)).join("\n") + "\n" + extra;
  for (const [id, records] of Object.entries(sessions)) fs.writeFileSync(path.join(dir, `${id}.jsonl`), lines(records, broken[id] ?? ""));
  for (const [id, agents] of Object.entries(subagents)) {
    fs.mkdirSync(path.join(dir, id, "subagents"), { recursive: true });
    for (const [agent, records] of Object.entries(agents)) fs.writeFileSync(path.join(dir, id, "subagents", `agent-${agent}.jsonl`), lines(records));
  }
  return dir;
}

// Every path with an extension is a file; a folder has none.
const everyFile = (p) => /\.\w+$/.test(p);
const run = (dir, options = {}) => measure(transcriptsOf(dir), { read: readTranscript, root: ROOT, isFile: everyFile, ...options });
const group = (data, name) => data.groups.find((g) => g.name === name);

test("a call repeated in a transcript counts once, with its greatest output", () => {
  const dir = project({ s1: [prompt(SECRET), call("m1", 1_000_000, { output: 5 }), call("m1", 1_000_000, { output: 9 })] });
  const data = run(dir);
  assert.equal(data.main.calls, 1);
  assert.equal(data.main.output, 9);
  assert.equal(data.main.read, 1_000_000);
  assert.ok(Math.abs(data.main.cost - (1_000_000 * 0.2 + 9 * 20) / 1e6) < 1e-12);
});

test("what enters between calls shares their growth by its characters, and carries it on", () => {
  const dir = project({
    s1: [
      prompt(`Выполни задачу T118 из RUN.md ${SECRET}`),
      call("m1", 1000, { output: 100, tools: [["t1", "Read", { file_path: "/r/docs/a.md", offset: 3 }], ["t2", "Bash", { command: `cd /r && sed -n 1,5p RUN.md # ${SECRET}` }]] }),
      result("t1", "x".repeat(300)),
      result("t2", "y".repeat(100)),
      call("m2", 1500, { output: 50 }),
      call("m3", 1600),
    ],
  });
  const data = run(dir);
  assert.equal(data.bySession[0].task, "T118");
  assert.equal(data.charsPerToken, 1);
  assert.deepEqual(group(data, "tool Read"), { name: "tool Read", count: 1, partial: 1, chars: 300, tokens: 300, carried: 600 });
  assert.equal(group(data, "file docs/a.md (Read)").carried, 600);
  assert.equal(group(data, "program sed").tokens, 100);
  assert.equal(group(data, "file RUN.md (Bash)").chars, 100);
  // m1's output rides in m2 and m3; m2's grows m3 by 50 and rides there.
  assert.equal(group(data, "model output").carried, 100 * 2 + 50);
  assert.equal(group(data, "start of a session").carried, 1000 * 3);
  assert.equal(data.carried, 3000 + 250 + 600 + 200);
});

test("a growth below the output counts no more than it grew, and nothing for what entered", () => {
  const dir = project({ s1: [call("m1", 1000, { output: 300, tools: [["t1", "Glob", {}]] }), result("t1", "z"), call("m2", 1100)] });
  const data = run(dir);
  assert.equal(group(data, "model output").tokens, 100);
  assert.equal(group(data, "tool Glob").tokens, 0);
  assert.equal(group(data, "file . (Glob)").count, 1);
  assert.equal(data.charsPerToken, null);
});

test("a compaction ends what a result carries, and what it leaves enters as a whole", () => {
  const dir = project({
    s1: [
      call("m1", 1000, { tools: [["t1", "Grep", { path: "/r/docs" }]] }),
      result("t1", "a".repeat(90)),
      call("m2", 1100),
      call("m3", 1200),
      { type: "system", subtype: "compact_boundary", timestamp: "2026-11-09T10:00:00Z" },
      { type: "user", isCompactSummary: true, message: { content: SECRET } },
      call("m4", 400),
      call("m5", 410),
    ],
  });
  const data = run(dir);
  assert.equal(data.compactions, 1);
  assert.equal(group(data, "file docs (Grep)").carried, 90 * 2);
  assert.equal(group(data, "after a compaction").carried, 400 * 2);
  assert.equal(data.bySession[0].task, null);
});

test("a transcript that resumes a session drops the copied history and grows from it", () => {
  const dir = project({
    a: [call("m1", 1000, { tools: [["t1", "Read", { file_path: "/r/x.md" }]] }), result("t1", "x".repeat(50)), call("m2", 1050)],
    b: [
      prompt(`T05 ${SECRET}`),
      call("m1", 1000, { tools: [["t1", "Read", { file_path: "/r/x.md" }]] }),
      result("t1", "x".repeat(50)),
      call("m2", 1050),
      call("m2", 1050),
      prompt("y".repeat(40)),
      { type: "user", message: { content: [{ type: "text", text: SECRET }, { type: "image" }] } },
      call("n1", 1100 + 7),
      call("n2", 1200, { tools: [["t9", "WebFetch", { url: SECRET }]] }),
    ],
  });
  const data = run(dir);
  assert.equal(data.resumed, 1);
  assert.equal(data.main.calls, 4);
  assert.equal(group(data, "file x.md (Read)").count, 1);
  assert.equal(group(data, "history of a resumed session").tokens, 1050);
  assert.equal(group(data, "prompt").chars, 40 + SECRET.length);
  assert.equal(data.start.sessions, 1);
  assert.equal(data.bySession.find((x) => x.id === "b").task, "T05");
});

test("the median of an even number of starts is the mean of the middle two", () => {
  const data = run(project({ a: [call("m1", 100)], b: [call("n1", 300)], c: [call("o1", 200)], d: [call("p1", 1000)] }));
  assert.equal(data.start.medianContext, 250);
  assert.equal(run(project({ a: [call("m1", 100)], b: [call("n1", 300)], c: [call("o1", 200)] })).start.medianContext, 200);
});

test("a subagent's calls count apart, under its session", () => {
  const dir = project({ s1: [prompt("без задачи"), call("m1", 100)] }, { s1: { a1: [prompt(`T999 ${SECRET}`), call("x1", 50), call("x2", 70)] } });
  const data = run(dir);
  assert.equal(data.sessions, 1);
  assert.equal(data.subagentTranscripts, 1);
  assert.equal(data.main.calls, 1);
  assert.equal(data.subagents.calls, 2);
  assert.equal(data.bySession[0].task, null);
  assert.equal(group(data, "start of a subagent").carried, 100);
  assert.equal(data.start.sessions, 1);
});

test("--since and --until bound the calls by their time", () => {
  const dir = project({
    s1: [call("m1", 100, { ts: "2026-11-08T23:59:59Z" }), call("m2", 200, { ts: "2026-11-09T00:00:00Z" }), call("m3", 300, { ts: "2026-11-10T00:00:00Z" })],
    s2: [call("n1", 100, { ts: "2026-11-01T00:00:00Z" })],
  });
  const data = run(dir, { since: timeOf("2026-11-09"), until: timeOf("2026-11-10") });
  assert.equal(data.main.calls, 1);
  assert.equal(data.sessions, 1);
  assert.equal(data.first, "2026-11-09T00:00:00Z");
  assert.equal(data.last, "2026-11-09T00:00:00Z");
  assert.equal(data.start.sessions, 0);
});

test("the start of a session: its first call, by what the transcript shows of it", () => {
  const dir = project({
    s1: [
      attachment({ type: "prompt_snapshot", systemPrompt: ["s".repeat(40)] }),
      attachment({ type: "instructions", files: [{ path: "/r/CLAUDE.md", content: `${SECRET}`.padEnd(60, ".") }] }),
      attachment({ type: "skill_listing", content: SECRET }, { content: "k".repeat(20) }),
      attachment({ type: "deferred_tools_record", entries: [SECRET] }),
      attachment({ type: "prompt_snapshot", systemPrompt: ["again"] }),
      prompt("p".repeat(20)),
      call("m1", 1000, { tools: [["t1", "Write", { file_path: "/home/someone/x" }]] }),
      result("t1", "w".repeat(10)),
      attachment({ type: "prompt_snapshot", systemPrompt: [SECRET] }),
      attachment({ type: "total_tokens_reminder", text: SECRET }, "r".repeat(10)),
      call("m2", 1030),
    ],
  });
  const data = run(dir);
  const part = (name) => data.start.parts.find((p) => p.name === name);
  assert.equal(data.start.medianContext, 1000);
  assert.equal(data.charsPerToken, 20 / 20);
  assert.equal(part("system prompt").chars, 40);
  assert.equal(part("instructions CLAUDE.md").tokens, 60);
  assert.equal(part("attachment skill_listing").chars, 20);
  assert.equal(part("prompt").tokens, 20);
  assert.equal(part("rest").tokens, 1000 - 140);
  assert.equal(part("attachment deferred_tools_record"), undefined);
  assert.equal(group(data, "attachment total_tokens_reminder").tokens, 10);
  assert.equal(group(data, "attachment prompt_snapshot"), undefined);
});

test("lines that are not JSON are counted, calls without a price too, and cost-state is the greatest", () => {
  const dir = project(
    {
      s1: [
        call("m1", 100, { model: "claude-unknown" }),
        call("m2", 100, { extra: { speed: "fast" } }),
        call("m3", 100, { model: "<synthetic>" }),
        { type: "assistant", message: { id: "m4" } },
        { type: "cost-state", sessionId: "s1", totalCostUSD: 1.5 },
        { type: "cost-state", sessionId: "s1", totalCostUSD: 2.5 },
      ],
    },
    {},
    { s1: '{"type": "assistant", "mess' },
  );
  const data = run(dir);
  assert.equal(data.broken, 1);
  assert.equal(data.main.calls, 2);
  assert.equal(data.main.unpriced, 2);
  assert.equal(data.costState, 2.5);
  assert.deepEqual(data.models, { "claude-unknown": 1, [OPUS]: 1 });
});

test("a call without the split of its cache writes counts them as written for 5 minutes", () => {
  const dir = project({ s1: [{ type: "assistant", timestamp: "2026-11-09T00:00:00Z", message: { id: "m1", model: OPUS, usage: { input_tokens: 1, cache_creation_input_tokens: 40, output_tokens: 2 } } }] });
  const data = run(dir);
  assert.equal(data.main.write5m, 40);
  assert.equal(data.main.write1h, 0);
  assert.equal(data.main.context, 41);
});

test("prices weigh every field of a call", () => {
  assert.equal(costOf(OPUS, { input: 1e6, write5m: 1e6, write1h: 1e6, read: 1e6, output: 1e6 }), 4 + 5 + 8 + 0.2 + 20);
  assert.equal(costOf("claude-haiku-4-5-20251001", { input: 0, write5m: 0, write1h: 2e6, read: 0, output: 0 }), PRICES["claude-haiku-4-5-20251001"].write1h * 2);
  assert.equal(costOf("none", { input: 1 }), null);
});

test("a command is grouped by its program, and a word that is not a name by other", () => {
  assert.equal(programOf("cd /r && just docs-check"), "just docs-check");
  assert.equal(programOf("cd /r; just -f spec/justfile docs-check-repo 2>&1 | tail"), "just docs-check-repo");
  assert.equal(programOf("FOO=1 BAR=2 node -e 'x'"), "node -e");
  assert.equal(programOf("timeout 300 gh api repos/x"), "gh api");
  assert.equal(programOf("timeout gh"), "gh");
  assert.equal(programOf("/usr/bin/git status"), "git status");
  assert.equal(programOf(`git "${SECRET} x"`), "git");
  assert.equal(programOf("sed -n 1,5p RUN.md"), "sed");
  assert.equal(programOf(`$(${SECRET})`), "other");
  assert.equal(programOf("cd /r"), "other");
  assert.equal(programOf(""), "other");
  assert.equal(programOf("git -C .repos/app log --oneline"), "git log");
  assert.equal(programOf("git -c core.pager=cat diff"), "git diff");
  assert.equal(programOf("(cd tools && node x.mjs)"), "node x.mjs");
  assert.equal(programOf("timeout -s KILL 10 just inbox"), "just inbox");
  assert.equal(programOf("timeout --foreground 5m gh pr list"), "gh pr");
  assert.equal(programOf("just -d /r -f j x"), "just x");
});

test("paths print from the repository's root or ~, and a session's own folders as one", () => {
  assert.equal(shownPath("/r/docs/a.md", "/r"), "docs/a.md");
  assert.equal(shownPath("/r", "/r"), ".");
  assert.equal(shownPath("/home/u/.claude/projects/p/0b110842-0969-4600-b613-20dfedb17843/tool-results/b1.txt", "/r", "/home/u"), "~/.claude/projects/p/<session>/tool-results/*");
  assert.equal(shownPath("/tmp/x", null, ""), "/tmp/x");
  assert.equal(shownPath(undefined, "/r"), ".");
  assert.equal(shownPath("/elsewhere/a", "/r", "/home/u"), "/elsewhere/a");
});

test("the files a command names are those on disk, at most ten, each once", () => {
  const isFile = (p) => p.startsWith("/r/") && !p.endsWith("/missing.md");
  assert.deepEqual(filesOf("sed -n 1,5p RUN.md docs/a.md RUN.md docs/missing.md -n .", "/r", isFile), ["RUN.md", "docs/a.md"]);
  assert.deepEqual(filesOf("cat ~/x.md", "/r", isFile), []);
  assert.deepEqual(filesOf("cd /r/.repos/app && sed -n 1,5p RUN.md && cd .. && cat a.md", "/r", isFile), [".repos/app/RUN.md", ".repos/a.md"]);
  assert.deepEqual(filesOf("cd '/r/docs'; grep x a.md", "/r", isFile), ["docs/a.md"]);
  assert.deepEqual(filesOf("git -C .repos/api show HEAD:RUN.md docs/b.md", "/r", isFile), [".repos/api/docs/b.md"]);
  assert.deepEqual(filesOf("cd && cat a.md", "/r", isFile), ["a.md"]);
  const many = Array.from({ length: 12 }, (_, i) => `f${i}.md`).join(" ");
  assert.equal(filesOf(`cat ${many}`, "/r", isFile).length, 10);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tokens-files-"));
  fs.writeFileSync(path.join(dir, "a.md"), "");
  const check = fileCheck();
  assert.deepEqual(filesOf("cat a.md b.md", dir, check), ["a.md"]);
  assert.equal(check(path.join(dir, "a.md")), true);
});

test("times from the command line, and wrong arguments", () => {
  assert.equal(timeOf("2026-11-09"), "2026-11-09T00:00:00.000Z");
  assert.equal(timeOf("2026-11-11T03:59:01Z"), "2026-11-11T03:59:01.000Z");
  assert.equal(timeOf(null), null);
  assert.equal(timeOf("2026-11-11T03:59"), "2026-11-11T03:59:00.000Z");
  assert.equal(timeOf("2026-11-11T06:59+03:00"), "2026-11-11T03:59:00.000Z");
  assert.throws(() => timeOf("вчера"), /not a date/);
  assert.throws(() => timeOf("1"), /not a date/);
  assert.throws(() => timeOf("2026-11-11 03:59"), /not a date/);
  assert.throws(() => timeOf("2026-13-45"), /not a date/);
  assert.deepEqual(argumentsOf(["--since", "2026-11-09", "--top", "3", "--json"]), { since: "2026-11-09T00:00:00.000Z", until: null, top: 3, projects: [], json: true, row: false, classes: false });
  assert.equal(argumentsOf(["--row"]).row, true);
  assert.equal(argumentsOf(["--classes"]).classes, true);
  for (const both of [["--row", "--json"], ["--classes", "--row"], ["--json", "--classes"]]) assert.throws(() => argumentsOf(both), /one of them/);
  assert.deepEqual(argumentsOf(["--project=-workspaces-app"]).projects, ["-workspaces-app"]);
  assert.deepEqual(argumentsOf(["--project=-a", "--project=-b"]).projects, ["-a", "-b"]);
  assert.throws(() => argumentsOf(["--top", "x"]), /not a number/);
  assert.throws(() => argumentsOf(["--since"]), /argument missing/);
  assert.throws(() => argumentsOf(["--project", "--json"]), /ambiguous/);
  assert.throws(() => argumentsOf(["--other", "1"]), /Unknown option/);
  assert.throws(() => argumentsOf(["extra"]), /positional/);
});

test("the folder of a repository's transcripts, under CLAUDE_CONFIG_DIR or ~/.claude", () => {
  assert.equal(slugOf("/workspaces/spec"), "-workspaces-spec");
  assert.equal(slugOf("/workspaces/.github"), "-workspaces--github");
  assert.equal(projectsRoot({ CLAUDE_CONFIG_DIR: "/c" }), "/c/projects");
  assert.equal(projectsRoot({}), path.join(os.homedir(), ".claude", "projects"));
});

// A git repository and a config folder with its project's transcripts, as a session leaves them.
function machine() {
  const repository = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "tokens-repo-")));
  assert.equal(spawnSync(GIT, ["init", "-q"], { cwd: repository }).status, 0);
  fs.mkdirSync(path.join(repository, "docs"));
  const config = fs.mkdtempSync(path.join(os.tmpdir(), "tokens-config-"));
  const dir = path.join(config, "projects", slugOf(repository));
  fs.mkdirSync(dir, { recursive: true });
  const records = [
    { type: "queue-operation", operation: "enqueue" },
    { ...attachment({ type: "instructions", files: [{ path: path.join(repository, "CLAUDE.md"), content: SECRET }] }, SECRET), cwd: repository },
    prompt(`Выполни задачу T07 ${SECRET}`),
    call("m1", 1000, { tools: [["t1", "Read", { file_path: path.join(repository, "docs", "a.md") }], ["t2", "Bash", { command: `grep -n ${SECRET} docs` }]] }),
    result("t1", `${SECRET}\n`.repeat(5)),
    result("t2", SECRET),
    call("m2", 1200),
  ];
  fs.writeFileSync(path.join(dir, "0b110842-0969-4600-b613-20dfedb17843.jsonl"), "half a line\n" + records.map((r) => JSON.stringify(r)).join("\n"));
  return { repository, config, dir };
}

test("the report of a repository prints numbers, paths and names, and never what a transcript says", () => {
  const { repository, config } = machine();
  assert.equal(repositoryRoot(path.join(repository, "docs")), repository);
  const text = tokensReport([], { cwd: path.join(repository, "docs"), env: { CLAUDE_CONFIG_DIR: config } });
  assert.equal(text.status, 0);
  const printed = text.lines.join("\n");
  assert.match(printed, /^tokens: -tmp-tokens-repo-/);
  assert.match(printed, /docs\/a\.md \(Read\)/);
  assert.match(printed, /instructions CLAUDE\.md/);
  assert.match(printed, /0b110842 .* T07 /);
  assert.match(printed, /cost at API prices/);
  assert.doesNotMatch(printed, new RegExp(SECRET));
  const json = tokensReport(["--json", "--top", "1"], { cwd: repository, env: { CLAUDE_CONFIG_DIR: config } });
  assert.equal(json.status, 0);
  assert.doesNotMatch(json.lines.join("\n"), new RegExp(SECRET));
  assert.equal(JSON.parse(json.lines[0]).main.calls, 2);
  // One row of the monthly measurement: the window asked for, or that of the calls.
  const one = tokensReport(["--row", "--until", "2030-01-01T10:20:30Z"], { cwd: repository, env: { CLAUDE_CONFIG_DIR: config } });
  assert.equal(one.status, 0);
  assert.equal(one.lines.length, 1);
  assert.match(one.lines[0], /^\| -tmp-tokens-repo-\S+ \| \S+ … 2030-01-01T10:20 \| 1 \| 2 \/ 0 \| 1\.\d \/ — \| 0 \| \$\d+\.\d\d \| 1\.\d \|$/);
  assert.doesNotMatch(one.lines[0], new RegExp(SECRET));
});

test("a path the disk will not answer for is not a file", () => {
  const denied = (code) => () => {
    throw Object.assign(new Error(code), { code });
  };
  assert.equal(fileCheck(denied("EACCES"))("/root/.config/go"), false);
  assert.equal(fileCheck(denied("EPERM"))("/root/.config/go"), false);
  assert.equal(fileCheck(denied("ENAMETOOLONG"))("/x"), false);
  assert.equal(fileCheck()(`/${"a".repeat(300)}.md`), false);
  // On the disk: a file in a folder this user cannot enter.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tokens-denied-"));
  fs.mkdirSync(path.join(dir, "closed"));
  fs.writeFileSync(path.join(dir, "closed", "a.md"), "x");
  fs.chmodSync(path.join(dir, "closed"), 0o000);
  try {
    assert.equal(fileCheck()(path.join(dir, "closed", "a.md")), process.getuid?.() === 0);
  } finally {
    fs.chmodSync(path.join(dir, "closed"), 0o755);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("--project names the folder; no folder, a path or a wrong argument, is status 2", () => {
  const { dir, config, repository } = machine();
  const named = tokensReport([`--project=${path.basename(dir)}`, "--top", "2"], { cwd: os.tmpdir(), env: { CLAUDE_CONFIG_DIR: config } });
  assert.equal(named.status, 0);
  assert.doesNotMatch(named.lines.join("\n"), new RegExp(SECRET));
  // The root comes from where the sessions began, so paths print from it.
  assert.match(named.lines.join("\n"), /docs\/a\.md \(Read\)/);
  const bySlug = tokensReport([`--project=${path.basename(dir)}`], { cwd: os.tmpdir(), env: { CLAUDE_CONFIG_DIR: config } });
  assert.equal(bySlug.status, 0);
  assert.equal(rootOfTranscripts(transcriptsOf(dir)), repository);
  assert.equal(rootOfTranscripts([{ file: path.join(dir, "none.jsonl"), subagent: false }, { file: "x", subagent: true }], () => null), null);
  fs.writeFileSync(path.join(config, "plain.jsonl"), JSON.stringify({ type: "queue-operation" }));
  assert.equal(rootOfTranscripts([{ file: path.join(config, "plain.jsonl"), subagent: false }]), null);
  const none = tokensReport(["--project", "nothing"], { cwd: os.tmpdir(), env: { CLAUDE_CONFIG_DIR: config } });
  assert.equal(none.status, 2);
  assert.match(none.lines[0], /no transcripts of this repository/);
  for (const value of [dir, "../projects", ".."]) {
    const refused = tokensReport(["--project", value], { cwd: os.tmpdir(), env: { CLAUDE_CONFIG_DIR: config } });
    assert.equal(refused.status, 2, value);
    assert.match(refused.lines[0], /--project takes the name of a folder/);
  }
  assert.equal(tokensReport(["--top"], {}).status, 2);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "tokens-outside-"));
  assert.equal(tokensReport([], { cwd: outside, env: { CLAUDE_CONFIG_DIR: config } }).status, 2);
});

test("an empty project prints a report with dashes", () => {
  const lines = format(run(project({})), { project: "p" });
  assert.match(lines[0], /^tokens: p — 0 sessions, 0 subagent transcripts, — … —$/);
  assert.ok(lines.some((l) => /^context per call, k\s+—\s+—\s+—$/.test(l)));
  assert.ok(lines.some((l) => /^context per call, first 80 of a session, k\s+—\s+—\s+—$/.test(l)));
});

test("a transcript that resumes a session goes on from the places of the calls it copied, read first or last", () => {
  const history = Array.from({ length: FIRST_CALLS - 1 }, (_, i) => call(`h${i}`, 1000));
  // "a" resumes "z" and sorts before it, "y" resumes "b" and sorts after it: each copies 79 calls and adds two.
  for (const [parent, child] of [["z", "a"], ["b", "y"]]) {
    const data = run(project({ [parent]: history, [child]: [...history, call("n1", 5000), call("n2", 5000)] }));
    assert.equal(data.main.calls, FIRST_CALLS + 1, child);
    assert.equal(data.firstCalls.calls, FIRST_CALLS, child);
    assert.equal(data.firstCalls.context, (FIRST_CALLS - 1) * 1000 + 5000, child);
  }
});

test("the context of a session's first main calls is measured apart, those before the window among them", () => {
  const minute = (i) => `2026-11-09T${String(10 + Math.floor(i / 60)).padStart(2, "0")}:${String(i % 60).padStart(2, "0")}:00Z`;
  // A long session: its first FIRST_CALLS calls at 1,000 tokens, then 20 at 11,000; and a short one at 2,000.
  const long = Array.from({ length: FIRST_CALLS + 20 }, (_, i) => call(`l${i}`, i < FIRST_CALLS ? 1000 : 11_000, { ts: minute(i) }));
  const short = [call("s0", 2000, { ts: minute(0) }), call("s1", 2000, { ts: minute(1) })];
  const agent = [call("a0", 50_000, { ts: minute(0) })];
  const data = run(project({ s1: long, s2: short }, { s1: { x: agent } }));
  assert.equal(FIRST_CALLS, 80);
  assert.equal(data.main.calls, 102);
  assert.equal(data.firstCalls.calls, 82);
  assert.equal(data.firstCalls.context, 80 * 1000 + 2 * 2000);
  const cells = row(data, { project: "p" }).split(" | ");
  assert.equal(cells[4], "3.0 / 50.0");
  assert.equal(cells[7], "1.0 |");
  assert.ok(format(data).some((l) => /^context per call, first 80 of a session, k\s+1\.0\s+—\s+1\.0$/.test(l)));
  // A window from the 70th call on: the long session's calls 71 to 80 are among its first, the
  // calls before the window are not counted but keep their places.
  const late = run(project({ s1: long }), { since: minute(70) });
  assert.equal(late.main.calls, 30);
  assert.equal(late.firstCalls.calls, 10);
  assert.equal(late.firstCalls.context, 10 * 1000);
});

test("a transcript that resumes the tail of a session after its compaction, and sorts before it, takes the places after its calls", () => {
  const minute = (i) => `2026-11-09T${String(10 + Math.floor(i / 60)).padStart(2, "0")}:${String(i % 60).padStart(2, "0")}:00Z`;
  const parent = Array.from({ length: 100 }, (_, i) => call(`h${i}`, 1000, { ts: minute(i) }));
  parent.splice(70, 0, { type: "system", subtype: "compact_boundary", timestamp: minute(70) });
  // "a" copies the 30 calls after the compaction and adds two; it sorts before "z", its parent.
  const child = [...parent.slice(71), call("n1", 5000, { ts: minute(101) }), call("n2", 5000, { ts: minute(102) })];
  const data = run(project({ a: child, z: parent }));
  assert.equal(data.main.calls, 102);
  assert.equal(data.resumed, 1);
  assert.equal(data.firstCalls.calls, FIRST_CALLS);
  assert.equal(data.firstCalls.context, FIRST_CALLS * 1000);
  assert.deepEqual(Object.fromEntries(data.bySession.map((x) => [x.id, x.main.calls])), { z: 100, a: 2 });
  // A transcript with no time is read last, and the order holds where the times are the same.
  const dir = project({ a: [prompt("x")], b: [call("b1", 1000)] });
  assert.equal(firstTimeOf(path.join(dir, "a.jsonl")), null);
  assert.equal(firstTimeOf(path.join(dir, "b.jsonl")), "2026-11-09T10:00:00Z");
  // A line longer than a chunk, the last line without its end, and an empty file.
  const lines = path.join(dir, "lines.txt");
  fs.writeFileSync(lines, `not json\n${JSON.stringify({ a: SECRET })}\n${JSON.stringify({ b: 1 })}`);
  assert.deepEqual(firstRecordOf(lines, (r) => r.a, 8), { a: SECRET });
  assert.deepEqual(firstRecordOf(lines, (r) => r.b, 8), { b: 1 });
  assert.equal(firstRecordOf(lines, (r) => r.c, 8), null);
  fs.writeFileSync(lines, "");
  assert.equal(firstRecordOf(lines, () => true), null);
  const read = [];
  run(dir, { read: (file) => (read.push(path.basename(file)), readTranscript(file)) });
  assert.deepEqual(read, ["b.jsonl", "a.jsonl"]);
});

test("the class of a path, and the paths a command names", () => {
  const classes = {
    "/workspaces/api/docs/decisions.md": "decisions",
    "spec/docs/plan/E1.md": "archive",
    "./RUN.md": "plan",
    "run/DEBT.md": "plan",
    "/workspaces/spec/COORDINATION.md": "plan",
    "docs/architecture.md": "architecture",
    "docs/privacy.md": "docs other",
    "CLAUDE.md": "rules",
    "spec/RULES.md": "rules",
    ".claude/rules/go.md": "rules",
    "README.md": "readme",
    "tools/x/README.md": "readme",
    "notes.md": "md other",
    "src/a.go": "code and data",
    "": "code and data",
  };
  for (const [file, c] of Object.entries(classes)) assert.equal(classOf(file), c, file);
  assert.deepEqual(pathsOf("sed -n 1,40p RUN.md"), ["RUN.md"]);
  assert.deepEqual(pathsOf("grep -n 'R19' docs/decisions.md:12 x.tsx a.md.bak a/.md docs/.md lines.shift() x.md_"), ["docs/decisions.md", "x.tsx", "a.md", "docs/.md"]);
  assert.deepEqual(pathsOf("ls tools/docs-check tools/ src"), ["tools/docs-check"]);
  assert.deepEqual(pathsOf("cat >docs/x.md <docs/y.md ${SECRET}"), ["docs/x.md", "docs/y.md"]);
  assert.deepEqual(pathsOf("cat /workspaces/app/../x/README.md"), ["/workspaces/app/../x/README.md"]);
  for (const command of ["sed -i s/a/b/ x", "echo 1 > out.json", "echo 1 >> a.md", "echo >a.b.md", "tee x", "cat > f", "node -e 'fs.writeFileSync(1)'"]) assert.equal(writes(command), true, command);
  for (const command of ["ls 2>&1", "x > /dev/null", "echo > .md", "echo > a.txt", "echo > a.mdx", "x.map((r) => r.json)", "ls"]) assert.equal(writes(command), false, command);
});

test("what a call of a tool did, and its group", () => {
  const kinds = [
    [{ name: "Read", input: {} }, "other"],
    [{ name: "Grep", input: { path: "/workspaces/api" } }, "other"],
    [{ name: "Glob", input: { path: "docs" } }, "read docs other"],
    [{ name: "Grep", input: { path: "/workspaces/api/run/" } }, "read plan"],
    [{ name: "Read", input: { file_path: "/workspaces/api/spec/docs/decisions.md" } }, "read decisions"],
    [{ name: "Read", input: { file_path: "/workspaces/api/src/x.go" } }, "read code and data"],
    [{ name: "Read", input: { file_path: "/tmp/x.md" } }, "other"],
    [{ name: "Read", input: { file_path: "/home/vscode/.claude/projects/p/s/tool-results/b.txt" } }, "other"],
    [{ name: "Grep", input: { path: "/workspaces/app/docs/plan" } }, "read archive"],
    [{ name: "Glob", input: { path: "/workspaces/app/spec/.claude/rules/" } }, "read rules"],
    [{ name: "Grep", input: { path: "/workspaces/app/format" } }, "read code and data"],
    [{ name: "Write", input: { file_path: "/workspaces/api/run/TASKS.md" } }, "write plan"],
    [{ name: "NotebookEdit", input: { notebook_path: "/workspaces/api/a.ipynb" } }, "write code and data"],
    [{ name: "StructuredOutput", input: {} }, "status"],
    [{ name: "Agent", input: { prompt: SECRET } }, "other"],
    [{ name: "Bash", input: { command: "cd x && git log docs/decisions.md" } }, "git and gh"],
    [{ name: "Bash", input: { command: "cd a && cd b &&  gh pr view" } }, "git and gh"],
    [{ name: "Bash", input: { command: "just docs-check" } }, "checks and builds"],
    [{ name: "Bash", input: { command: "just x > a.md" } }, "write md other"],
    [{ name: "Bash", input: { command: "sed -i s/x/y/ src/a.go docs/decisions.md" } }, "write code and data"],
    [{ name: "Bash", input: { command: "sed -i s/x/y/ docs/decisions.md" } }, "write decisions"],
    [{ name: "Bash", input: { command: "cat RUN.md docs/architecture.md" } }, "read several docs"],
    [{ name: "Bash", input: { command: "cat > /tmp/x.md <<EOF" } }, "write md other"],
    [{ name: "Bash", input: { command: "cat >docs/decisions.md <<EOF" } }, "write decisions"],
    [{ name: "Bash", input: { command: "node -e \"const l = lines.shift(); fs.writeFileSync('docs/decisions.md', l)\"" } }, "write decisions"],
    [{ name: "Bash", input: { command: "cat > /tmp/a.sh" } }, "write code and data"],
    [{ name: "Bash", input: { command: "cat /tmp/a.mjs ~/.claude/projects/p/a.jsonl" } }, "other"],
    [{ name: "Bash", input: { command: "cd x; git log" } }, "other"],
    [{ name: "Bash", input: { command: "cd && git log" } }, "other"],
    [{ name: "Bash", input: { command: "ls tools/tokens" } }, "read code and data"],
    [{ name: "Bash", input: {} }, "other"],
  ];
  for (const [block, kind] of kinds) assert.equal(kindOf(block), kind, JSON.stringify(block.input));
  const groups = { start: "start", status: "status", "read decisions": "read docs", "write several docs": "write docs", "write code and data": "write code and data", "git and gh": "other", "after a compaction": "other" };
  for (const [kind, group] of Object.entries(groups)) assert.equal(groupOf(kind), group, kind);
});

// A session of an executor: its first prompt came by claude -p.
const executorPrompt = (text, ts) => ({ ...prompt(text), entrypoint: "sdk-cli", timestamp: ts });
const at = (s) => `2026-11-09T10:00:${String(s).padStart(2, "0")}Z`;

test("the executors' main calls by what they did: the context carried, the output and the model's time", () => {
  const records = [
    executorPrompt(`T07 ${SECRET}`, at(0)),
    // The call is repeated in a record for each of its tools.
    call("c1", 1000, { ts: at(5), tools: [["t1", "Read", { file_path: "/workspaces/api/docs/decisions.md" }]] }),
    call("c1", 1000, { ts: at(10), tools: [["t2", "Bash", { command: "cd /workspaces/api && sed -n 1,9p RUN.md docs/architecture.md" }]] }),
    result("t1", "x".repeat(60)),
    result("t2", "y".repeat(40)),
    call("c2", 1110, { ts: at(30), tools: [["t3", "Edit", { file_path: "/workspaces/api/src/a.go" }], ["t4", "Bash", { command: "git status" }]] }),
    result("t3", "z".repeat(50)),
    result("t4", "w".repeat(50)),
    { type: "cost-state", totalCostUSD: 1, totalDuration: 90_000 },
    call("c3", 1320, { ts: at(40), tools: [["t5", "StructuredOutput", { status: SECRET }]] }),
    call("c4", 1330, { ts: at(59) }),
    { type: "cost-state", totalCostUSD: 2, totalDuration: 120_000 },
  ];
  const other = [prompt("x"), call("o1", 1000, { tools: [["u1", "Read", { file_path: "/r/docs/decisions.md" }]] }), result("u1", "x"), call("o2", 2000)];
  const agent = [call("a1", 1_000_000, { ts: at(20) })];
  const dir = project({ e: records, i: other }, { e: { x: agent } });
  const c = run(dir, { until: at(50) }).classes;
  assert.equal(c.sessions, 1);
  assert.equal(c.calls, 3);
  assert.equal(c.context, 1000 + 1110 + 1320);
  assert.equal(c.output, 30);
  // The time of a call runs from the record before its first to its last: 10, 20 and 10 seconds.
  assert.equal(c.ms, 40_000);
  assert.equal(c.wallMs, 90_000);
  assert.equal(c.cost, (3430 * 0.2 + 30 * 20) / 1e6);
  assert.equal(c.inputCost, (3430 * 0.2) / 1e6);
  assert.equal(c.subagentCost, (1_000_000 * 0.2 + 10 * 20) / 1e6);
  const kind = (name) => c.kinds.find((k) => k.name === name);
  assert.deepEqual(kind("start"), { name: "start", group: "start", carried: 3000, output: 0, ms: 0 });
  assert.deepEqual(kind("read decisions"), { name: "read decisions", group: "read docs", carried: 120, output: 5, ms: 5000 });
  assert.deepEqual(kind("read several docs"), { name: "read several docs", group: "read docs", carried: 80, output: 5, ms: 5000 });
  assert.deepEqual(kind("write code and data"), { name: "write code and data", group: "write code and data", carried: 100, output: 5, ms: 10_000 });
  assert.deepEqual(kind("git and gh"), { name: "git and gh", group: "other", carried: 100, output: 5, ms: 10_000 });
  assert.deepEqual(kind("status"), { name: "status", group: "status", carried: 0, output: 10, ms: 10_000 });
  assert.deepEqual(
    c.groups.map((g) => [g.name, g.carried]),
    [["start", 3000], ["read docs", 200], ["other", 100], ["write code and data", 100], ["status", 0]],
  );
  const lines = formatClasses(c, { project: "p" });
  assert.match(lines[0], /^classes: p — 1 executors' sessions, 3 main calls, 0M tokens of context, 0\.00M output$/);
  assert.match(lines[1], /^a session: wall 1\.5 min, model 0\.7 min; \$0\.00 at API prices, \$0\.00 of it input; subagents \$0\.20 more$/);
  assert.ok(lines.includes("| read docs | 5.8% | 33.3% | 25.0% | 0.2 |"));
  assert.ok(lines.includes("| — read decisions | 3.5% | 16.7% | 12.5% | 0.1 |"));
  assert.ok(lines.includes("| other | 2.9% | 16.7% | 25.0% | 0.2 |"));
  assert.ok(lines.includes("| — git and gh | 2.9% | 16.7% | 25.0% | 0.2 |"));
  assert.ok(lines.includes("| status | 0.0% | 33.3% | 25.0% | 0.2 |"));
  assert.ok(!lines.some((l) => l.startsWith("| — status") || l.startsWith("| — start")));
  assert.doesNotMatch(lines.join("\n"), new RegExp(SECRET));
  // Without --until, the last state of the session gives its wall time.
  assert.equal(run(dir).classes.wallMs, 120_000);
  // A session that began before --since has no wall time in the window: its state counts from its start.
  const late = run(dir, { since: at(20) }).classes;
  assert.equal(late.sessions, 1);
  assert.equal(late.wallSessions, 0);
  assert.match(formatClasses(late)[1], /^a session: wall — min of the 0 that began in the window, model /);
});

test("what a compaction left and what a resumed session copied are carried whole, a call without tools is other", () => {
  const dir = project({
    a: [
      executorPrompt("x", at(0)),
      call("m1", 1000, { ts: at(1) }),
      prompt("y".repeat(10)),
      call("m2", 1100, { ts: at(2) }),
      { type: "system", subtype: "compact_boundary", timestamp: at(3) },
      call("m3", 400, { ts: at(4) }),
    ],
    b: [executorPrompt("z", at(5)), call("m3", 400, { ts: at(4) }), call("n1", 600, { ts: at(6) })],
  });
  const c = run(dir).classes;
  const carried = Object.fromEntries(c.kinds.map((k) => [k.name, k.carried]));
  assert.deepEqual(carried, { start: 2000, other: 90, "after a compaction": 400, "history of a resumed session": 400 });
  assert.equal(c.sessions, 2);
  assert.equal(c.calls, 4);
  const empty = classesOf({ calls: [], entries: [], sessions: [] });
  assert.deepEqual(formatClasses(empty).slice(3), ["| What a call did | Context it carried | Output | Model time | Model minutes a session |", "|---|---|---|---|---|"]);
});

test("--classes and --json read the projects --project names, each from its own root", () => {
  const { dir, config, repository } = machine();
  const second = path.join(config, "projects", "-workspaces-other");
  fs.mkdirSync(second);
  const records = [
    { ...executorPrompt(SECRET, at(0)), cwd: "/workspaces/other" },
    call("e1", 1000, { ts: at(1), tools: [["t1", "Bash", { command: "cat docs/decisions.md" }]] }),
    result("t1", SECRET),
    call("e2", 1100, { ts: at(2) }),
  ];
  fs.writeFileSync(path.join(second, "e.jsonl"), records.map((r) => JSON.stringify(r)).join("\n"));
  const names = [`--project=${path.basename(dir)}`, "--project=-workspaces-other", "--project=-workspaces-other"];
  const env = { CLAUDE_CONFIG_DIR: config };
  const table = tokensReport(["--classes", ...names], { cwd: os.tmpdir(), env });
  assert.equal(table.status, 0);
  assert.match(table.lines[0], new RegExp(`^classes: ${path.basename(dir)}, -workspaces-other — 1 executors' sessions, 2 main calls`));
  assert.ok(table.lines.includes("| — read decisions | 4.3% | 50.0% | 50.0% | 0.0 |"));
  assert.doesNotMatch(table.lines.join("\n"), new RegExp(SECRET));
  const json = JSON.parse(tokensReport(["--json", ...names], { cwd: os.tmpdir(), env }).lines[0]);
  assert.equal(json.project, null);
  assert.deepEqual(json.projects, [dir, second]);
  assert.equal(json.main.calls, 4);
  assert.equal(json.classes.calls, 2);
  // Paths print from the root of each project.
  assert.ok(json.groups.some((g) => g.name === "file docs/a.md (Read)"), repository);
  const one = JSON.parse(tokensReport(["--json", `--project=${path.basename(dir)}`], { cwd: os.tmpdir(), env }).lines[0]);
  assert.equal(one.project, dir);
  assert.deepEqual(one.projects, [dir]);
  // Instructions too print from the root of the project.
  assert.ok(one.start.parts.some((p) => p.name === "instructions CLAUDE.md"));
});
