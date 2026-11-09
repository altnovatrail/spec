// The vectors of the observation, as tools/contracts/observation.mjs checks them: by the image buf
// builds of spec's own contracts/, each vector in memory with one thing broken, and spec's own
// vectors, which pass.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { before, test } from "node:test";
import { root } from "../../release/test/repository.mjs";
import { build } from "../buf.mjs";
import { FOLDER, REASONS, breaches, checkVector, checkVectors, formatValidators, join, packageOf, readVector } from "../observation.mjs";

// The image of spec's own contracts/, and what the checks read from it, built once before the tests.
let image;
let known;
let validators;
let options;
before(() => {
  const built = build(root);
  assert.deepEqual(built.errors, []);
  image = built.image;
  known = packageOf(image);
  validators = formatValidators(root);
  options = { ...known, ...validators };
});
const vectors = fs.readdirSync(path.join(root, FOLDER)).map((name) => `${FOLDER}/${name}`);

const at = (item, slot) => ({ item, slot });
const value = (item, slot, text, box) => ({ answer_slot: at(item, slot), value: text, ...(box ? { crop_box: box } : {}) });
const reason = (item, slot, name) => ({ answer_slot: at(item, slot), unreadable: `UNREADABLE_${name}` });
const observation = (...slots) => ({ answer_slots: slots });
const box = (ymin, xmin, ymax, xmax) => ({ ymin, xmin, ymax, xmax });

// A vector of one box checked by number, key 8, with one case that passes; edit changes it.
function vector(edit = () => {}) {
  const right = observation(value(1, 1, "8"));
  const made = {
    description: "One box.",
    canvas: { kind: "workbook" },
    items: [{ line: [{ text: "7 × " }, { binding: "box", check: { kind: "number", key: "8" } }] }],
    cases: [{ description: "Read alike.", observations: [right, right], valid: [true, true], joined: right, verdicts: [{ answer_slots: [{ verdict: "correct" }], verdict: "correct" }] }],
  };
  edit(made);
  return made;
}
const bytesOf = (value) => Buffer.from(typeof value === "string" ? value : JSON.stringify(value, null, 2));
const problemsOf = (value) => checkVector(bytesOf(value), options).problems.map((problem) => problem.message);

// Every problem matches one of the patterns, and every pattern one of the problems.
function expectOnly(value, ...patterns) {
  const problems = problemsOf(value);
  for (const problem of problems) assert.ok(patterns.some((pattern) => pattern.test(problem)), `unexpected: ${problem}\nall:\n${problems.join("\n")}`);
  for (const pattern of patterns) assert.ok(problems.some((problem) => pattern.test(problem)), `missing: ${pattern}\nall:\n${problems.join("\n")}`);
}

test("spec's own vectors pass, and together hold every rule", () => {
  assert.deepEqual(known.reasons, new Set(REASONS.keys()));
  const { errors, cases } = checkVectors(root, image, vectors);
  assert.deepEqual(errors, []);
  assert.ok(cases >= 50, `${cases} cases`);
});

test("what the vectors lack together is found, once each holds", () => {
  const { errors } = checkVectors(root, image, [`${FOLDER}/essay.json`]);
  const messages = errors.map((error) => error.message);
  for (const name of ["UNREADABLE_BLANK", "UNREADABLE_ILLEGIBLE", "UNREADABLE_AMBIGUOUS", "UNREADABLE_NO_FINAL_ANSWER", "UNREADABLE_SEVERAL_FINAL_ANSWERS"]) assert.ok(messages.some((message) => message.includes(`joins into ${name}`)), name);
  for (const kind of ["number", "fraction", "choice", "time", "predicate"]) assert.ok(messages.some((message) => message.includes(`checked by ${kind}`)), kind);
  assert.ok(!messages.some((message) => message.includes("checked by rubric")));
  assert.ok(!messages.some((message) => message.includes("not valid")), "the essay has an observation that is not valid");
  assert.ok(messages.some((message) => message.includes("taps an option")));
  const fixed = errors.find((error) => error.message.includes("UNREADABLE_BLANK"));
  assert.deepEqual([fixed.file, fixed.line], [FOLDER, 0]);
});

test("a vector with a problem leaves the coverage unsaid, and names its file", () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "observation-"));
  try {
    fs.cpSync(path.join(root, "format"), path.join(folder, "format"), { recursive: true });
    fs.mkdirSync(path.join(folder, FOLDER), { recursive: true });
    fs.writeFileSync(path.join(folder, FOLDER, "one.json"), "[]");
    const { errors } = checkVectors(folder, image, [`${FOLDER}/one.json`]);
    assert.deepEqual(errors, [{ file: `${FOLDER}/one.json`, line: 1, message: "a vector is an object: description, canvas, items and cases" }]);
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});

test("the package is read from the image, and a reason section 10 does not name is refused", () => {
  assert.ok(known.message);
  const copy = structuredClone(image);
  const file = copy.file.find((one) => one.package === "novatrail.observation.v1");
  file.enumType.find((one) => one.name === "Unreadable").value.push({ name: "UNREADABLE_SMUDGED", number: 6 });
  assert.match(packageOf(copy).error, /Unreadable has UNREADABLE_SMUDGED, which the table of contracts\/README\.md, section 10 does not name/);
  assert.match(checkVectors(root, copy, vectors).errors[0].message, /UNREADABLE_SMUDGED/);
  file.enumType = file.enumType.filter((one) => one.name !== "Unreadable");
  // The field of the enum, made a message, so that the file still resolves without it.
  for (const message of file.messageType) {
    for (const field of message.field ?? []) {
      if (field.typeName?.endsWith(".Unreadable")) Object.assign(field, { type: "TYPE_MESSAGE", typeName: ".novatrail.observation.v1.CropBox" });
    }
  }
  assert.match(packageOf(copy).error, /has no novatrail\.observation\.v1\.Unreadable/);
  assert.match(packageOf({ file: [] }).error, /has no novatrail\.observation\.v1\.Observation/);
});

test("the format's schemas give the validators of a canvas and an item, or the check says they do not compile", () => {
  assert.equal(typeof validators.canvas, "function");
  assert.equal(typeof validators.item, "function");
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "observation-"));
  try {
    fs.mkdirSync(path.join(folder, "format/schemas"), { recursive: true });
    assert.match(formatValidators(folder).error, /the schema of a task does not compile/);
    fs.mkdirSync(path.join(folder, FOLDER), { recursive: true });
    assert.match(checkVectors(folder, image, []).errors[0].message, /does not compile/);
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});

test("a vector is UTF-8 JSON with no key twice and no lone surrogate", () => {
  assert.match(readVector(Buffer.from("{")).problems[0].message, /^not JSON/);
  assert.match(readVector(Buffer.from([0x7b, 0xff, 0x7d])).problems[0].message, /^not JSON/);
  assert.deepEqual(readVector(Buffer.from('{\n  "a": 1,\n  "a": 2\n}')).problems, [{ line: 3, message: "a key that its object has already" }]);
  assert.match(readVector(Buffer.from('{"a": ["\\ud800"]}')).problems[0].message, /lone surrogate/);
  assert.match(readVector(Buffer.from('{"\\udc00": 1}')).problems[0].message, /lone surrogate/);
  const { lineOf } = readVector(Buffer.from('{\n  "a": {\n    "b": [1, 2]\n  }\n}'));
  assert.deepEqual([lineOf(["a", "b", 1]), lineOf(["a", "c"]), lineOf(["z"])], [3, 2, 1]);
});

test("the keys of a vector, its description, canvas, items and cases", () => {
  expectOnly(vector((v) => { v.notes = ""; delete v.cases; }), /^notes: no such key$/, /^cases is missing$/);
  expectOnly(vector((v) => { v.description = " "; }), /^description is a text/);
  expectOnly(vector((v) => { v.canvas = { kind: "board" }; }), /^canvas is not a canvas of the module format/);
  expectOnly(vector((v) => { v.items = []; v.cases = []; }), /^items lists the task's items/, /^cases lists the cases/);
});

test("the items of a vector are items of the format, of the form of the canvas, and break no rule of a task", () => {
  expectOnly(vector((v) => { v.items[0].line[1].check.key = 8; }), /^item 1 is not an item of the module format: \/line\/1\/check\/key must be string/);
  expectOnly(vector((v) => { v.canvas = { kind: "handwriting_sheet" }; }), /^item 1 has no answer_slots, which an item on a handwriting_sheet has/);
  expectOnly(vector((v) => { v.items[0].line[1].check = { kind: "choice", key: "8", options: ["7", "9"] }; }), /^answer slot 1\.1 breaks task\.choice-key/);
  const sheet = (slots) => vector((v) => { v.canvas = { kind: "handwriting_sheet" }; v.items = [{ answer_slots: slots }]; });
  const anywhere = { binding: "anywhere", check: { kind: "number", key: "8" } };
  const tapped = { binding: "choice", options: ["yes", "no"], check: { kind: "choice", key: "yes" } };
  expectOnly(sheet([anywhere, tapped]), /^answer slot 1\.1 is bound anywhere, so it is the only answer slot of its task/);
  expectOnly(sheet([tapped]), /^no answer slot of the task is read by AI/);
});

test("the keys of a case, its description, and how many observations and flags it has", () => {
  expectOnly(vector((v) => { v.cases = [7]; }), /^case 1: a case is an object$/);
  expectOnly(vector((v) => { v.cases[0].tapped = []; delete v.cases[0].joined; }), /^case 1: tapped: no such key$/, /^case 1: joined is missing$/);
  expectOnly(vector((v) => { v.cases[0].description = ""; }), /^case 1: description is a text/);
  expectOnly(vector((v) => { v.cases[0].observations.pop(); }), /^case 1: observations lists 2 observations: two readers of one provider read the work/);
  expectOnly(vector((v) => { v.cases[0].valid = [true, "yes"]; }), /^case 1: valid is two of true and false/);
});

test("an observation reads as the package's message, written with the protobuf names and every field", () => {
  expectOnly(vector((v) => { v.cases[0].observations[0].note = "x"; }), /^case 1: observation 1 does not read as novatrail\.observation\.v1\.Observation: .*"note" is unknown/);
  expectOnly(vector((v) => { v.cases[0].observations[1] = { answerSlots: [value(1, 1, "8")] }; }), /^case 1: observation 2 is not as a writer writes it, with the protobuf names and every field/);
  expectOnly(vector((v) => { v.cases[0].observations[1] = observation({ answer_slot: { item: 1 }, value: "8" }); }), /^case 1: observation 2 is not as a writer writes it/);
});

test("whether an observation is valid is computed, and one that is not breaks one condition alone", () => {
  expectOnly(vector((v) => { v.cases[0].valid = [true, false]; }), /^case 1: observation 2 is valid, and valid says false$/);
  expectOnly(
    vector((v) => { v.cases[0].observations[0] = observation(value(1, 1, "8", box(0, 0, 10, 10))); v.cases[0].valid = [true, true]; }),
    /^case 1: observation 1 is not valid — 1\.1: a crop_box only in a slot bound anywhere, and this one is bound box —, and valid says true/,
    /^case 1: an observation is not valid, so there is no joined one: joined is null/,
  );
  expectOnly(
    vector((v) => { v.cases[0].observations[0] = observation(value(1, 1, ""), value(1, 2, "9")); v.cases[0].valid = [false, true]; v.cases[0].joined = null; v.cases[0].verdicts[0].answer_slots[0] = { verdict: "unchecked" }; v.cases[0].verdicts[0].verdict = "unchecked"; }),
    /^case 1: observation 1 breaks 2 conditions of validity .*, and one that is not valid breaks one, so that it shows which/,
  );
});

test("the conditions of validity, one by one", () => {
  const anywhere = [{ item: 1, slot: 1, at: { binding: "anywhere" } }];
  const zone = [{ item: 1, slot: 1, at: { binding: "zone" } }];
  const sheet = [{ item: 1, slot: 1, at: { binding: "sheet" } }];
  const reasons = known.reasons;
  const only = (found, pattern) => {
    assert.equal(found.length, 1, found.join("\n"));
    assert.match(found[0], pattern);
  };
  assert.deepEqual(breaches(observation(value(1, 1, "7", box(0, 0, 1000, 1000))), anywhere, reasons), []);
  only(breaches(observation(), anywhere, reasons), /holds the answer slots none, and AI reads 1\.1, each once and in order, and no other/);
  only(breaches(observation(value(1, 1, " ")), anywhere, reasons), /empty or only white space/);
  only(breaches(observation(value(1, 1, "7", box(5, 0, 5, 10))), anywhere, reasons), /is not whole thousandths from 0 to 1000 with ymin < ymax and xmin < xmax/);
  only(breaches(observation(value(1, 1, "7", box(-1, 0, 5, 10))), anywhere, reasons), /not whole thousandths/);
  only(breaches(observation({ answer_slot: at(1, 1), unreadable: "UNREADABLE_UNSPECIFIED" }), anywhere, reasons), /its reason is UNREADABLE_UNSPECIFIED/);
  only(breaches(observation({ answer_slot: at(1, 1), unreadable: 1000 }), anywhere, reasons), /its reason 1000 is none that the package knows/);
  only(breaches(observation({ ...reason(1, 1, "BLANK"), crop_box: box(0, 0, 10, 10) }), anywhere, reasons), /a crop_box stands only beside a value/);
  only(breaches(observation(reason(1, 1, "SEVERAL_FINAL_ANSWERS")), zone, reasons), /only in a slot bound anywhere, and this one is bound zone/);
  only(breaches(observation(reason(1, 1, "AMBIGUOUS")), sheet, reasons), /a slot bound sheet gives a value, UNREADABLE_BLANK or UNREADABLE_ILLEGIBLE, not UNREADABLE_AMBIGUOUS/);
  only(breaches(observation(value(1, 1, "text", box(0, 0, 10, 10))), sheet, reasons), /a slot bound sheet has no crop_box/);
  only(breaches(observation({ answer_slot: at(1, 1) }), anywhere, reasons), /neither a value nor a reason/);
  // A slot in no place of the task is found by its place alone: its binding is not known.
  only(breaches(observation(value(1, 1, "7"), reason(2, 1, "NO_FINAL_ANSWER")), anywhere, reasons), /holds the answer slots 1\.1, 2\.1/);
});

test("two observations join answer slot by answer slot", () => {
  const places = [{ item: 1, slot: 1, at: { binding: "anywhere", check: { kind: "number", key: "7", units: ["rungs"] } } }];
  const joined = (a, b) => join(observation(a), observation(b), places).answer_slots[0];
  assert.deepEqual(joined(value(1, 1, "7 rungs"), value(1, 1, "7", box(1, 1, 2, 2))), value(1, 1, "7 rungs", box(1, 1, 2, 2)));
  assert.deepEqual(joined(value(1, 1, "7", box(3, 3, 4, 4)), value(1, 1, "7", box(1, 1, 2, 2))), value(1, 1, "7", box(3, 3, 4, 4)));
  assert.deepEqual(joined(value(1, 1, "=", box(3, 3, 4, 4)), reason(1, 1, "BLANK")), reason(1, 1, "BLANK"));
  assert.deepEqual(joined(reason(1, 1, "ILLEGIBLE"), reason(1, 1, "BLANK")), reason(1, 1, "AMBIGUOUS"));
  assert.deepEqual(joined(value(1, 1, "7"), reason(1, 1, "BLANK")), reason(1, 1, "AMBIGUOUS"));
});

test("a case joins as section 10 joins, or has no joined observation when one is not valid", () => {
  const notValid = (v) => { v.cases[0].observations[1] = observation(value(1, 1, "")); v.cases[0].valid = [true, false]; };
  expectOnly(vector((v) => { v.cases[0].joined = null; }), /^case 1: the observations join into \{"answer_slots":\[\{"answer_slot":\{"item":1,"slot":1\},"value":"8"\}\]\}, not null/);
  expectOnly(vector((v) => { v.cases[0].joined = observation(value(1, 1, "8.")); }), /^case 1: the observations join into \{"answer_slots"/);
  expectOnly(vector((v) => { notValid(v); }), /^case 1: an observation is not valid, so there is no joined one: joined is null/);
  expectOnly(vector((v) => { v.cases[0].joined = { answer_slots: "8" }; }), /^case 1: joined does not read as novatrail\.observation\.v1\.Observation/);
  expectOnly(vector((v) => { notValid(v); v.cases[0].joined = null; }), /^case 1: answer slot 1\.1 gets \{"verdict":"unchecked"\}, not \{"verdict":"correct"\}/);
});

test("the verdicts of a case: their shape, each answer slot's and each item's", () => {
  expectOnly(vector((v) => { v.cases[0].verdicts = []; }), /^case 1: verdicts lists 1 item, each with its answer slots' verdicts and its own/);
  expectOnly(vector((v) => { v.cases[0].verdicts[0].answer_slots = []; }), /^case 1: the verdicts of item 1 are \{ answer_slots, verdict \}, with 1 answer slot/);
  expectOnly(vector((v) => { v.cases[0].verdicts[0].answer_slots[0] = { verdict: "right" }; }), /^case 1: the verdict of answer slot 1\.1 is \{ verdict, reason, trap \}/);
  expectOnly(vector((v) => { v.cases[0].verdicts[0].answer_slots[0] = { verdict: "correct", trap: "x" }; }), /^case 1: answer slot 1\.1 gets \{"verdict":"correct"\}, not \{"verdict":"correct","trap":"x"\}/);
  expectOnly(vector((v) => { v.cases[0].verdicts[0].verdict = "not_yet"; }), /^case 1: the answer slots of item 1 make it correct, not not_yet/);
});

test("a predicate's verdict on a value in notation is the vector's, among those Starlark gives", () => {
  const predicate = (verdict) => vector((v) => {
    v.items[0].line[1].check = { kind: "predicate", predicate: "value % 4 == 0" };
    v.cases[0].verdicts[0] = { answer_slots: [verdict], verdict: verdict.verdict };
  });
  for (const verdict of ["correct", "not_yet", "unchecked"]) assert.deepEqual(problemsOf(predicate({ verdict })), [], verdict);
  expectOnly(predicate({ verdict: "unreadable", reason: "notation" }), /^case 1: answer slot 1\.1: "8" is in the notation of a predicate, which Starlark gives correct, not_yet or unchecked, with no reason and no trap/);
});

test("an essay has one reader, and its submission ends as its observation gives", () => {
  const essay = (read, submission, valid = [true]) => vector((v) => {
    v.canvas = { kind: "handwriting_sheet" };
    v.items = [{ answer_slots: [{ binding: "sheet", check: { kind: "rubric", criteria: [{ text: "It tells a story." }] } }] }];
    v.cases = [{ description: "An essay.", observations: [observation(read)], valid, submission }];
  });
  assert.deepEqual(problemsOf(essay(value(1, 1, "A story."), "assessment")), []);
  assert.deepEqual(problemsOf(essay(reason(1, 1, "ILLEGIBLE"), "unreadable")), []);
  assert.deepEqual(problemsOf(essay(reason(1, 1, "AMBIGUOUS"), "unchecked", [false])), []);
  expectOnly(essay(reason(1, 1, "BLANK"), "assessment"), /^case 1: the submission ends unreadable, not assessment/);
  expectOnly(essay(value(1, 1, "A story."), "feedback"), /^case 1: submission is one of assessment, unreadable, unchecked/);
  const two = essay(value(1, 1, "A story."), "assessment");
  two.cases[0].observations.push(observation(value(1, 1, "A story.")));
  expectOnly(two, /^case 1: observations lists 1 observation: an essay has one reader/);
  const flags = essay(value(1, 1, "A story."), "assessment", [true, true]);
  expectOnly(flags, /^case 1: valid is true or false, one for each observation/);
});

test("the options tapped: one for each answer slot bound choice, an option as written or null", () => {
  const tapped = (taps) => vector((v) => {
    v.canvas = { kind: "handwriting_sheet" };
    v.items = [{ answer_slots: [{ binding: "zone", zone: { left: 0, top: 0, width: 100, height: 100 }, check: { kind: "number", key: "8" } }, { binding: "choice", options: ["yes", "no"], check: { kind: "choice", key: "yes", trap_values: [{ value: "no", trap: "reversed" }] } }] }];
    v.cases[0].verdicts = [{ answer_slots: [{ verdict: "correct" }, { verdict: "not_yet", trap: "reversed" }], verdict: "not_yet" }];
    if (taps !== undefined) v.cases[0].tapped = taps;
  });
  assert.deepEqual(problemsOf(tapped([{ answer_slot: at(1, 2), value: "no" }])), []);
  expectOnly(tapped(undefined), /^case 1: tapped is missing$/);
  expectOnly(tapped([]), /^case 1: tapped lists none, and the answer slots bound choice are 1\.2/);
  expectOnly(tapped([{ answer_slot: { item: 1, slot: 2, at: 0 }, value: "no" }]), /^case 1: tapped 1 is \{ answer_slot: \{ item, slot \}, value \}/);
  expectOnly(tapped([{ answer_slot: { item: "1", slot: 2 }, value: "no" }]), /^case 1: tapped 1 is \{ answer_slot: \{ item, slot \}, value \}, its place in integers/);
  expectOnly(tapped([{ answer_slot: at(1, 2), value: "No" }]), /^case 1: tapped 1: "No" is none of the options as written, \["yes","no"\]/);
  expectOnly(tapped([{ answer_slot: at(1, 2), value: null }]), /^case 1: answer slot 1\.2 gets \{"verdict":"unreadable","reason":"blank"\}, not \{"verdict":"not_yet","trap":"reversed"\}/);
});
