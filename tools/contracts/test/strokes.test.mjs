// The rules the device and the runner share and their vectors, as tools/contracts/strokes.mjs holds
// them: the rules at their bounds, spec's own vectors, which pass, and each of them in memory with
// one thing broken.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { before, test } from "node:test";
import { root } from "../../release/test/repository.mjs";
import { build } from "../buf.mjs";
import {
  BOX_RULE,
  CROP_RULE,
  FOLDER,
  GROUP_RULE,
  SNAP_RULE,
  VECTOR_FILES,
  boxOf,
  bundlesOf,
  ceilDiv,
  checkVector,
  checkVectors,
  cropSetOf,
  erasedOf,
  floorDiv,
  fold,
  groupsOf,
  heightsOf,
  historyBreaches,
  inkOf,
  labelOf,
  medianOf,
  messagesOf,
  snapOf,
  styleBreaches,
  tableOf,
  tenths,
} from "../strokes.mjs";

// The image of spec's own contracts/ and the messages the vectors hold, built once before the tests.
let image;
let messages;
before(() => {
  const built = build(root);
  assert.deepEqual(built.errors, []);
  image = built.image;
  ({ messages } = messagesOf(image));
  assert.ok(messages);
});
const files = fs.readdirSync(path.join(root, FOLDER)).map((name) => `${FOLDER}/${name}`);

// A vector of spec's own, with only the case of that name, if one is named; edit changes it.
function vector(name, only, edit = () => {}) {
  const made = JSON.parse(fs.readFileSync(path.join(root, FOLDER, name), "utf8"));
  if (only) made.cases = made.cases.filter((one) => one.name === only);
  edit(made, made.cases[0]);
  return made;
}
const bytesOf = (value) => Buffer.from(typeof value === "string" ? value : JSON.stringify(value, null, 2));
const problemsOf = (name, value) => checkVector(bytesOf(value), name, messages).problems.map((problem) => problem.message);

// Every problem matches one of the patterns, and every pattern one of the problems.
function expectOnly(name, value, ...patterns) {
  const problems = problemsOf(name, value);
  for (const problem of problems) assert.ok(patterns.some((pattern) => pattern.test(problem)), `unexpected: ${problem}\nall:\n${problems.join("\n")}`);
  for (const pattern of patterns) assert.ok(problems.some((problem) => pattern.test(problem)), `missing: ${pattern}\nall:\n${problems.join("\n")}`);
}

// A stroke from (x0, y0) to (x1, y1), its points at its two ends, written from t0 to t1 ms.
const stroke = (id, x0, y0, x1, y1, t0 = 0, t1 = t0) => ({ id, pointer: "pen", points: [{ x: x0, y: y0, t_ms: t0 }, { x: x1, y: y1, t_ms: t1 }] });
const write = (one) => ({ t_ms: one.points.at(-1).t_ms, write: one });

test("spec's own vectors pass, and together hold every rule", () => {
  assert.deepEqual(files.map((file) => path.posix.basename(file)).sort(), [...VECTOR_FILES].sort());
  const { errors, cases } = checkVectors(root, image, files);
  assert.deepEqual(errors, []);
  assert.equal(cases, 88);
});

test("what the vectors lack together is found, once each holds", () => {
  const { errors } = checkVectors(root, image, [`${FOLDER}/groups.json`]);
  const messages = errors.map((error) => error.message);
  for (const name of ["crops.json", "snaps.json", "boxes.json"]) assert.ok(errors.some((error) => error.file === `${FOLDER}/${name}` && /^the file is missing/.test(error.message)), name);
  for (const text of ["no bundle", "h_med above the ceiling", "a height drawn below the height asked for", "strokes with a style", "a margin wider than the rule's", "a box of a model that takes strokes", "a box of a model that takes none", "a stroke of the draft", "a filled box"]) assert.ok(messages.some((message) => message.includes(text)), text);
  assert.ok(!messages.some((message) => /history with|taken off/.test(message)), "groups.json holds the history's rules");
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "strokes-"));
  try {
    fs.mkdirSync(path.join(folder, FOLDER), { recursive: true });
    fs.writeFileSync(path.join(folder, FOLDER, "groups.json"), JSON.stringify(vector("groups.json", "later")));
    const lacking = checkVectors(folder, image, [`${FOLDER}/groups.json`]).errors.map((error) => error.message);
    for (const text of ["a history with erase", "a history with clear", "a history with cut", "a history with undo", "that is in no group", "that is in two groups"]) assert.ok(lacking.some((message) => message.includes(text)), text);
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});

test("a vector with a problem leaves the coverage unsaid, and names its file and line", () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "strokes-"));
  try {
    fs.mkdirSync(path.join(folder, FOLDER), { recursive: true });
    fs.writeFileSync(path.join(folder, FOLDER, "boxes.json"), "[]");
    fs.writeFileSync(path.join(folder, FOLDER, "lines.json"), "{}");
    const { errors } = checkVectors(folder, image, [`${FOLDER}/boxes.json`, `${FOLDER}/lines.json`]);
    assert.deepEqual(errors, [
      { file: `${FOLDER}/boxes.json`, line: 1, message: "a vector is an object: description, rule and cases" },
      { file: `${FOLDER}/lines.json`, line: 0, message: "the rules the device and the runner share in contracts/README.md have no vector lines.json: their vectors are groups.json, crops.json, snaps.json, boxes.json" },
    ]);
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
  const text = JSON.stringify(vector("boxes.json", "across"), null, 2).replace('"stroke_id": 2', '"stroke_id": 9');
  const [problem] = checkVector(Buffer.from(text), "boxes.json", messages).problems;
  assert.equal(problem.line, text.split("\n").findIndex((line) => line.includes('"stroke_id": 9')) + 1);
});

test("the messages are read from the image", () => {
  assert.match(messagesOf({ file: [] }).error, /^the image of buf build has no novatrail\.eval\.v1\.History, which the vectors of the rules hold$/);
  assert.match(checkVectors(root, { file: [] }, files).errors[0].message, /has no novatrail\.eval\.v1\.History/);
});

test("a vector's file, keys, rule and cases", () => {
  assert.match(problemsOf("groups.json", "{")[0], /^not JSON/);
  expectOnly("groups.json", vector("groups.json", null, (v) => { v.notes = ""; delete v.rule; }), /^notes: no such key$/, /^rule is missing$/);
  expectOnly("groups.json", vector("groups.json", null, (v) => { v.description = " "; v.rule = { ...v.rule, pause: 2500 }; v.cases = []; }), /^description is a text/, /^the rule is \{"pause":2500,"across":50,"down":50\}, and the rules the device and the runner share in contracts\/README\.md give \{"pause":2000,"across":50,"down":50\}$/, /^cases lists the cases, one at least$/);
  expectOnly("groups.json", vector("groups.json", "later", (v) => v.cases.push("case")), /^case 2: a case is an object$/);
  expectOnly("groups.json", vector("groups.json", "later", (v, c) => { delete c.erased; c.notes = ""; }), /^later: notes: no such key$/, /^later: erased is missing$/);
  expectOnly("groups.json", vector("groups.json", "later", (v, c) => { c.name = "Later"; c.description = ""; }), /^Later: name is lowercase Latin letters and digits/, /^Later: description is a text/);
  expectOnly("groups.json", vector("groups.json", "later", (v) => v.cases.push(structuredClone(v.cases[0]))), /^later: another case has this name$/);
});

test("groups.json: the fold of the history, the neighbours, the groups, their boxes and the groups of a stroke taken off", () => {
  const undone = (edit) => vector("groups.json", "undone", (v, c) => edit(c));
  expectOnly("groups.json", undone((c) => (c.visible = [1, 2])), /^undone: visible is \[1,2\], and the fold of the history gives \[1,2,3\]$/);
  expectOnly("groups.json", undone((c) => (c.neighbours = [])), /^undone: neighbours is \[\], and the rule of groups gives \[\[1,2\]\]$/);
  expectOnly("groups.json", undone((c) => (c.groups[1].label = "C")), /^undone: groups\.1\.label is "C", and the rule of groups gives "B"$/);
  expectOnly("groups.json", undone((c) => (c.group_boxes[0].xmax += 1)), /^undone: group_boxes\.0\.xmax is 1461, and the rule of groups gives 1460$/);
  expectOnly("groups.json", vector("groups.json", "erased-between", (v, c) => (c.erased[0].labels = ["A"])), /^erased-between: erased\.0\.labels is \["A"\], and the rule of the groups of a stroke taken off gives \["A","B"\]$/);
  expectOnly("groups.json", undone((c) => (c.history.events[2].erase.ids = [1, 9])), /^undone: erase takes off the stroke 9, which the sheet does not show then$/, /^undone: the undo puts back the stroke 2, which is on the sheet already$/);
  expectOnly("groups.json", undone((c) => (c.history.events[0].write.points[0].y = 1400.5)), /^undone: y is 1400\.5, off the sheet, from 0 to 1400$/);
  expectOnly("groups.json", undone((c) => {
    const [first] = c.history.events;
    first.tMs = first.t_ms;
    delete first.t_ms;
  }), /^undone: it is not as a writer writes novatrail\.eval\.v1\.History/);
  expectOnly("groups.json", undone((c) => (c.history.events[0].when = 1)), /^undone: it does not read as novatrail\.eval\.v1\.History/);
  expectOnly("groups.json", undone((c) => (c.groups = {})), /^undone: groups is a list of Group$/);
  expectOnly("groups.json", undone((c) => (c.group_boxes = [{ ymin: 1 }])), /^undone: it is not as a writer writes novatrail\.eval\.v1\.TenthsBox/);
});

test("crops.json: the strokes and groups, the bundles and the numbers of the crops", () => {
  const dot = (edit) => vector("crops.json", "dot", (v, c) => edit(c));
  expectOnly("crops.json", dot((c) => (c.bundles = [[1]])), /^dot: bundles\.0 is \[1\], and the rule of bundles gives undefined$/);
  expectOnly("crops.json", dot((c) => (c.crops.crops[0].width = 201)), /^dot: crops\.crops\.0\.width is 201, and the rule of the crop gives 200$/);
  expectOnly("crops.json", dot((c) => (c.crops.bundle_median = 160)), /^dot: crops\.bundle_median is 160, and the rule of the crop gives 150$/);
  expectOnly("crops.json", dot((c) => (c.crops.crops[0].png = "iVBORw0KGgo=")), /^dot: png is empty: the vectors hold no pixels$/);
  expectOnly("crops.json", dot((c) => (c.digit_height = 0)), /^dot: digit_height is 0, a whole number of px from 1 to 256$/);
  expectOnly("crops.json", dot((c) => c.strokes.push(structuredClone(c.strokes[0]))), /^dot: the stroke's ID is 1: IDs count from 1, each once$/);
  expectOnly("crops.json", dot((c) => (c.strokes[0].points = [])), /^dot: the stroke 1 has no point$/);
  expectOnly("crops.json", dot((c) => (c.groups[0].label = "B")), /^dot: group 1 is labelled "B", and the labels go A, B and on: "A"$/);
  expectOnly("crops.json", dot((c) => (c.groups[0].stroke_ids = [1, 2])), /^dot: a group names the stroke 2, which the case does not have$/);
  expectOnly("crops.json", dot((c) => (c.groups[0].stroke_ids = [])), /^dot: the group A names \[\]: one stroke at least, ascending, each once$/, /^dot: the stroke 1 is in 0 groups, and each stroke is in one$/);
  expectOnly("crops.json", dot((c) => (c.crops = { inkBox: c.crops.ink_box })), /^dot: it is not as a writer writes novatrail\.eval\.v1\.CropSet/);
  expectOnly("crops.json", dot((c) => (c.strokes = "dot")), /^dot: strokes is a list of FinalStroke$/);
});

test("snaps.json: the crops of the submission and the strokes each box of a model takes", () => {
  const answer = (edit) => vector("snaps.json", "answer", (v, c) => edit(c));
  expectOnly("snaps.json", answer((c) => (c.snaps[0].stroke_ids = [1])), /^answer: snaps\.0\.stroke_ids is \[1\], and the rule of snapping gives \[1,2\]$/);
  expectOnly("snaps.json", answer((c) => (c.snaps[0].snapped = null)), /^answer: snaps\.0\.snapped is null, and the rule of snapping gives \{/);
  expectOnly("snaps.json", answer((c) => (c.snaps[3].snapped = { ymin: 0, xmin: 0, ymax: 0, xmax: 0 })), /^answer: snaps\.3\.snapped is \{"ymin":0,"xmin":0,"ymax":0,"xmax":0\}, and the rule of snapping gives null$/);
  expectOnly("snaps.json", answer((c) => (c.snaps[0].digit_height = 20)), /^answer: snap 1 is on the crop at 20 px, which the crops do not have$/);
  expectOnly("snaps.json", answer((c) => (c.snaps[0].stroke_ids = ["1"])), /^answer: snap 1: stroke_ids lists IDs of strokes$/);
  expectOnly("snaps.json", answer((c) => (c.snaps[0] = { box: c.snaps[0].box })), /^answer: snap 1: digit_height is missing$/, /^answer: snap 1: stroke_ids is missing$/, /^answer: snap 1: snapped is missing$/);
  expectOnly("snaps.json", answer((c) => (c.snaps[0] = 1)), /^answer: snap 1: a snap is an object$/);
  expectOnly("snaps.json", answer((c) => (c.snaps[0].box = { y_min: 1 })), /^answer: it does not read as novatrail\.observation\.v1\.CropBox/);
  expectOnly("snaps.json", answer((c) => (c.snaps = [])), /^answer: snaps lists the boxes of a model, one at least$/);
  expectOnly("snaps.json", answer((c) => (c.crops.crops[0].png = "iVBORw0KGgo=")), /^answer: png is empty: the vectors hold no pixels$/);
  expectOnly("snaps.json", answer((c) => (c.crops.crops[1].margin_left += 1)), /^answer: crops\.crops\.1\.margin_left is \d+, and the rule of the crop gives \d+$/);
  expectOnly("snaps.json", answer((c) => (c.digit_height = 300)), /^answer: digit_height is 300/);
  expectOnly("snaps.json", answer((c) => (c.groups = [])), /^answer: the stroke 1 is in 0 groups/, /^answer: the stroke 2 is in 0 groups/);
});

test("boxes.json: the page's boxes, each stroke's box and the filled boxes", () => {
  const across = (edit) => vector("boxes.json", "across", (v, c) => edit(c));
  expectOnly("boxes.json", across((c) => (c.verdicts[0].answer_slot = { item: 1, slot: 1 })), /^across: verdicts\.0\.answer_slot is \{"item":1,"slot":1\}, and the rule of boxes gives null$/);
  expectOnly("boxes.json", across((c) => (c.filled_boxes[0].stroke_ids = [1, 2])), /^across: filled_boxes\.0\.stroke_ids\.0 is 1, and the rule of boxes gives 2$/);
  expectOnly("boxes.json", across((c) => c.boxes.reverse()), /the box is at \{"item":1,"slot":\d\}: an item and a slot, each from 1, in the task's order, each once$/);
  expectOnly("boxes.json", across((c) => (c.boxes[0].answer_slot.item = 0)), /^across: the box is at \{"item":0,"slot":1\}/);
  expectOnly("boxes.json", across((c) => (c.boxes[0].left = 950)), /^across: the box at 950, 40, 100 × 100 is not on the page, 1000 × 1400/);
  expectOnly("boxes.json", across((c) => (c.verdicts = {})), /^across: verdicts lists each stroke's box$/);
  expectOnly("boxes.json", across((c) => (c.verdicts[1] = { stroke_id: 2 })), /^across: verdict 2: answer_slot is missing$/);
  expectOnly("boxes.json", across((c) => (c.verdicts[1] = null)), /^across: verdict 2: a verdict is an object$/);
  expectOnly("boxes.json", across((c) => (c.verdicts[1].answer_slot = { place: 1 })), /^across: it does not read as novatrail\.observation\.v1\.AnswerSlotPlace/);
  expectOnly("boxes.json", across((c) => (c.filled_boxes = [{ answer_slot: { item: 1, slot: 2 }, stroke_ids: [2], crops: null }])), /^across: it is not as a writer writes novatrail\.eval\.v1\.FilledBox|^across: filled_boxes\.1 is undefined/);
});

test("the fold of a history only adds and takes off IDs", () => {
  const history = [write(stroke(1, 100, 100, 100, 200, 0, 100)), write(stroke(2, 120, 100, 120, 200, 200, 300)), { t_ms: 400, clear: { ids: [1, 2] } }, { t_ms: 500, undo: { removed: [], restored: [1, 2] } }, { t_ms: 600, erase: { ids: [2] } }, { t_ms: 700, undo: { removed: [], restored: [2] } }, { t_ms: 800, undo: { removed: [2], restored: [] } }];
  const { written, visible } = fold(history);
  assert.deepEqual([...written.keys()], [1, 2]);
  assert.deepEqual(visible, [1]);
});

test("a cut takes off the strokes it names and adds its pieces, and an undo of it takes them back", () => {
  const line = { id: 1, pointer: "pen", points: [{ x: 100, y: 100, t_ms: 0 }, { x: 150, y: 100, t_ms: 50 }, { x: 200, y: 100, t_ms: 100 }] };
  const piece = { id: 2, pointer: "pen", points: [{ x: 100, y: 100, t_ms: 0 }, { x: 140, y: 100, t_ms: 40 }] };
  const cut = { t_ms: 300, cut: { ids: [1], pieces: [{ of: 1, stroke: piece }] } };
  const { written, visible } = fold([write(line), cut]);
  assert.deepEqual([...written.keys()], [1, 2]);
  assert.deepEqual(visible, [2]);
  assert.deepEqual(fold([write(line), cut, { t_ms: 400, undo: { removed: [2], restored: [1] } }]).visible, [1]);
  assert.deepEqual(erasedOf({ events: [write(line), cut] }), [{ stroke_id: 1, labels: ["A"] }]);
});

test("a history's cuts and styles: each piece a new stroke of one cut off, with its pointer, its style and a run of its points", () => {
  const style = { pen: "PEN_KIND_LINER", color: "#0a63d6", width: 1.2, opacity: 100 };
  const line = { id: 1, pointer: "pen", style, points: [{ x: 100, y: 100, t_ms: 0 }, { x: 150, y: 100, t_ms: 50 }, { x: 200, y: 100, t_ms: 100 }, { x: 250, y: 100, t_ms: 150 }] };
  const other = { ...stroke(2, 300, 100, 300, 200, 200, 300), style: { ...style } };
  const left = { id: 3, pointer: "pen", style, points: [{ x: 100, y: 100, t_ms: 0 }, { x: 150, y: 100, t_ms: 50 }, { x: 170, y: 100, t_ms: 70 }] };
  const right = { id: 4, pointer: "pen", style, points: [{ x: 230, y: 100, t_ms: 130 }, { x: 250, y: 100, t_ms: 150 }] };
  const history = (edit = () => {}) => {
    const events = structuredClone([write(line), write(other), { t_ms: 500, cut: { ids: [1], pieces: [{ of: 1, stroke: left }, { of: 1, stroke: right }] } }]);
    edit(events, events[2].cut);
    return events;
  };
  const problems = (events) => {
    const found = [];
    const visible = historyBreaches(events, (at, message) => found.push(message), () => {});
    return { found, visible: [...visible].sort((a, b) => a - b) };
  };
  assert.deepEqual(problems(history()), { found: [], visible: [2, 3, 4] });
  // A piece of one point, its own, inside the stroke's times; a cut of a stroke it covers whole, with no piece.
  assert.deepEqual(problems(history((e, cut) => (cut.pieces = [{ of: 1, stroke: { ...left, points: [{ x: 120, y: 100, t_ms: 20 }] } }]))).found, []);
  assert.deepEqual(problems(history((e, cut) => (cut.pieces = []))), { found: [], visible: [2] });
  const only = (edit, pattern) => {
    const { found } = problems(history(edit));
    assert.equal(found.length, 1, found.join("\n"));
    assert.match(found[0], pattern);
  };
  only((e, cut) => (cut.ids = []) && (cut.pieces = []), /^the cut takes no stroke off$/);
  only((e, cut) => (cut.ids = [1, 1]), /^cut names a stroke twice$/);
  only((e, cut) => (cut.ids = [1, 9]), /^cut takes off the stroke 9, which the sheet does not show then$/);
  only((e, cut) => (cut.pieces[1].of = 2), /^the piece is of the stroke 2, which the cut does not take off$/);
  only((e, cut) => (cut.ids = [1, 2]) && (cut.pieces = [{ of: 2, stroke: { ...other, id: 5 } }, cut.pieces[0]]), /^the piece of the stroke 1 comes after a piece of a stroke later in ids/);
  only((e, cut) => (cut.pieces[1].stroke.id = 2), /^the stroke 2 is written twice$/);
  only((e, cut) => (cut.pieces[1].stroke.pointer = "touch"), /^the piece 4 names the pointer "touch", and the stroke 1 it was cut of "pen"$/);
  only((e, cut) => delete cut.pieces[1].stroke.style, /^the piece 4 has the style null, and the stroke 1 it was cut of \{/);
  only((e, cut) => (cut.pieces[0].stroke.points = [left.points[0], { x: 150, y: 101, t_ms: 50 }, left.points[2]]), /^the piece 3 is no run of the points of the stroke 1/);
  only((e, cut) => (cut.pieces[0].stroke.points = [left.points[0], line.points[1], line.points[3], { x: 250, y: 100, t_ms: 150 }]), /^the piece 3 is no run of the points of the stroke 1/);
  only((e, cut) => (cut.pieces[1].stroke.points[1] = { x: 260, y: 100, t_ms: 160 }), /^the piece 4 ends at 160 ms, outside the times of the stroke 1, 0 to 150 ms$/);
  only((e, cut) => (cut.pieces[1] = { of: 1 }), /^the piece holds no stroke$/);
  only((e) => (e[1].write.style.color = "#0A63D6"), /^the colour "#0A63D6" is not # and six lowercase hexadecimal digits$/);
  only((e) => (e[1] = { t_ms: 500, write: { ...other, style: { ...style, opacity: 5 } } }), /^the opacity is 5, and a stroke's is whole percent from 10 to 100$/);
  assert.match(problems(history((e) => (e[2] = { t_ms: 500 }))).found[0], /^the event is none of write, erase, clear, cut and undo$/);
});

test("a stroke's style: a kind of pen, a colour of sRGB, a width to a tenth from 0.1 to 50 and an opacity from 10 to 100", () => {
  const found = (style) => {
    const all = [];
    styleBreaches({ pen: "PEN_KIND_PEN", color: "#000000", width: 2, opacity: 100, ...style }, ["style"], (at, message) => all.push([at.join("."), message]));
    return all.map(([at]) => at);
  };
  for (const ok of [{ width: 0.1 }, { width: 50 }, { opacity: 10 }, { pen: "PEN_KIND_MARKER" }, { color: "#ffcc00" }]) assert.deepEqual(found(ok), [], JSON.stringify(ok));
  assert.deepEqual(found({ pen: "PEN_KIND_UNSPECIFIED" }), ["style.pen"]);
  assert.deepEqual(found({ color: "red" }), ["style.color"]);
  for (const width of [0, 0.05, 50.1, 1.25, Infinity]) assert.deepEqual(found({ width }), ["style.width"], String(width));
  for (const opacity of [9, 101, 50.5]) assert.deepEqual(found({ opacity }), ["style.opacity"], String(opacity));
});

test("the groups at their bounds: the pause, the gap, and the order of the labels", () => {
  // 2000 ms apart and 50 units apart are neighbours; a millisecond or a tenth more is not.
  const pair = (gap, pause) => groupsOf([stroke(1, 100, 100, 100, 200, 0, 100), stroke(2, 100 + gap, 100, 100 + gap, 200, 100 + pause, 200 + pause)]).groups.length;
  assert.equal(pair(50, 2000), 1);
  assert.equal(pair(50.1, 2000), 2);
  assert.equal(pair(50, 2001), 2);
  // Overlapping in time, the pause is 0.
  assert.equal(groupsOf([stroke(1, 100, 100, 100, 200, 0, 5000), stroke(2, 140, 100, 140, 200, 1000, 1200)]).groups.length, 1);
  // Two groups of one box: the earlier start first, and of one start the lesser ID.
  const twins = (t1, t2) => groupsOf([stroke(2, 500, 500, 500, 600, t1), stroke(1, 500, 500, 500, 600, t2)], { ...GROUP_RULE, pause: 0 }).groups.map((group) => group.stroke_ids[0]);
  assert.deepEqual(twins(0, 100), [2, 1]);
  assert.deepEqual(twins(100, 0), [1, 2]);
  assert.deepEqual(twins(0, 0), [1]);
  assert.deepEqual(groupsOf([stroke(2, 500, 500, 500, 600, 0), stroke(1, 500, 500, 500, 600, 5000)]).groups.map((group) => group.stroke_ids), [[2], [1]]);
  assert.deepEqual(groupsOf([stroke(1, 500, 500, 500, 600, 5000), stroke(2, 500, 500, 500, 600, 5000)]).groups.map((group) => group.label), ["A"]);
  assert.deepEqual([labelOf(0), labelOf(25), labelOf(26), labelOf(701), labelOf(702)], ["A", "Z", "AA", "ZZ", "AAA"]);
  assert.equal(tenths(100.05), 1001);
  assert.equal(tenths(0.04), 0);
});

test("a stroke taken off is in the groups of the shown strokes it would neighbour", () => {
  const history = { events: [write(stroke(1, 100, 100, 100, 200, 0, 100)), write(stroke(2, 200, 100, 200, 200, 200, 300)), write(stroke(3, 140, 150, 160, 150, 400, 500)), write(stroke(4, 900, 1300, 950, 1350, 600, 700)), { t_ms: 800, erase: { ids: [3, 4] } }] };
  assert.deepEqual(erasedOf(history), [{ stroke_id: 3, labels: ["A", "B"] }, { stroke_id: 4, labels: [] }]);
});

test("the crop at its bounds: lines, the lower median, the ceiling, the least size and the limits", () => {
  const plain = (id, x, y0, y1) => ({ id, points: [{ x, y: y0 }, { x, y: y1 }] });
  // A stroke 15 units tall is in a bundle, one 14.9 tall is a line; strokes whose boxes touch join.
  assert.deepEqual(bundlesOf([plain(1, 100, 100, 115), plain(2, 300, 100, 114.9)]).map((bundle) => bundle.ids), [[1]]);
  assert.deepEqual(bundlesOf([plain(2, 100, 100, 130), plain(1, 100, 130, 160), plain(3, 300, 100, 130)]).map((bundle) => [bundle.ids, bundle.height]), [[[1, 2], 600], [[3], 300]]);
  assert.equal(medianOf([]), 150);
  assert.equal(medianOf([{ height: 400 }, { height: 200 }, { height: 300 }, { height: 100 }]), 200);
  assert.equal(cropSetOf([], [], 24), null);
  assert.deepEqual(heightsOf(20), [16, 20, 24, 32, 48]);
  assert.deepEqual(heightsOf(24, CROP_RULE), [16, 24, 32, 48]);
  // A tall bundle: h_med above 100 units, and the scale takes 100.
  const tall = cropSetOf([plain(1, 500, 100, 300)], [{ label: "A", stroke_ids: [1] }], 48);
  assert.equal(tall.bundle_median, 2000);
  assert.equal(tall.crops.at(-1).scale, (10 * 48) / 1000);
  // Strokes from corner to corner of the sheet at the height of a digit: drawn smaller to fit.
  const wide = cropSetOf([plain(1, 0, 0, 15), plain(2, 1000, 1385, 1400)], [{ label: "A", stroke_ids: [1, 2] }], 48);
  for (const crop of wide.crops) assert.ok(Math.max(crop.width, crop.height) <= 1568 && ceilDiv(crop.width, 28) * ceilDiv(crop.height, 28) <= 1568, `${crop.digit_height}`);
  assert.ok(wide.crops.every((crop) => crop.drawn_height < crop.digit_height));
  assert.deepEqual([floorDiv(7, 2), ceilDiv(7, 2), floorDiv(-7, 2), ceilDiv(-7, 2), floorDiv(8, 2)], [3, 4, -4, -3, 4]);
});

test("the crop of strokes with a style: each line its width at the crop's scale and 1 px at least, the margin and the frames as wide as they need", () => {
  const styled = (id, x, width) => ({ id, points: [{ x, y: 100 }, { x, y: 136 }], style: { pen: "PEN_KIND_LINER", color: "#000000", width, opacity: 100 } });
  const bare = (id, x) => ({ id, points: [{ x, y: 100 }, { x, y: 136 }] });
  // Without a style the line is max(D′, 12) / 12 px, as before styles.
  assert.equal(inkOf(null, 24, 360) / (12 * 360), 2);
  assert.equal(inkOf(null, 6, 360) / (12 * 360), 1);
  // With one, its width at the crop's scale — 3.6 units at 10 × 24 / 360 px a unit is 2.4 px —, and 1 px at least.
  assert.equal(inkOf(36, 24, 360) / (12 * 360), 2.4);
  assert.equal(inkOf(1, 24, 360) / (12 * 360), 1);
  const groups = [{ label: "A", stroke_ids: [1] }, { label: "B", stroke_ids: [2] }];
  const plain = cropSetOf([bare(1, 100), bare(2, 300)], groups, 24);
  const thin = cropSetOf([styled(1, 100, 0.1), styled(2, 300, 0.1)], groups, 24);
  // A thin line's frame and margins are those of a line of 1 px, and the bare strokes' those of before.
  assert.deepEqual(plain.crops.map((crop) => crop.margin_left), thin.crops.map((crop) => crop.margin_left));
  assert.deepEqual(thin.crops.map((crop) => crop.line_width), [1, 1, 1, 1]);
  // One wide line widens its own frame and every margin, and the crop's line is the widest.
  const mixed = cropSetOf([bare(1, 100), styled(2, 300, 50)], groups, 24);
  const at48 = mixed.crops.at(-1);
  assert.equal(at48.line_width, inkOf(500, 48, 360) / (12 * 360));
  assert.equal(at48.margin_top, ceilDiv(inkOf(500, 48, 360), 24 * 360) + 1 + Math.floor((at48.height - (ceilDiv(360 * 48, 360) + 2 * (ceilDiv(inkOf(500, 48, 360), 24 * 360) + 1))) / 2));
  const [a, b] = at48.frames.map((frame) => frame.box);
  const alone = cropSetOf([bare(1, 100), bare(2, 300)], groups, 24).crops.at(-1).frames.map((frame) => frame.box);
  assert.ok(b.ymax - b.ymin > alone[1].ymax - alone[1].ymin, "the wide line's frame is wider");
  assert.ok(a.ymax - a.ymin < b.ymax - b.ymin, "the bare stroke's frame holds its own line alone");
});

test("snapping takes a stroke with two thirds of its points in the box widened, and no fewer", () => {
  const points = (n, x) => Array.from({ length: n }, (_, i) => ({ x: x + i, y: 500 }));
  const strokes = [{ id: 1, points: [...points(2, 100), { x: 900, y: 1300 }] }, { id: 2, points: [...points(1, 103), { x: 900, y: 1300 }, { x: 901, y: 1300 }] }];
  const set = cropSetOf(strokes, [{ label: "A", stroke_ids: [1, 2] }], 24);
  const crop = set.crops[0];
  // A box of the crop's corner by the points at 100–103 across and 500 down.
  const X = (x) => Math.floor((1000 * ((tenths(x) - set.ink_box.xmin) * crop.drawn_height + crop.margin_left * Math.min(set.bundle_median, 1000))) / (crop.width * Math.min(set.bundle_median, 1000)));
  const Y = (y) => Math.floor((1000 * ((tenths(y) - set.ink_box.ymin) * crop.drawn_height + crop.margin_top * Math.min(set.bundle_median, 1000))) / (crop.height * Math.min(set.bundle_median, 1000)));
  const box = { ymin: Y(500), xmin: X(100), ymax: Y(500) + 1, xmax: X(103) + 1 };
  assert.deepEqual(snapOf(set, crop, box, strokes).stroke_ids, [1]);
  assert.deepEqual(snapOf(set, crop, box, strokes, { ...SNAP_RULE, share: [1, 3] }).stroke_ids, [1, 2]);
  assert.deepEqual(snapOf(set, crop, { ymin: 0, xmin: 0, ymax: 1, xmax: 1 }, strokes), { stroke_ids: [], snapped: null });
});

test("a stroke's box: the size, the middle, the most points held, and the earlier of a tie", () => {
  const page = (left) => ({ answer_slot: { item: 1, slot: left }, left, top: 100, width: 100, height: 100 });
  const boxes = [page(100), page(150)];
  const line = (id, x0, x1) => ({ id, points: [{ x: x0, y: 150 }, { x: x1, y: 150 }] });
  // In both, with as many points held: the earlier.
  assert.equal(boxOf(line(1, 160, 190), boxes), 0);
  // Wider than 1.6 boxes: none.
  assert.equal(boxOf(line(2, 100, 261), boxes, BOX_RULE), -1);
  assert.deepEqual(tableOf([line(3, 160, 190), line(1, 600, 610)], [boxes[0]]), {
    verdicts: [{ stroke_id: 1, answer_slot: null }, { stroke_id: 3, answer_slot: { item: 1, slot: 100 } }],
    filled_boxes: [{ answer_slot: { item: 1, slot: 100 }, stroke_ids: [3] }],
  });
});
