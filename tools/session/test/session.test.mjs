// Each test reads made-up transcripts, as Claude Code writes them: none is a real session's.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { ledBy, promptOf, RUN_TASKS, runTasksOf, taskOf, verdict } from "../session.mjs";
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
    ["Сначала не T1, а выполни задачу T5", "T5"],
    ["не планируй T6, планируй T7", "T7"],
    // The author's own words.
    ["делай T141", "T141"],
    ["контейнер перестроил. Делай T10", "T10"],
    ["Делай задачу T05 и учти, что рядом идёт другая сессия", "T5"],
    ["делай задачи T13 и T14 последовательно", "T13"],
    ["сделай T46", "T46"],
    ["делаем задачу T26", "T26"],
    ["выполняй T04", "T4"],
    ["Последовательно выполняй задачи T23, T24", "T23"],
    ["Реализуй задачу T32", "T32"],
    ["Создай бранч и реализуй T06", "T6"],
    ["спланируй задачу T23", "T23"],
    ["начинай T47", "T47"],
    ["Также начинай реализацию T13 в этом бранче", "T13"],
    ["приступай к реализации T40", "T40"],
    ["приступай к реализации задачи T41", "T41"],
    ["делай T25 так же, как в T24", "T25"],
    ["пока не делаем T42, а делай T43", "T43"],
    ["продолжай T42", "T42"],
    ["делай T6. Потом T7", "T6"],
  ]) {
    assert.equal(taskOf(prompt), task, prompt);
  }
  // The triage names no task.
  assert.equal(taskOf("Разбери входящие"), null);
});

test("a run of the orchestrator starts by «Сделай эпик E…», and counts as one task", () => {
  for (const [prompt, epic] of [
    ["Сделай эпик E14", "E14"],
    ["сделай эпик E015 по COORDINATION.md", "E15"],
    ["контейнеры созданы. Делай эпик E15", "E15"],
    ["выполни эпик E16", "E16"],
    ["продолжай эпик E14", "E14"],
    ["не делай T5, сделай эпик E15", "E15"],
    ["сделай эпик E15, а потом выполни задачу T3", "E15"],
    ["выполни задачу T3, а потом сделай эпик E15", "T3"],
  ]) {
    assert.equal(taskOf(prompt), epic, prompt);
  }
  for (const prompt of [
    "планируй эпик E15", // splitting an epic into tasks is no run
    "спланируй эпик E15",
    "Сделай эпик E", // no number
    "сделай эпик E1234",
    "сделай эпик Е15", // a Cyrillic Е is no epic's ID
    "сделай эпик E15?",
    "сделай эпик E15.1",
    "сделай эпик, как E14",
    "не делай эпик E15",
    "доделай эпик E15",
    "в RUN.md стоит «Сделай эпик E15» — поправь",
    "фраза `Сделай эпик E15` — вот так",
  ]) {
    assert.equal(taskOf(prompt), null, prompt);
  }
  const epic = [typed("Сделай эпик E14"), answer("волна 0 идёт")];
  assert.equal(verdict("продолжай эпик E14", epic), null);
  assert.equal(verdict("ответ: вариант (а)", epic), null);
  assert.match(verdict("Сделай эпик E15", epic), /^This prompt starts E15, and this session has led E14: one task is one session/);
  assert.match(verdict("Выполни задачу T170", epic), /starts T170, and this session has led E14/);
  assert.match(verdict("Сделай эпик E14", [typed("Выполни задачу T170")]), /starts E14, and this session has led T170/);
});

test("a phrase quoted, denied or only near a task ID starts nothing", () => {
  for (const prompt of [
    "что дальше по COORDINATION.md?",
    "задачу T129 сделали?",
    "api: «Выполни задачу T30 из RUN.md» сделано, что дальше?",
    "не планируй T131 пока",
    "ладно, не планируй T131",
    "хорошо, НЕ выполни задачу T131",
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
    // Words that only name a task, or go on with the same one.
    "делай как в T24",
    "сделай так же, как T36",
    "сделай в ней T33 отдельным комитом", // a word between the verb and the number
    "доделай T5",
    "переделай T5",
    "сделали T5?",
    "почему не стал делать T66?",
    "можем делать T83?",
    "пока не делаем T42",
    "не делай T5",
    "приступай к выполнению T17",
    // Forms the author does not write, and a question.
    "сделаем T8",
    "реализуем T8",
    "начинаем задачу T27",
    "спланируем T7",
    "делайте T9",
    "делаем T42?",
    "Выполни задачу T5 ?",
    // A number that goes on is not a task's.
    "делай T6.1",
    "выполни задачу T6-2",
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
  // A session begun by «делай T…» has led its task: «продолжай» goes on with it and stops another.
  const begun = [typed("делай T53"), answer("сделано")];
  assert.match(verdict("Выполни задачу T54", begun), /starts T54, and this session has led T53/);
  assert.equal(verdict("продолжай T53", begun), null);
  assert.match(verdict("продолжай T54", begun), /starts T54, and this session has led T53/);
  assert.equal(verdict("сделай T53", begun), null);
  // A session that led two tasks before the hook goes on with neither.
  assert.match(verdict("Выполни задачу T3", [typed("Выполни задачу T3"), typed("Выполни задачу T4")]), /led T3, T4/);
});

test("a run of the orchestrator goes on under each number it goes by, and stops any other task", () => {
  // The prompt named `T27`, and the executor wrote the task into its plan as `T28`, the next number free.
  const led = [typed("Выполни задачу T27 из RUN.md. Её ещё нет в этом репозитории"), answer("T28")];
  assert.match(verdict("Сделай T28 сейчас, на ветке t28-ci-speed", led), /starts T28, and this session has led T27/);
  assert.equal(verdict("Сделай T28 сейчас, на ветке t28-ci-speed", led, ["T27", "T28"]), null);
  assert.equal(verdict("Выполни задачу T27", led, ["T27", "T28"]), null);
  assert.match(verdict("Выполни задачу T29", led, ["T27", "T28"]), /starts T29, and this session has led T27/);
  // A number the run does not go by is no alias of the one it led.
  assert.match(verdict("Сделай T28", led, ["T28"]), /starts T28/);
  assert.deepEqual(runTasksOf({ [RUN_TASKS]: "T27 T028\tT12345 Т5 x" }), ["T27", "T28"]);
  assert.deepEqual(runTasksOf({}), []);
  assert.deepEqual(runTasksOf(), []);
  assert.equal(RUN_TASKS, "NOVATRAIL_RUN_TASKS");
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
  // The numbers of the orchestrator's run come from the environment.
  assert.equal(hook(input("Выполни задачу T2 из RUN.md"), read, { NOVATRAIL_RUN_TASKS: "T1 T2" }), "");
  assert.equal(JSON.parse(hook(input("Выполни задачу T2 из RUN.md"), read, { NOVATRAIL_RUN_TASKS: "T2 T3" })).decision, "block");
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
