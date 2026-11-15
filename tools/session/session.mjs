// One task, one session (R143): which task a prompt of the author starts, which tasks a session's
// transcript has led, and whether a new prompt may go on in that session. An epic the orchestrator
// runs counts as one task (R156).
//
// A task starts by a phrase that names it: RUN.md's «Выполни задачу T…» or «планируй T…», in the
// forms the author writes them — «Планируем задачу T…», «планируй реализацию T…», «делай T…»,
// «сделай T…», «делаем T…», «выполняй T…», «реализуй T…», «спланируй T…», «начинай T…», «приступай
// к реализации T…» and «продолжай T…» (measurements 1.7). «продолжай» names the task the session
// goes on with: the same task passes, and another is stopped. A session may plan and carry out one
// task; a prompt that starts another is stopped, and the author runs /clear.
// «Сделай эпик E…» starts a run of the orchestrator, in the forms «делай эпик E…», «выполни эпик
// E…», «продолжай эпик E…» and the other verbs of a task but planning: the orchestrator's session is
// one epic (fifth amendment 2026-11-15 to R143), so it goes on with the same epic and stops another
// epic or a task. «планируй эпик E…» splits an epic into tasks and starts nothing.
// «Разбери входящие» names no task, and R143 counts the triage into the session of the task it
// serves, before or after its planning, so it always goes on: the next task's own phrase is what
// the hook stops.

// The phrases, found anywhere in a prompt — the author writes «хорошо. далее планируем T…» too —
// unless the word «не» comes right before one. The verb is a whole word, so «доделай T…» and
// «переделай T…» start nothing, and the task's number comes right after it or after «задачу»,
// «задачи» or «реализацию»: «делай как в T24» only names a task. A number that goes on with «.» or
// «-» and a digit, «T6.1», is not a task's, and a question mark right after the number makes the
// phrase a question, «делаем T42?», which starts nothing. An epic's number comes right after «эпик»,
// under the same rules. Spaces are [ \t\r\n], and «не» is checked on the text before a phrase
// rather than by a lookbehind of many letters, so that no pattern backtracks.
// The verbs that start a task or an epic, and those of a task alone: planning, and «приступай к
// реализации», which the author says of a task.
const DOING = String.raw`выполни(?:те|м)?|выполня(?:ем|й)|с?делай|делаем|реализуй|начинай|продолжай`;
const TASK_ONLY = String.raw`планиру(?:й|йте|ем)|спланируй|приступай[ \t\r\n]+к[ \t\r\n]+реализации`;
const END = String.raw`(?![\p{L}\p{N}_]|[.-]\d|[ \t]*\?)`;
const TASK = new RegExp(String.raw`(?<!\p{L})(?:${DOING}|${TASK_ONLY})[ \t\r\n]+(?:(?:задачу|задачи|реализацию)[ \t\r\n]+)?T(\d{1,4})${END}`, "giu");
const EPIC = new RegExp(String.raw`(?<!\p{L})(?:${DOING})[ \t\r\n]+эпик[ \t\r\n]+E(\d{1,3})${END}`, "giu");

// Whether the text before a phrase ends in the word «не» and a space.
function denied(before) {
  const words = before.trimEnd();
  if (words.length === before.length || !/не$/iu.test(words)) return false;
  return !/\p{L}$/u.test(words.slice(0, -2));
}

// What a prompt holds that the author did not type as their own words: the editor's selection,
// pasted text, reminders, the output of local commands and the report of a background task, each
// between its tags — Claude Code runs the hook on a task's report too —, and code, a block or a
// span, and guillemets, where a phrase is quoted rather than said: RUN.md and COORDINATION.md quote
// «Выполни задачу T01 из RUN.md» so.
const QUOTED = [
  /<(ide_selection|ide_opened_file|pasted_content|system-reminder|command-[a-z-]+|local-command-[a-z-]+|bash-[a-z-]+|task-notification)\b[^>]*>[\s\S]*?<\/\1\b[^>]*>/g,
  /```[\s\S]*?(?:```|$)/g,
  /`[^`\n]*`/g,
  /«[^«»\n]*»/g,
];

function said(text) {
  return QUOTED.reduce((rest, pattern) => rest.replace(pattern, " "), text);
}

// The task a prompt starts, such as "T129", or the epic, such as "E14", or null: the first phrase
// the prompt says. T07 and T7 are one task.
export function taskOf(prompt) {
  const text = said(String(prompt ?? ""));
  const found = (pattern, letter) => [...text.matchAll(pattern)].map((phrase) => ({ at: phrase.index, id: `${letter}${Number(phrase[1])}` }));
  const phrases = [...found(TASK, "T"), ...found(EPIC, "E")].sort((one, other) => one.at - other.at);
  for (const { at, id } of phrases) {
    if (!denied(text.slice(0, at))) return id;
  }
  return null;
}

// The text of a record of a transcript when it is a prompt the author sent, or null: a result of a
// tool, a reminder, the summary a compaction leaves, the start of a subagent, the report of a
// background task — whose origin is not "human" — are not.
export function promptOf(record) {
  if (record?.type !== "user" || record.isMeta || record.isCompactSummary || record.isSidechain || !record.message) return null;
  if (record.origin && record.origin.kind !== "human") return null;
  const content = record.message.content;
  if (typeof content === "string") return content;
  if (!Array.isArray(content) || content.some((b) => b?.type === "tool_result")) return null;
  return content
    .filter((b) => b?.type === "text")
    .map((b) => String(b.text ?? ""))
    .join("\n");
}

// The tasks a transcript's records have named, in the order first named.
export function ledBy(records) {
  const tasks = [];
  for (const record of records) {
    const task = taskOf(promptOf(record));
    if (task && !tasks.includes(task)) tasks.push(task);
  }
  return tasks;
}

// Whether a prompt goes on in the session whose transcript holds these records: null when it does,
// or the reason it is stopped, for the author. The transcript may not hold the prompt yet, or may
// hold it already: Claude Code writes it as it goes.
export function verdict(prompt, records) {
  const task = taskOf(prompt);
  if (!task) return null;
  const tasks = ledBy(records);
  if (tasks.every((led) => led === task)) return null;
  return `This prompt starts ${task}, and this session has led ${tasks.join(", ")}: one task is one session (RULES.md, How we work). Run /clear, or open a new session, and send the prompt there.`;
}
