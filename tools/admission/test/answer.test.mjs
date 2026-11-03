// The steps of the admission function, one by one, on a table written here, and the rules of a
// table (admission/README.md, sections 6 and 7).

import { test } from "node:test";
import assert from "node:assert/strict";
import { answerOf } from "../answer.mjs";
import { RULES, tableBreaches } from "../table.mjs";

const terms = [{ row: "OpenAI", read: "2026-11-03" }];
const TABLE = {
  providers: { alpha: { name: "Alpha" } },
  facts: { agreement: { description: "Signed." }, retention: { description: "Nothing kept." } },
  capabilities: [
    { capability: "hint", age_category: "adult", admission: "open", basis: ["privacy 3.2"] },
    { capability: "voice", age_category: "adult", admission: "closed", basis: ["privacy 6"] },
  ],
  cells: [
    { provider: "alpha", ai_route: "own_key", age_category: "adult", admission: "open", terms, basis: ["О-4"] },
    { provider: "alpha", ai_route: "platform_ai", age_category: "adult", admission: "open_with_facts", facts: ["agreement", "retention"], terms, basis: ["П-3"] },
    { provider: "alpha", ai_route: "own_key", age_category: "under_13", admission: "closed", terms, basis: ["П-4"] },
  ],
};
const request = (fields) => ({ capability: "hint", ai_route: "platform_ai", provider: "alpha", age_category: "adult", ...fields });
const cell = (fields) => ({ provider: "alpha", ai_route: "platform_ai", age_category: "adult", ...fields });

test("the rule of the capability comes first: closed, or missing", () => {
  assert.deepEqual(answerOf(TABLE, request({ capability: "voice" })), { admitted: false, reason: "capability_closed", capability_rule: { capability: "voice", age_category: "adult" } });
  assert.deepEqual(answerOf(TABLE, request({ capability: "text_reading" })), { admitted: false, reason: "capability_closed" });
  assert.deepEqual(answerOf(TABLE, request({ age_category: "under_13", ai_route: "own_key" })), { admitted: false, reason: "capability_closed" });
});

test("the cell: open admits, closed or missing refuses", () => {
  assert.deepEqual(answerOf(TABLE, request({ ai_route: "own_key" })), { admitted: true, cell: cell({ ai_route: "own_key" }) });
  assert.deepEqual(answerOf(TABLE, request({ provider: "beta" })), { admitted: false, reason: "cell_closed" });
  const closed = { ...TABLE, capabilities: [...TABLE.capabilities, { capability: "hint", age_category: "under_13", admission: "open", basis: ["privacy 3.2"] }] };
  assert.deepEqual(answerOf(closed, request({ age_category: "under_13", ai_route: "own_key" })), { admitted: false, reason: "cell_closed", cell: cell({ ai_route: "own_key", age_category: "under_13" }) });
});

test("the facts of a cell, in its order, each for its provider and category", () => {
  assert.deepEqual(answerOf(TABLE, request()), { admitted: false, reason: "fact_missing", cell: cell(), fact: "agreement" });
  assert.deepEqual(answerOf(TABLE, request(), { alpha: { agreement: ["adult"] } }), { admitted: false, reason: "fact_missing", cell: cell(), fact: "retention" });
  assert.deepEqual(answerOf(TABLE, request(), { alpha: { agreement: ["adult"], retention: ["under_13"] } }), { admitted: false, reason: "fact_missing", cell: cell(), fact: "retention" });
  assert.deepEqual(answerOf(TABLE, request(), { beta: { agreement: ["adult"], retention: ["adult"] } }), { admitted: false, reason: "fact_missing", cell: cell(), fact: "agreement" });
  assert.deepEqual(answerOf(TABLE, request(), { alpha: { agreement: ["adult"], retention: ["adult"] } }), { admitted: true, cell: cell() });
  // A name the prototype of an object holds is no provider and no fact declared.
  assert.deepEqual(answerOf(TABLE, request({ provider: "constructor" })), { admitted: false, reason: "cell_closed" });
  assert.deepEqual(answerOf({ ...TABLE, cells: [{ ...TABLE.cells[1], facts: ["toString"] }] }, request(), {}), { admitted: false, reason: "fact_missing", cell: cell(), fact: "toString" });
});

test("a table that keeps the rules breaks none, and each rule is named where it breaks", () => {
  assert.deepEqual(tableBreaches(TABLE), []);
  const broken = {
    ...TABLE,
    capabilities: [...TABLE.capabilities, TABLE.capabilities[0]],
    cells: [...TABLE.cells, TABLE.cells[0], { ...TABLE.cells[1], provider: "beta", facts: ["agreement", "region"] }],
  };
  assert.deepEqual(
    tableBreaches(broken).map(({ rule, at }) => [rule, at.join("/")]),
    [
      ["admission-table.unique-cells", "cells/3"],
      ["admission-table.known-providers", "cells/4/provider"],
      ["admission-table.known-facts", "cells/4/facts/1"],
      ["admission-table.unique-capabilities", "capabilities/2"],
    ],
  );
  assert.deepEqual(new Set(tableBreaches(broken).map((b) => b.rule)), new Set(RULES));
});
