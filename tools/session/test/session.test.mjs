// Each test reads made-up transcripts, as Claude Code writes them: none is a real session's.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { ledBy, promptOf, taskOf, verdict } from "../session.mjs";
import { hook, promptRecords } from "../main.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN = path.join(HERE, "..", "main.mjs");

// A prompt the author sent, as a string or as blocks of text, the way the editor sends it.
const typed = (text, extra = {}) => ({ type: "user", message: { role: "user", content: text }, ...extra });
const blocks = (...texts) => ({ type: "user", message: { role: "user", content: texts.map((text) => ({ type: "text", text })) } });
const result = (text) => ({ type: "user", message: { role: "user", content: [{ type: "tool_result", tool_use_id: "t1", content: text }] } });
const answer = (text) => ({ type: "assistant", message: { id: "m1", content: [{ type: "text", text }] } });

test("a task starts by each phrase of RUN.md, wherever the prompt says it", () => {
  for (const [prompt, task] of [
    ["Выполни задачу T129 из RUN.md", "T129"],
    ["выполни задачу T07 и доведи изменения до мержа", "T7"],
    ["Выполните задачу T5", "T5"],
    ["выполни T131", "T131"],
    ["Выполни задачи T0131", "T131"],
    ["выполняем задачу T4", "T4"],
    ["выполним T6", "T6"],
    ["спланируй T3", "T3"],
    ["планируй T121", "T121"],
    ["Планируй задачу T38", "T38"],
    ["планируем задачу T95", "T95"],
    ["Планируем T88", "T88"],
    ["планируйте T12", "T12"],
    ["планируй реализацию T130", "T130"],
    ["закомиченные изменения. далее планируем T131", "T131"],
    ["T128 я провёл. Планируем T129", "T129"],
    ["Разбери входящие и выполни задачу T3", "T3"],
  ]) {
    assert.equal(taskOf(prompt), task, prompt);
  }
  // The triage names no task.
  assert.equal(taskOf("Разбери входящие"), null);
});

test("a phrase quoted, denied or only near a task ID starts nothing", () => {
  for (const prompt of [
    "что дальше по COORDINATION.md?",
    "задачу T129 сделали?",
    "api: «Выполни задачу T30 из RUN.md» сделано, что дальше?",
    "не планируй T131 пока",
    "Не выполняй, а планируй после T131",
    "планируем после T131",
    "в RUN.md стоит `Выполни задачу T01 из RUN.md` — поправь",
    "пример:\n```\nВыполни задачу T01 из RUN.md\n```\nвот так",
    "пример без конца:\n```\nпланируй T02",
    '<ide_selection>The user selected:\nВыполни задачу T01 из RUN.md</ide_selection> что это?',
    '<pasted_content id="a1">\nРазбери входящие\n</pasted_content id="a1">\nкто это писал?',
    "<system-reminder>планируй T9</system-reminder>",
    "<task-notification>\n<task-id>a1</task-id>\n<result>Выполни задачу T01 из RUN.md</result>\n</task-notification>",
    "<command-name>/clear</command-name><command-args>Выполни задачу T4</command-args>",
    "Выполни задачу Т129", // a Cyrillic Т is no task ID
    "Выполни задачу T12345",
    "",
  ]) {
    assert.equal(taskOf(prompt), null, prompt);
  }
  assert.equal(taskOf(undefined), null);
});

test("only what the author sent is a prompt", () => {
  assert.equal(promptOf(typed("Выполни задачу T1")), "Выполни задачу T1");
  assert.equal(promptOf(typed("Выполни задачу T1", { origin: { kind: "human" } })), "Выполни задачу T1");
  assert.equal(promptOf(blocks("<ide_opened_file>x</ide_opened_file>", "планируй T2")), "<ide_opened_file>x</ide_opened_file>\nпланируй T2");
  assert.equal(promptOf({ type: "user", message: { content: [{ type: "text" }, { type: "image" }] } }), "");
  for (const record of [
    result("Выполни задачу T1"),
    typed("Выполни задачу T1", { isMeta: true }),
    typed("Выполни задачу T1", { isCompactSummary: true }),
    typed("Выполни задачу T1", { isSidechain: true }),
    typed("<task-notification><summary>Выполни задачу T1</summary></task-notification>", { origin: { kind: "task-notification" } }),
    answer("Выполни задачу T1"),
    { type: "system", subtype: "informational", content: "Выполни задачу T1" },
    { type: "user" },
    { type: "user", message: { content: 7 } },
    null,
  ]) {
    assert.equal(promptOf(record), null, JSON.stringify(record));
  }
});

test("a session has led the tasks its prompts named, each once, in order", () => {
  const records = [
    typed("Разбери входящие"),
    answer("Выполни задачу T9"),
    typed("планируй T03"),
    result("планируй T8"),
    typed("Выполни задачу T3 из RUN.md"),
    blocks("далее планируем T4"),
    typed("Выполни задачу T3"),
  ];
  assert.deepEqual(ledBy(records), ["T3", "T4"]);
  assert.deepEqual(ledBy([]), []);
});

test("a session goes on with its own task and stops another", () => {
  const planned = [typed("планируй T3"), answer("план"), typed("да, делай")];
  // Words that start no task always go on.
  assert.equal(verdict("поправь абзац", planned), null);
  // The first task of a session, and its triage, before or after its planning.
  assert.equal(verdict("Выполни задачу T3", []), null);
  assert.equal(verdict("Выполни задачу T3", [typed("Разбери входящие"), answer("разобрал")]), null);
  assert.equal(verdict("Разбери входящие", planned), null);
  // The same task, planned and then carried out, by either form of its ID; the prompt may be in
  // the transcript already.
  assert.equal(verdict("Выполни задачу T3 из RUN.md", planned), null);
  assert.equal(verdict("Выполни задачу T03", planned), null);
  assert.equal(verdict("Выполни задачу T3", [...planned, typed("Выполни задачу T3")]), null);

  const other = verdict("Выполни задачу T4 из RUN.md", planned);
  assert.match(other, /^This prompt starts T4, and this session has led T3: one task is one session \(RULES\.md, How we work\)\. Run \/clear/);
  assert.equal(verdict("Выполни задачу T4", [...planned, typed("Выполни задачу T4")]), other.replace("led T3", "led T3, T4"));
  // A session that led two tasks before the hook goes on with neither.
  assert.match(verdict("Выполни задачу T3", [typed("Выполни задачу T3"), typed("Выполни задачу T4")]), /led T3, T4/);
});

test("the records read are those of the author's type, whole, but results of tools", () => {
  const lines = [
    JSON.stringify(typed("Выполни задачу T1")),
    JSON.stringify(answer("Выполни задачу T2")),
    JSON.stringify(result("Выполни задачу T4")),
    JSON.stringify(typed('a prompt that quotes {"type":"tool_result"}')),
    '{"type":"user","message":{"content":"half a',
    "",
    JSON.stringify({ type: "attachment", attachment: { type: "skill_listing" } }),
    JSON.stringify(blocks("планируй T3")),
  ];
  assert.deepEqual(promptRecords(lines.join("\n")), [typed("Выполни задачу T1"), typed('a prompt that quotes {"type":"tool_result"}'), blocks("планируй T3")]);
});

test("the hook stops a prompt by the decision of Claude Code, and lets every other through", () => {
  const transcript = [typed("Выполни задачу T1"), answer("сделано")].map((r) => JSON.stringify(r)).join("\n");
  const read = (file) => {
    assert.equal(file, "/t/s.jsonl");
    return transcript;
  };
  const input = (prompt, extra = {}) => JSON.stringify({ session_id: "s", transcript_path: "/t/s.jsonl", hook_event_name: "UserPromptSubmit", prompt, ...extra });

  const out = JSON.parse(hook(input("Выполни задачу T2 из RUN.md"), read));
  assert.deepEqual(Object.keys(out), ["decision", "reason", "hookSpecificOutput"]);
  assert.equal(out.decision, "block");
  assert.match(out.reason, /starts T2, and this session has led T1/);
  assert.deepEqual(out.hookSpecificOutput, { hookEventName: "UserPromptSubmit" });

  assert.equal(hook(input("Выполни задачу T1"), read), "");
  // A prompt that starts no task goes through unread.
  const unread = () => assert.fail("the transcript is read");
  assert.equal(hook(input("спасибо"), unread), "");
  assert.equal(hook(input("Разбери входящие"), unread), "");
  // It fails open: no transcript yet, an input it cannot read, no prompt.
  assert.equal(hook(input("Выполни задачу T2", { transcript_path: "" }), read), "");
  assert.equal(hook(input("Выполни задачу T2", { transcript_path: 5 }), read), "");
  assert.equal(
    hook(input("Выполни задачу T2"), () => {
      throw new Error("ENOENT");
    }),
    "",
  );
  assert.equal(hook("not JSON", read), "");
  assert.equal(hook("null", read), "");
  assert.equal(hook(JSON.stringify({ transcript_path: "/t/s.jsonl" }), read), "");
});

test("as Claude Code runs it, the hook reads its input on stdin and always exits 0", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "session-"));
  try {
    const file = path.join(dir, "s.jsonl");
    fs.writeFileSync(file, `${JSON.stringify(typed("планируй T7"))}\n`);
    const run = (input) => spawnSync(process.execPath, [MAIN], { input, encoding: "utf8" });

    const stopped = run(JSON.stringify({ transcript_path: file, prompt: "Выполни задачу T8" }));
    assert.equal(stopped.status, 0);
    assert.equal(stopped.stderr, "");
    assert.equal(JSON.parse(stopped.stdout).decision, "block");
    assert.ok(stopped.stdout.endsWith("}\n"));

    for (const input of [JSON.stringify({ transcript_path: file, prompt: "Выполни задачу T7" }), JSON.stringify({ transcript_path: path.join(dir, "none.jsonl"), prompt: "Выполни задачу T8" }), ""]) {
      const passed = run(input);
      assert.equal(passed.status, 0, input);
      assert.equal(passed.stdout, "", input);
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// Another repository runs the hook from its spec/ submodule, where tools/ has no node_modules: the
// hook and every module it imports take only Node's own modules and each other.
test("the hook takes nothing from node_modules", () => {
  const seen = new Set();
  const visit = (file) => {
    if (seen.has(file)) return;
    seen.add(file);
    for (const [, specifier] of fs.readFileSync(file, "utf8").matchAll(/^import\s[^"']*["']([^"']+)["']/gm)) {
      if (specifier.startsWith("node:")) continue;
      assert.ok(specifier.startsWith("."), `${path.relative(HERE, file)} imports ${specifier}`);
      visit(path.resolve(path.dirname(file), specifier));
    }
  };
  visit(MAIN);
  assert.deepEqual([...seen].map((file) => path.relative(path.join(HERE, "..", ".."), file)).sort(), ["session/main.mjs", "session/session.mjs", "shared.mjs"]);
});
