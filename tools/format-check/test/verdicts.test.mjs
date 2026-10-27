// The verdicts of section 15 of the format text, edge by edge, as verdicts.mjs computes them, and a
// vector of a predicate, of which spec computes only blank and notation.

import { test } from "node:test";
import assert from "node:assert/strict";
import { checkVerdictVector } from "../cases.mjs";
import { answerSlotsOf, itemVerdict, lowercase, normalized, rationalOf, readNumber, slotBreaches, slotVerdict } from "../verdicts.mjs";

const slot = (check, options) => (options ? { binding: "choice", options, check } : { binding: "anywhere", check });
const verdictOf = (check, value, options) => slotVerdict(slot(check, options), value);
const CORRECT = { verdict: "correct" };
const NOT_YET = { verdict: "not_yet" };
const BLANK = { verdict: "unreadable", reason: "blank" };
const NOTATION = { verdict: "unreadable", reason: "notation" };

test("white space is the Unicode property White_Space, collapsed and trimmed", () => {
  assert.equal(normalized("\u00857\u2003 \t"), "7");
  assert.equal(normalized("3\u00A0/\u00A04"), "3 / 4");
  assert.equal(normalized("\uFEFF7"), "\uFEFF7", "U+FEFF is no white space");
});

test("NFKC, the dashes and the minus sign, and the slashes", () => {
  assert.equal(normalized("\uFF17"), "7");
  assert.equal(normalized("\u00BD"), "1/2");
  assert.equal(normalized("\u22123"), "-3");
  for (const dash of ["\u2010", "\u2012", "\u2013", "\u2014", "\u2015"]) assert.equal(normalized(`${dash}3`), "-3");
  assert.equal(normalized("1\u22152"), "1/2");
});

test("lowercase is the simple mapping of each character, with no context", () => {
  assert.equal(lowercase("ODD"), "odd");
  assert.equal(lowercase("\u0130"), "i", "U+0130 maps to i, as in Go's unicode.ToLower");
  assert.equal(lowercase("\u03A3"), "\u03C3", "a capital sigma alone maps to U+03C3, not to the final U+03C2");
});

test("a number drops a leading =, the punctuation at its end and its units, and is blank when nothing is left", () => {
  assert.deepEqual(readNumber(" = 7?! "), { text: "7" });
  assert.deepEqual(readNumber("7 Rungs.", ["rung", "rungs"]), { text: "7" });
  assert.deepEqual(readNumber("7RUNGS", ["rungs"]), { text: "7" });
  assert.deepEqual(readNumber("rungs", ["rungs"]), { text: "rungs" }, "a unit with nothing before it stays");
  assert.deepEqual(readNumber("7 rungs", ["s", "rungs"]), { text: "7" }, "the longest unit first");
  assert.deepEqual(readNumber("rungs", ["s", "rungs"]), { text: "rungs" }, "nothing stands before the longest, so nothing is dropped");
  assert.deepEqual(readNumber("12 cm\u00B2", ["cm\u00B2"]), { text: "12" }, "a unit with a superscript digit matches");
  assert.deepEqual(readNumber("12 cm2", ["cm\u00B2"]), { text: "12 cm2" });
  assert.deepEqual(readNumber("12 min.", ["min."]), { text: "12" }, "a unit that ends in a full stop matches");
  assert.deepEqual(readNumber("7mm", ["m"]), { text: "7m" });
  assert.deepEqual(readNumber("7 \u043A\u043C/\u0441", ["\u043A\u043C/\u0441"]), { text: "7" });
  assert.deepEqual(readNumber("="), { reason: "blank" });
  assert.deepEqual(readNumber("  "), { reason: "blank" });
  assert.deepEqual(readNumber("7\u00B2"), { text: "7\uFFFD" }, "NFKC does not make a superscript a digit");
  assert.deepEqual(verdictOf({ kind: "number", key: "72" }, "7\u00B2"), NOTATION);
  assert.deepEqual(verdictOf({ kind: "number", key: "2" }, "x\u2082"), NOTATION);
});

test("the notations: an integer, a decimal with a point and a simple fraction, 16 characters at most", () => {
  assert.deepEqual(rationalOf("-12", "number"), { numerator: -12n, denominator: 1n });
  assert.deepEqual(rationalOf("-0.75", "number"), { numerator: -75n, denominator: 100n });
  assert.deepEqual(rationalOf("3 / 4", "number"), { numerator: 3n, denominator: 4n });
  assert.deepEqual(rationalOf("3/4", "fraction"), { numerator: 3n, denominator: 4n });
  assert.equal(rationalOf("3", "fraction"), null, "a fraction takes only a simple fraction");
  assert.equal(rationalOf("0.5", "fraction"), null);
  assert.equal(rationalOf("1.5", "predicate"), null, "a predicate takes only an integer");
  assert.equal(rationalOf("3/4", "predicate"), null);
  assert.deepEqual(rationalOf("12", "predicate"), { numerator: 12n, denominator: 1n });
  for (const text of ["07", "+7", ".5", "5.", "1,5", "1 000", "1/0", "1 1/2", "010/2", "7e0", "0x7", "\u0667", "12345678901234567"]) {
    assert.equal(rationalOf(text, "number"), null, text);
  }
  assert.ok(rationalOf("1234567890123456", "number"), "16 characters are in notation");
});

test("a number is compared by its value, exactly", () => {
  assert.deepEqual(verdictOf({ kind: "number", key: "0.5" }, "2/4"), CORRECT);
  assert.deepEqual(verdictOf({ kind: "number", key: "7" }, "7.0"), CORRECT);
  assert.deepEqual(verdictOf({ kind: "number", key: "9007199254740992" }, "9007199254740993"), NOT_YET);
  assert.deepEqual(verdictOf({ kind: "number", key: "0" }, "-0"), CORRECT);
  assert.deepEqual(verdictOf({ kind: "number", key: "7" }, "seven"), NOTATION);
  assert.deepEqual(verdictOf({ kind: "number", key: "7" }, null), BLANK);
  assert.deepEqual(verdictOf({ kind: "number", key: "7" }, ""), BLANK);
});

test("a fraction of the right value that can be reduced is not yet right when the form is reduced", () => {
  assert.deepEqual(verdictOf({ kind: "fraction", key: "1/4" }, "2/8"), CORRECT);
  assert.deepEqual(verdictOf({ kind: "fraction", key: "1/4", form: "any" }, "2/8"), CORRECT);
  assert.deepEqual(verdictOf({ kind: "fraction", key: "1/4", form: "reduced" }, "2/8"), NOT_YET);
  assert.deepEqual(verdictOf({ kind: "fraction", key: "-1/2", form: "reduced" }, "-2/4"), NOT_YET);
  assert.deepEqual(verdictOf({ kind: "fraction", key: "-1/2", form: "reduced" }, "\u22121/2"), CORRECT);
  assert.deepEqual(verdictOf({ kind: "fraction", key: "1/4", form: "reduced" }, "0.25"), NOTATION);
});

test("a choice compares the value with its options in lowercase, dropping nothing", () => {
  const signs = { kind: "choice", options: ["<", ">", "="], key: "<" };
  assert.deepEqual(verdictOf(signs, "\uFF1C"), CORRECT);
  assert.deepEqual(verdictOf(signs, "="), NOT_YET, "a = is an option, not dropped");
  assert.deepEqual(verdictOf(signs, "\u2264"), NOTATION);
  assert.deepEqual(verdictOf(signs, " "), BLANK);
  const words = { kind: "choice", options: ["even", "odd"], key: "odd" };
  assert.deepEqual(verdictOf(words, "ODD"), CORRECT);
  assert.deepEqual(verdictOf(words, "odd."), NOTATION);
  const tapped = { kind: "choice", key: "B" };
  assert.deepEqual(verdictOf(tapped, "A", ["A", "B"]), NOT_YET, "the options of a choice by tapping are the answer slot's");
  assert.deepEqual(verdictOf(tapped, "B", ["A", "B"]), CORRECT);
});

test("a predicate reads an integer, and leaves the rest to Starlark", () => {
  const predicate = { kind: "predicate", predicate: "value % 12 == 0" };
  assert.equal(verdictOf(predicate, "12"), null);
  assert.equal(verdictOf(predicate, "-24"), null);
  assert.deepEqual(verdictOf(predicate, "1.5"), NOTATION);
  assert.deepEqual(verdictOf(predicate, null), BLANK);
});

test("a kind with no verdict is an error of the caller", () => {
  assert.throws(() => verdictOf({ kind: "rubric", criteria: [{ text: "Paragraphs." }] }, "An essay."), /no verdict of the check kind rubric/);
});

test("an answer slot's check breaks the rules of a task that it shows by itself", () => {
  assert.deepEqual(slotBreaches(slot({ kind: "choice", options: ["<", ">"], key: "<" })), []);
  assert.deepEqual(slotBreaches(slot({ kind: "choice", options: ["<", ">"], key: "\u2264" })), ["task.choice-key"]);
  assert.deepEqual(slotBreaches(slot({ kind: "choice", key: "C" }, ["A", "B"])), ["task.choice-key"], "a choice by tapping takes the answer slot's options");
  assert.deepEqual(slotBreaches(slot({ kind: "choice", options: ["Even", "even", "odd"], key: "odd" })), ["task.choice-options"]);
  assert.deepEqual(slotBreaches(slot({ kind: "fraction", key: "2/8", form: "reduced" })), ["task.fraction-key"]);
  assert.deepEqual(slotBreaches(slot({ kind: "fraction", key: "2/8" })), [], "any form takes a key that can be reduced");
  assert.deepEqual(slotBreaches(slot({ kind: "number", key: "7" })), []);
});

test("an item is right when every answer slot is, not yet when one is, then unreadable, then unchecked", () => {
  assert.equal(itemVerdict(["correct", "correct"]), "correct");
  assert.equal(itemVerdict(["unreadable", "not_yet"]), "not_yet");
  assert.equal(itemVerdict(["unchecked", "not_yet"]), "not_yet");
  assert.equal(itemVerdict(["correct", "unreadable", "unchecked"]), "unreadable");
  assert.equal(itemVerdict(["correct", "unchecked"]), "unchecked");
});

test("the answer slots of an item are its answer_slots, or the boxes of its line", () => {
  assert.deepEqual(answerSlotsOf({ answer_slots: [{ binding: "anywhere" }] }), [{ binding: "anywhere" }]);
  assert.deepEqual(answerSlotsOf({ line: [{ text: "7 \u00D7" }, { binding: "box" }, { text: "= 56" }] }), [{ binding: "box" }]);
  assert.deepEqual(answerSlotsOf({}), []);
});

test("a vector of a predicate is checked for blank and notation, and its other verdicts are module-kit's", () => {
  const validate = () => true;
  const vector = (value, verdict, reason) =>
    new TextEncoder().encode(
      [
        "item:",
        "  answer_slots:",
        "    - binding: anywhere",
        '      check: {kind: predicate, predicate: "value % 12 == 0"}',
        "readings:",
        "  - answer_slots:",
        `      - {value: ${JSON.stringify(value)}, verdict: ${verdict}${reason ? `, reason: ${reason}` : ""}}`,
        `    verdict: ${verdict}`,
        "",
      ].join("\n"),
    );
  const check = (bytes) => checkVerdictVector(bytes, { kind: "predicate", validate }).map((problem) => problem.message);
  for (const verdict of ["correct", "not_yet", "unchecked"]) assert.deepEqual(check(vector("12", verdict)), []);
  assert.match(check(vector("12", "unreadable", "notation"))[0], /"12" is in the notation of a predicate, which gives correct, not_yet or unchecked$/);
  assert.match(check(vector("1.5", "not_yet"))[0], /"1\.5" gets unreadable \(notation\), not not_yet$/);
  assert.deepEqual(check(vector(null, "unreadable", "blank")), []);
});

test("the item of a vector breaks no rule of a task that its answer slots show", () => {
  const bytes = new TextEncoder().encode(
    ["item:", "  answer_slots:", "    - binding: anywhere", '      check: {kind: choice, options: ["<", ">"], key: "="}', "readings:", "  - answer_slots:", '      - {value: "<", verdict: not_yet}', "    verdict: not_yet", ""].join("\n"),
  );
  const messages = checkVerdictVector(bytes, { kind: "choice", validate: () => true }).map((problem) => problem.message);
  assert.deepEqual(messages, ["answer slot 1 breaks task.choice-key: the item of a vector is one that a task may hold"]);
});
