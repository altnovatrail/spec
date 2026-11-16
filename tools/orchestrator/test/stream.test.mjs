// Each test reads a made-up stream of claude -p, in the shape a real run printed (RUN.md, T169):
// none is a real session's.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import { isStatus, outcomeOf, readStream } from "../stream.mjs";
import { allowed, init, QUESTION, result, STATUS } from "./fakes.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA = JSON.parse(fs.readFileSync(path.join(HERE, "..", "status.schema.json"), "utf8"));
const lines = (...events) => events.map((e) => (typeof e === "string" ? e : JSON.stringify(e))).join("\n");

test("a stream gives its session, model, last limit and result, and skips half a line", () => {
  const read = readStream(lines(init(), allowed, { type: "assistant", message: { content: [] } }, result(0.23), '{"type":"res'));
  assert.equal(read.session, "0f0e0d0c-0b0a-4908-8706-050403020100");
  assert.equal(read.model, "claude-opus-5-5");
  assert.equal(read.limit.status, "allowed");
  assert.equal(read.limitHit, false);
  assert.equal(read.resetsAt, null);
  assert.equal(read.result.total_cost_usd, 0.23);
  assert.equal(read.broken, 1);
  assert.deepEqual(outcomeOf(read, 0), { phase: "done", status: STATUS, reason: null, resetsAt: null });
});

test("a stream of several results — an executor woken again — sums their turns and time, and keeps the largest total", () => {
  const waking = result(1.5, STATUS, { num_turns: 40, duration_ms: 600_000 });
  const read = readStream(lines(init(), waking, { type: "result", subtype: "success", is_error: false, total_cost_usd: 1.2, duration_ms: 5 }, result(3, STATUS, { num_turns: 2 })));
  assert.equal(read.results, 3);
  assert.equal(read.turns, 42);
  assert.equal(read.durationMs, 600_000 + 5 + 1200);
  assert.equal(read.cost, 3);
  assert.equal(read.result.num_turns, 2, "the last result is the run's outcome");
  assert.equal(readStream(lines(result(2), { type: "result", subtype: "success", total_cost_usd: 1 })).cost, 2);
  // A total of nothing is a total: the run spent $0, not an unknown sum.
  assert.equal(readStream(lines(result(0))).cost, 0);
  assert.equal(readStream(lines(result(0), { type: "result", subtype: "success" })).cost, 0);
});

test("an empty stream has nothing, and a run that printed nothing failed with its exit code", () => {
  const read = readStream("");
  assert.deepEqual(read, { session: null, model: null, limit: null, limitHit: false, resetsAt: null, result: null, results: 0, turns: 0, durationMs: 0, cost: null, broken: 0 });
  assert.equal(outcomeOf(read, 1).reason, "claude exited with 1 and printed no result");
  assert.equal(outcomeOf(read, 1).phase, "failed");
});

test("a limit is seen three ways: a rejected rate_limit_event, the model's error, the result's text", () => {
  const rejected = readStream(lines(init(), { type: "rate_limit_event", rate_limit_info: { status: "rejected", resetsAt: 1794129600, rateLimitType: "five_hour" } }));
  assert.equal(rejected.limitHit, true);
  assert.deepEqual(outcomeOf(rejected, 1), { phase: "limited", status: null, reason: "the subscription's limit", resetsAt: "2026-11-08T09:20:00.000Z" });

  const message = readStream(lines(init(), { type: "assistant", error: "rate_limit", quotaLimits: { status: "rejected", resetsAt: 1794207600 }, message: { content: [{ type: "text", text: "You've hit your weekly limit · resets 7am (UTC)" }] } }));
  assert.equal(outcomeOf(message, 1).resetsAt, "2026-11-09T07:00:00.000Z");

  const text = readStream(lines(init(), allowed, { type: "result", subtype: "success", is_error: true, result: "You’ve hit your Opus limit · resets 3:45pm", total_cost_usd: 1 }));
  assert.equal(text.limitHit, true);
  assert.equal(outcomeOf(text, 1).phase, "limited");
  // The last event of the limit that was allowed sets no time of a reset.
  assert.equal(outcomeOf(text, 1).resetsAt, null);
});

test("a status the executor gave, and the budget it ran out of, win over a limit met on the way", () => {
  const rejected = { type: "rate_limit_event", rate_limit_info: { status: "rejected", resetsAt: 1794129600 } };
  assert.equal(outcomeOf(readStream(lines(rejected, result(2))), 0).phase, "done");
  assert.equal(outcomeOf(readStream(lines(rejected, { type: "result", subtype: "error_max_budget_usd", is_error: true })), 1).phase, "over-ceiling");
  // Only the last event of the limit counts: a rejection the run got past is no limit.
  const past = readStream(lines(rejected, allowed, { type: "result", subtype: "error_during_execution", is_error: true }));
  assert.equal(past.limitHit, false);
  assert.equal(outcomeOf(past, 1).phase, "failed");
});

test("the executor's status names the phase: waiting with its questions, failed with its reason", () => {
  const waiting = { ...STATUS, status: "waiting", pull_request: null, questions: [QUESTION] };
  assert.equal(outcomeOf(readStream(lines(result(1, waiting))), 0).phase, "waiting");
  const failed = { ...STATUS, status: "failed", failure: "нет контейнера" };
  assert.equal(outcomeOf(readStream(lines(result(1, failed))), 0).status.failure, "нет контейнера");
});

test("a run over its budget, one with no status, and one that ended in an error", () => {
  assert.equal(outcomeOf(readStream(lines({ type: "result", subtype: "error_max_budget_usd", is_error: true, total_cost_usd: 5 })), 1).phase, "over-ceiling");
  assert.equal(outcomeOf(readStream(lines(result(1, null))), 0).reason, "the run gave no status by status.schema.json");
  assert.equal(outcomeOf(readStream(lines(result(1, { status: "done" }))), 0).phase, "failed");
  assert.equal(outcomeOf(readStream(lines({ type: "result", subtype: "error_during_execution", is_error: true, errors: ["a", "b"] })), 1).reason, "the run ended with error_during_execution: a; b");
  assert.equal(outcomeOf(readStream(lines({ type: "result", subtype: "error_max_turns", is_error: true })), 1).reason, "the run ended with error_max_turns");
});

// Values the hand-written check and the schema must agree on.
const VALUES = [
  [STATUS, true],
  [{ ...STATUS, status: "waiting", questions: [QUESTION] }, true],
  [{ ...STATUS, pull_request: null, failure: "x" }, true],
  [{ ...STATUS, status: "merged" }, false],
  [{ ...STATUS, task: "T028" }, true],
  [(({ task, ...rest }) => rest)(STATUS), false],
  [{ ...STATUS, task: 28 }, false],
  [{ ...STATUS, task: "28" }, false],
  [{ ...STATUS, task: "T28a" }, false],
  [{ ...STATUS, task: "T" }, false],
  [{ ...STATUS, task: "Т28" }, false],
  [{ ...STATUS, extra: 1 }, false],
  [(({ plan, ...rest }) => rest)(STATUS), false],
  [{ ...STATUS, report: null }, false],
  [{ ...STATUS, pull_request: 1 }, false],
  [{ ...STATUS, questions: {} }, false],
  [{ ...STATUS, questions: [{ ...QUESTION, row: 7 }] }, false],
  [{ ...STATUS, questions: [{ ...QUESTION, extra: "" }] }, false],
  [{ ...STATUS, questions: [{ ...QUESTION, options: "Первый" }] }, false],
  [{ ...STATUS, questions: [{ ...QUESTION, options: [{ label: "Первый" }] }] }, false],
  [{ ...STATUS, questions: [{ ...QUESTION, options: [{ label: "Первый", description: 2 }] }] }, false],
  [{ ...STATUS, status: "waiting", questions: [] }, false],
  [{ ...STATUS, questions: [{ ...QUESTION, options: [QUESTION.options[0]] }] }, false],
  [{ ...STATUS, questions: [{ ...QUESTION, options: [...QUESTION.options, ...QUESTION.options, QUESTION.options[0]] }] }, false],
  [{ ...STATUS, questions: [{ ...QUESTION, options: [...QUESTION.options, ...QUESTION.options] }] }, true],
  [[STATUS], false],
  [null, false],
  ["done", false],
];

test("the schema is draft-07, which Claude Code 2.1.280 takes, and strict ajv compiles it", () => {
  // `--json-schema` with the 2020-12 dialect: "no schema with key or ref" (RUN.md, T169).
  assert.equal(SCHEMA.$schema, "http://json-schema.org/draft-07/schema#");
  new Ajv({ strict: true, allErrors: true }).compile(SCHEMA);
});

test("the hand-written check and the schema agree on every value", () => {
  const validate = new Ajv({ strict: true }).compile(SCHEMA);
  for (const [value, valid] of VALUES) {
    assert.equal(validate(value), valid, JSON.stringify(value));
    assert.equal(isStatus(value), valid, JSON.stringify(value));
  }
});
