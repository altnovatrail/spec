// One task, one session (R143): which task a prompt of the author starts, which tasks a session's
// transcript has led, and whether a new prompt may go on in that session.
//
// A task starts by a phrase of RUN.md that names it: «Выполни задачу T…» or «планируй T…», in the
// forms the author writes them — «Планируем задачу T…», «планируй реализацию T…». A session may
// plan and carry out one task; a prompt that starts another is stopped, and the author runs /clear.
// «Разбери входящие» names no task, and R143 counts the triage into the session of the task it
// serves, before or after its planning, so it always goes on: the next task's own phrase is what
// the hook stops.

// The phrases, found anywhere in a prompt — the author writes «хорошо. далее планируем T…» too —
// unless the word «не» comes right before one. Spaces are [ \t\r\n], and «не» is checked on the
// text before a phrase rather than by a lookbehind, so that no pattern backtracks.
const TASK = /(?:выполни(?:те|м)?|выполняем|планиру(?:й|йте|ем))[ \t\r\n]+(?:(?:задачу|задачи|реализацию)[ \t\r\n]+)?T(\d{1,4})\b/giu;

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

// The task a prompt starts, such as "T129", or null. T07 and T7 are one task.
export function taskOf(prompt) {
  const text = said(String(prompt ?? ""));
  for (const task of text.matchAll(TASK)) {
    if (!denied(text.slice(0, task.index))) return `T${Number(task[1])}`;
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
