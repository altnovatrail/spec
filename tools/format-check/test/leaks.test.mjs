// The leak check of section 20 of the format text, edge by edge, as leaks.mjs computes it: the normal
// form, the numbers of a text, a phrase as a whole, which keys are searched for, and what is found.

import { test } from "node:test";
import assert from "node:assert/strict";
import { holdsForm, leakForm, leaksBefore, leaksOf, needlesOf, numbersIn, textsShownBefore } from "../leaks.mjs";

const numbers = (text) => numbersIn(leakForm(text)).map(({ numerator, denominator }) => `${numerator}/${denominator}`);
const holds = (text, phrase) => holdsForm(leakForm(text), leakForm(phrase));
const written = (task) => needlesOf(task).map((needle) => needle.written);
const anywhere = (check) => ({ answer_slots: [{ binding: "anywhere", check }] });
const task = (items, extra = {}) => ({ statement: [{ text: "A task." }], items, ...extra });

test("the normal form: step 1, NFKC, the dashes and slashes, white space and lowercase, a character at a time", () => {
  assert.deepEqual(leakForm(" Seven RUNGS "), [..."seven rungs"]);
  assert.deepEqual(leakForm("−3"), [..."-3"]);
  assert.deepEqual(leakForm("7²"), ["7", "�"]);
  assert.deepEqual(leakForm("½"), [..."1/2"]);
  assert.deepEqual(leakForm("1½"), ["1", "�"]);
  assert.equal(leakForm("\u{1D7D5}").join(""), "7", "a digit outside the Basic Multilingual Plane, made 7 by NFKC");
});

test("a number begins at a digit that no letter, mark or digit stands before, and none stands after it", () => {
  assert.deepEqual(numbers("7 rungs, (7), 07:30"), ["7/1", "7/1", "7/1", "30/1"]);
  assert.deepEqual(numbers("17 x7 7x 7th 7rungs"), ["17/1"]);
  assert.deepEqual(numbers("-7 and 5-7"), ["7/1", "5/1", "7/1"], "a sign is no part of a number");
  assert.deepEqual(numbers("x77"), []);
  assert.deepEqual(numbers("x7.5 v1/2 A4.7"), [], "the whole run of a token that is no number is passed over, its tail too");
  assert.deepEqual(numbers("a5-3"), ["3/1"], "a sign ends a run");
});

test("the longest of a simple fraction, a decimal and an integer", () => {
  assert.deepEqual(numbers("1/2, 2 / 4 and 0.50"), ["1/2", "2/4", "50/100"]);
  assert.deepEqual(numbers("12/4.5"), ["12/4", "5/1"]);
  assert.deepEqual(numbers("1/0 and 1/00"), ["1/1", "0/1", "1/1", "0/1"], "a denominator of zero makes no fraction");
  assert.deepEqual(numbers("1 1/2"), ["1/1", "1/2"]);
  assert.deepEqual(numbers("7. And .5"), ["7/1", "5/1"]);
  assert.deepEqual(numbers("1/2x"), [], "the longest is followed by a letter");
  assert.deepEqual(numbers("0009007199254740992"), ["9007199254740992/1"]);
});

test("a phrase is found whole where its ends are letters, marks or digits, and anywhere where they are signs", () => {
  assert.equal(holds("It is odd.", "odd"), true);
  assert.equal(holds("even/odd", "odd"), true);
  assert.equal(holds("the odds", "odd"), false);
  assert.equal(holds("oddly", "odd"), false);
  assert.equal(holds("56<65", "<"), true);
  assert.equal(holds("56 ≤ 65", "<"), false);
  assert.equal(holds("＜", "<"), true, "NFKC makes the full-width sign the sign");
  assert.equal(holds("किताब", "कित"), false, "a vowel sign is a mark, and goes on the word");
  assert.equal(holds("Café", "cafe"), false, "NFKC composes the accent");
  assert.equal(holds("7 RUNGS", "7 rungs"), true);
  assert.equal(holds("anything", " "), false, "a phrase whose normal form is empty is found nowhere");
});

test("a key is searched for unless the texts of its own item show it, and a leak phrase always", () => {
  const rabbits = task([anywhere({ kind: "number", key: "2" })], { statement: [{ text: "A chicken has 2 legs." }], leak_phrases: ["2 rabbits"] });
  assert.deepEqual(written(rabbits), ["2 rabbits"]);
  const picture = task([anywhere({ kind: "number", key: "7" })], { statement: [{ picture: "pictures/p.png", alt: "Rows of 7 dots", width: 10, height: 10 }] });
  assert.deepEqual(written(picture), [], "the alt of a picture is seen with the item");
  const lines = task([
    { line: [{ text: "3 +" }, { binding: "box", check: { kind: "number", key: "3" } }, { text: "= 6" }] },
    { line: [{ binding: "box", check: { kind: "number", key: "6" } }, { text: "- 3 = 3" }] },
  ]);
  assert.deepEqual(written(lines), ["6"], "only an item's own line frees its key");
  const tapped = task([{ answer_slots: [{ binding: "choice", options: ["A cat", "A dog"], check: { kind: "choice", key: "A dog" } }] }]);
  assert.deepEqual(written(tapped), []);
  const byHand = task([{ answer_slots: [{ binding: "zone", check: { kind: "choice", key: "odd", options: ["even", "odd"] } }] }]);
  assert.deepEqual(written(byHand), ["odd"], "the options of a choice by hand are closed and free nothing");
  const predicate = task([anywhere({ kind: "predicate", predicate: "value > 0" })]);
  assert.deepEqual(written(predicate), []);
  assert.deepEqual(written({ items: [{ text: "a)", answer_slots: [{ binding: "sheet", check: { kind: "rubric", criteria: [{ text: "A criterion." }] } }] }] }), []);
});

test("what a text gives away: each key by value and magnitude, each phrase as written, once", () => {
  const half = task([anywhere({ kind: "number", key: "0.5" }), anywhere({ kind: "fraction", key: "1/2" })], { leak_phrases: ["a half"] });
  assert.deepEqual(leaksOf("2/4, and 1/2: A HALF.", half).sort(), ["0.5", "1/2", "a half"]);
  assert.deepEqual(leaksOf("0,5 and .5", half), []);
  assert.deepEqual(leaksOf("5-3", task([anywhere({ kind: "number", key: "-3" })])), ["-3"]);
  assert.deepEqual(leaksOf("Two keys of 8: 8.", task([anywhere({ kind: "number", key: "8" }), anywhere({ kind: "number", key: "8" })])), ["8"]);
  assert.deepEqual(leaksOf("It is odd.", task([{ answer_slots: [{ binding: "zone", check: { kind: "choice", key: "odd", options: ["even", "odd"] } }] }])), ["odd"]);
});

test("task.no-leaks searches the texts that the learner sees before the task is solved", () => {
  const ladder = task(
    [{ answer_slots: [{ binding: "anywhere", check: { kind: "number", key: "7", trap_values: [{ value: "6", trap: "off-by-one", text: "Not 7: count the rungs." }] } }], simpler_case: "A ladder of 3 rungs." }],
    { givens: ["The rungs are 30 cm apart."], unknown: "How many rungs.", techniques: ["draw"], traps: ["ignored-condition"], leak_phrases: ["seven rungs"] },
  );
  const parts = {
    manifest: { rung_templates: ["Which step gave seven rungs?", "Read the task again."] },
    traps: { traps: { "off-by-one": { trap_advice: "Draw it." }, "ignored-condition": { trap_advice: "Mark the conditions." } } },
    techniques: { techniques: { draw: { title: "Draw it", description: "Lines and dots." } } },
  };
  assert.deepEqual(textsShownBefore(ladder), ["The rungs are 30 cm apart.", "How many rungs.", "A ladder of 3 rungs.", "Not 7: count the rungs."]);
  assert.deepEqual(textsShownBefore(ladder, parts).slice(4), ["Draw it", "Lines and dots.", "Mark the conditions.", "Draw it.", "Which step gave seven rungs?", "Read the task again."]);
  assert.equal(leaksBefore(ladder), true, "the trap text holds the key");
  const fixed = structuredClone(ladder);
  fixed.items[0].answer_slots[0].check.trap_values[0].text = "Count the rungs, not the gaps.";
  assert.equal(leaksBefore(fixed), false);
  assert.equal(leaksBefore(fixed, parts), true, "a rung template holds the leak phrase");
  const essay = { items: [{ answer_slots: [{ binding: "sheet", check: { kind: "rubric", criteria: [{ text: "A criterion." }] } }] }] };
  assert.deepEqual(textsShownBefore(essay, parts), [], "a task with no verdict shows no rung template");
});
