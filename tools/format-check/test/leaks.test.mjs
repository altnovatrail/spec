// The leak check of section 20 of the format text, edge by edge, as leaks.mjs computes it: the normal
// form, the numbers of a text, a phrase as a whole, which keys are searched for, and what is found;
// and the texts of a lesson, searched for the keys of its tasks (section 21).

import { test } from "node:test";
import assert from "node:assert/strict";
import { holdsForm, leakForm, leaksBefore, leaksOf, lessonLeaks, lessonTexts, needlesOf, numbersIn, textsShownBefore, timesIn } from "../leaks.mjs";

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

// R111, В29 modules: a key of a time is found by its hours and minutes.
test("a time is a run of digits, : and digits that no letter, mark or digit stands right outside", () => {
  assert.deepEqual(timesIn(leakForm("At 07:30, or 19:05; not 7:305x or x7:30 or 7:")), ["7:30", "19:5"]);
  assert.deepEqual(timesIn(leakForm("12:00:30")), ["12:0"], "the search goes on after the run, and :30 begins at no digit");
  // A run out of the notation of a time read is none: a score, a time of 007 hours, minutes 030.
  assert.deepEqual(timesIn(leakForm("The score was 7:3, then 007:30 and 7:030; 10:100 is one")), ["10:100"]);
  // A key that is no time, which only a task the schema refuses has, is searched for nowhere.
  assert.deepEqual(needlesOf({ statement: [], items: [{ answer_slots: [{ binding: "anywhere", check: { kind: "time", key: "07:3" } }] }] }), []);
  assert.deepEqual(timesIn(leakForm("7 : 30, 7.30")), []);
  const task = { statement: [{ text: "When?" }], items: [{ answer_slots: [{ binding: "anywhere", check: { kind: "time", key: "7:30" } }] }] };
  assert.deepEqual(leaksOf("It is 07:30.", task), ["7:30"]);
  assert.deepEqual(leaksOf("It is 17:30, 7:31 or 7:30am.", task), []);
  // The statement frees its own key, as it does a number's.
  assert.deepEqual(needlesOf({ ...task, statement: [{ text: "It is 07:30 now. When?" }] }), []);
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
  const placeholder = task([{ line: [{ binding: "box", check: { kind: "number", key: "{x}" } }, { text: "and" }, { binding: "box", check: { kind: "number", key: "42" } }] }]);
  assert.deepEqual(written(placeholder), ["42"], "a key that holds a placeholder outside a template is task.placeholders', and the other keys are searched for");
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
  // The leading question of the task, and the description of every solving step (R108; app В13).
  const asked = { ...fixed, leading_question: "Is it 7?" };
  assert.ok(textsShownBefore(asked).includes("Is it 7?"));
  assert.equal(leaksBefore(asked), true, "a hint asked for gives the leading question before the first wrong answer");
  const steps = { solvingSteps: { steps: [{ title: "Solve it", description: "Count all 7 rungs.", exit_condition: "none" }, { title: "Check", exit_condition: "none" }] } };
  assert.ok(textsShownBefore(fixed, steps).includes("Count all 7 rungs."));
  assert.equal(leaksBefore(fixed, steps), true, "a step's description is searched for the keys of every task");
  // The title of a step is as open, and shown with every task, as its description is.
  assert.equal(leaksBefore(fixed, { solvingSteps: { steps: [{ title: "Count up to 7", exit_condition: "none" }] } }), true);
  // Of an instance of a template, the paths of the pictures of its statement and solution too (R108).
  const pictured = { ...fixed, statement: [{ text: "How many rungs?" }, { picture: "pictures/ladder-of-7.png", alt: "A ladder.", width: 1, height: 1 }], solution: [{ picture: "pictures/ladder-of-8.png", alt: "", width: 1, height: 1 }] };
  assert.ok(!textsShownBefore(pictured).includes("pictures/ladder-of-7.png"), "a task that is no template");
  assert.ok(textsShownBefore(pictured, {}, true).includes("pictures/ladder-of-7.png"));
  assert.ok(textsShownBefore(pictured, {}, true).includes("pictures/ladder-of-8.png"), "every picture of an instance is a file of the module");
  assert.equal(leaksBefore(pictured), false);
  assert.equal(leaksBefore(pictured, {}, true), true, "the instance's picture path holds the key 7");
});

test("lesson.no-leaks searches every text of a lesson for the keys of each task that it names", () => {
  const lesson = {
    title: "Gaps and posts",
    segments: [
      { explanation: [{ text: "A fence has posts." }, { picture: "pictures/fence.png", alt: "A fence.", width: 480, height: 160 }] },
      { worked_example: { statement: [{ text: "A path of 20 m." }], canvas: { kind: "handwriting_sheet" }, demo: [{ text: "4 gaps." }, { picture: "pictures/path.png", alt: "5 lamps.", area: { left: 0, top: 0, width: 800, height: 200 } }] } },
      { task: "ladder" },
      { explanation: [{ text: "Count the gaps first." }] },
      { task: "camp" },
    ],
  };
  assert.deepEqual(lessonTexts(lesson), ["Gaps and posts", "A fence has posts.", "A fence.", "A path of 20 m.", "4 gaps.", "5 lamps.", "Count the gaps first."]);
  // The texts of a numbered list, in order, and none of the numbers that the app draws (R111).
  const listed = { title: "Gaps", segments: [{ explanation: [{ text: "How to solve:" }, { numbered_list: ["Count the gaps.", "Add one post."] }] }] };
  assert.deepEqual(lessonTexts(listed), ["Gaps", "How to solve:", "Count the gaps.", "Add one post."]);
  const keyed = (key, extra) => task([anywhere({ kind: "number", key })], extra);
  assert.equal(lessonLeaks(lesson, new Map([["ladder", [keyed("7")]], ["camp", [keyed("9")]]])), false);
  assert.equal(lessonLeaks(lesson, new Map([["ladder", [keyed("5")]]])), true, "the alt of a picture of the demo holds the key");
  assert.equal(lessonLeaks(lesson, new Map([["ladder", [keyed("8", { leak_phrases: ["the gaps first"] })]]])), true, "a text after the task holds its leak phrase: the open view reaches the app whole");
  assert.equal(lessonLeaks(lesson, new Map([["ladder", [keyed("8")]], ["camp", [keyed("20")]]])), true, "the statement of the worked example holds the second task's key");
  assert.equal(lessonLeaks(lesson, new Map()), false, "a task that the module does not hold is lesson.known-tasks', not this rule's");
  assert.equal(lessonLeaks(lesson, new Map([["ladder", [keyed("7"), keyed("5")]]])), true, "the key of any instance of a template");
  assert.equal(lessonLeaks(lesson, new Map([["ladder", []]])), false, "a template whose instances cannot be counted");
  assert.deepEqual(lessonTexts({ segments: [{ task: "ladder" }] }), [], "a lesson with no title and no texts");
});
