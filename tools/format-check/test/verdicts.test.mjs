// The verdicts of section 15 of the format text, edge by edge, as verdicts.mjs computes them, the
// traps that wrong values match, and a vector of a predicate, of which spec computes only blank and
// notation.

import { test } from "node:test";
import assert from "node:assert/strict";
import { checkVerdictVector } from "../cases.mjs";
import { answerSlotsOf, comparableOf, itemVerdict, lowercase, normalized, rationalOf, readNumber, scriptsReplaced, slotBreaches, slotVerdict, trapOf } from "../verdicts.mjs";

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

test("step 1: a vulgar fraction that a number touches becomes U+FFFD, and a lone one stays", () => {
  assert.equal(scriptsReplaced("1\u00BD"), "1\uFFFD");
  assert.equal(scriptsReplaced("\u00BD1"), "\uFFFD1");
  assert.equal(scriptsReplaced("\uFF11\u00BD"), "\uFF11\uFFFD", "a full-width digit is a number too");
  assert.equal(scriptsReplaced("\u00BD"), "\u00BD");
  assert.equal(scriptsReplaced("1 \u00BD"), "1 \u00BD", "a space keeps them apart, and 1 1/2 is not in notation anyway");
  assert.equal(scriptsReplaced("7\u00B2"), "7\uFFFD");
  assert.deepEqual(verdictOf({ kind: "number", key: "3/2" }, "1\u00BD"), NOTATION, "not eleven halves");
  assert.deepEqual(verdictOf({ kind: "number", key: "1/2" }, "\u00BD"), CORRECT);
  assert.deepEqual(verdictOf({ kind: "number", key: "3/2" }, "1 \u00BD"), NOTATION);
});

test("a check compares a value as it compares the key: a choice by its normal form, a number by its value", () => {
  const number = slot({ kind: "number", key: "7", units: ["rungs"] });
  assert.equal(comparableOf(number, "6 rungs"), "6/1");
  assert.equal(comparableOf(number, "12/2"), "6/1");
  assert.equal(comparableOf(number, "six"), null);
  assert.equal(comparableOf(slot({ kind: "fraction", key: "3/4" }), "9/12"), "3/4");
  assert.equal(comparableOf(slot({ kind: "fraction", key: "3/4" }), "-6/8"), "-3/4");
  assert.equal(comparableOf(slot({ kind: "choice", key: "odd", options: ["even", "odd"] }), " EVEN "), "even");
  assert.equal(comparableOf(slot({ kind: "predicate", predicate: "value > 0" }), "6"), null);
});

test("a wrong value matches the trap of the trap value its check compares it equal to", () => {
  const ladder = slot({ kind: "number", key: "7", units: ["rung", "rungs"], trap_values: [{ value: "6", trap: "off-by-one" }, { value: "8", trap: "ignored-condition" }] });
  assert.equal(trapOf(ladder, "6 rungs"), "off-by-one", "the units are dropped, as for the key");
  assert.equal(trapOf(ladder, "8."), "ignored-condition");
  assert.equal(trapOf(ladder, "9"), null, "a wrong value that no trap value is");
  assert.equal(trapOf(ladder, "7"), null, "a right value matches no trap");
  assert.equal(trapOf(ladder, "six"), null, "an unreadable value matches no trap");
  assert.equal(trapOf(ladder, null), null);
  const lowest = slot({ kind: "fraction", key: "3/4", form: "reduced", trap_values: [{ value: "6/8", trap: "not-in-lowest-terms" }] });
  assert.equal(trapOf(lowest, "9/12"), "not-in-lowest-terms", "by value: every fraction of the key's value that is not the key");
  assert.equal(trapOf(lowest, "3/4"), null);
  const words = slot({ kind: "choice", key: "odd", options: ["even", "odd"], trap_values: [{ value: "even", trap: "wrong-parity" }] });
  assert.equal(trapOf(words, "EVEN"), "wrong-parity");
  assert.equal(trapOf(slot({ kind: "number", key: "7" }), "6"), null, "a check with no trap values");
  assert.equal(trapOf(slot({ kind: "predicate", predicate: "value > 7" }), "6"), null, "a predicate, which Starlark judges");
});

test("the trap values of a check are all not yet right, a choice's are options as written, and no two are equal", () => {
  const number = (trapValues) => slotBreaches(slot({ kind: "number", key: "7", trap_values: trapValues }));
  assert.deepEqual(number([{ value: "6", trap: "a" }, { value: "8", trap: "a" }]), []);
  assert.deepEqual(number([{ value: "7", trap: "a" }]), ["task.trap-values"], "the key itself");
  assert.deepEqual(number([{ value: "6", trap: "a" }, { value: "6.0", trap: "b" }]), ["task.trap-values"], "two of one value");
  assert.deepEqual(slotBreaches(slot({ kind: "fraction", key: "1/4", trap_values: [{ value: "2/8", trap: "a" }] })), ["task.trap-values"], "right in any form");
  assert.deepEqual(slotBreaches(slot({ kind: "fraction", key: "1/4", form: "reduced", trap_values: [{ value: "2/8", trap: "a" }] })), []);
  const written = (value) => slotBreaches({ binding: "zone", check: { kind: "choice", key: "odd", options: ["even", "odd"], trap_values: [{ value, trap: "a" }] } });
  assert.deepEqual(written("even"), []);
  assert.deepEqual(written("Even"), ["task.trap-values"], "an option as written, not as normalized");
  assert.deepEqual(written("seven"), ["task.trap-values"], "no option");
  const tapped = slotBreaches(slot({ kind: "choice", key: "B", trap_values: [{ value: "A", trap: "a" }] }, ["A", "B"]));
  assert.deepEqual(tapped, [], "the options of a choice by tapping");
});
