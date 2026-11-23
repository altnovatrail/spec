// What a run of `claude -p --output-format stream-json --verbose` printed, and what it came to.
// The stream is JSON Lines: an event `system` of subtype `init` with the session's id and model,
// an event `rate_limit_event` with the state of the subscription's limit, the messages of the
// model and the tools, and last an event `result` with the run's cost and, under --json-schema,
// its `structured_output`. A run cut short leaves half a line at the end, or no `result` at all. A
// stream may hold several `result` events: an executor that waits on CI in the background ends its
// turn, and is woken again when the task it waits on ends.

// A limit's text, by the error reference of Claude Code: "You've hit your session limit · resets
// 3:45pm", and so for the weekly, Opus and Sonnet limits.
const LIMIT_TEXT = /\byou['’]ve hit your [a-z ]*limit\b/i;

// What the stream says: the session, the model, the last state of the limit and whether it was
// hit — the last event of the limit rejected, the model's error, or the result's text —, the last
// `result`, or null when the run printed none, and of every `result`: how many, their turns and
// time summed, and the largest total of cost, the session's whole so far. A line that is not JSON is
// counted in `broken` and skipped.
export function readStream(text) {
  const read = { session: null, model: null, limit: null, limitHit: false, resetsAt: null, result: null, results: 0, turns: 0, durationMs: 0, cost: null, broken: 0 };
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      read.broken += 1;
      continue;
    }
    if (event?.type === "system" && event.subtype === "init") {
      read.session = event.session_id ?? read.session;
      read.model = event.model ?? read.model;
    } else if (event?.type === "rate_limit_event" && event.rate_limit_info) {
      // Each response of the API carries one; the last says where the limit stands.
      read.limit = event.rate_limit_info;
    } else if (event?.type === "assistant" && event.error === "rate_limit") {
      // How a transcript records the limit: a message of the model with the error, the limit's
      // text and the quota's state beside it.
      hit(read, event.quotaLimits?.resetsAt);
    } else if (event?.type === "result") {
      read.result = event;
      read.results += 1;
      if (typeof event.num_turns === "number") read.turns += event.num_turns;
      if (typeof event.duration_ms === "number") read.durationMs += event.duration_ms;
      if (typeof event.total_cost_usd === "number" && (read.cost === null || event.total_cost_usd > read.cost)) read.cost = event.total_cost_usd;
    }
  }
  if (read.limit?.status === "rejected") hit(read, read.limit.resetsAt);
  if (read.result && read.result.is_error && LIMIT_TEXT.test(String(read.result.result ?? ""))) hit(read, null);
  return read;
}

function hit(read, resetsAt) {
  read.limitHit = true;
  if (typeof resetsAt === "number") read.resetsAt = resetsAt;
}

// Whether a value is a status by status.schema.json, checked here by hand since the orchestrator
// takes no package: the test holds this check and the schema to the same examples.
export function isStatus(value) {
  const text = (v) => typeof v === "string";
  const textOrNull = (v) => v === null || text(v);
  const only = (object, keys) => isObject(object) && Object.keys(object).every((k) => keys.includes(k)) && keys.every((k) => k in object);
  if (!only(value, ["status", "task", "report", "plan", "pull_request", "questions", "failure"])) return false;
  if (!["done", "waiting", "failed"].includes(value.status)) return false;
  if (!text(value.task) || !TASK.test(value.task)) return false;
  if (!text(value.report) || !text(value.plan) || !textOrNull(value.pull_request) || !textOrNull(value.failure)) return false;
  if (!Array.isArray(value.questions) || (value.status === "waiting" && value.questions.length === 0)) return false;
  return value.questions.every(
    (q) =>
      only(q, ["row", "question", "options", "recommendation"]) &&
      text(q.row) &&
      text(q.question) &&
      text(q.recommendation) &&
      Array.isArray(q.options) &&
      q.options.length >= 2 &&
      q.options.length <= 4 &&
      q.options.every((o) => only(o, ["label", "description"]) && text(o.label) && text(o.description)),
  );
}

// A task's number, as the schema's pattern has it.
export const TASK = /^T\d+$/;

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// What a run that has ended came to, from its stream and the code it exited with: its phase, the
// executor's status when it gave one, why it stopped otherwise, and when the limit resets, as an
// ISO time. A status the executor gave is what the run came to, and so is the budget it ran out of;
// short of either, a limit is: a run stopped by one may still print a `result`, with its text.
// `task` completes a status whose schema, the one in the run's folder, asks for no task.
export function outcomeOf(read, exit, task = null) {
  const result = read.result;
  const resetsAt = read.resetsAt === null ? null : new Date(read.resetsAt * 1000).toISOString();
  const succeeded = result?.subtype === "success" && !result.is_error;
  const given = result?.structured_output;
  const status = task && isObject(given) && !("task" in given) ? { ...given, task } : given;
  if (succeeded && isStatus(status)) return { phase: status.status, status, reason: null, resetsAt };
  if (result?.subtype === "error_max_budget_usd") return { phase: "over-ceiling", status: null, reason: "the run reached its --max-budget-usd", resetsAt };
  if (read.limitHit) return { phase: "limited", status: null, reason: "the subscription's limit", resetsAt };
  if (succeeded) return { phase: "failed", status: null, reason: "the run gave no status by status.schema.json", resetsAt };
  if (result) {
    const errors = Array.isArray(result.errors) && result.errors.length ? `: ${result.errors.join("; ")}` : "";
    return { phase: "failed", status: null, reason: `the run ended with ${result.subtype}${errors}`, resetsAt };
  }
  return { phase: "failed", status: null, reason: `claude exited with ${exit} and printed no result`, resetsAt };
}
