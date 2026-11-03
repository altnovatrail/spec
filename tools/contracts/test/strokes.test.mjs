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
  labelOf,
  medianOf,
  messagesOf,
  snapOf,
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
  assert.equal(cases, 84);
});

test("what the vectors lack together is found, once each holds", () => {
  const { errors } = checkVectors(root, image, [`${FOLDER}/groups.json`]);
  const messages = errors.map((error) => error.message);
  for (const name of ["crops.json", "snaps.json", "boxes.json"]) assert.ok(errors.some((error) => error.file === `${FOLDER}/${name}` && /^the file is missing/.test(error.message)), name);
  for (const text of ["no bundle", "h_med above the ceiling", "a height drawn below the height asked for", "a box of a model that takes strokes", "a box of a model that takes none", "a stroke of the draft", "a filled box"]) assert.ok(messages.some((message) => message.includes(text)), text);
  assert.ok(!messages.some((message) => /history with|taken off/.test(message)), "groups.json holds the history's rules");
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "strokes-"));
  try {
    fs.mkdirSync(path.join(folder, FOLDER), { recursive: true });
    fs.writeFileSync(path.join(folder, FOLDER, "groups.json"), JSON.stringify(vector("groups.json", "later")));
    const lacking = checkVectors(folder, image, [`${FOLDER}/groups.json`]).errors.map((error) => error.message);
    for (const text of ["a history with erase", "a history with clear", "a history with undo", "that is in no group", "that is in two groups"]) assert.ok(lacking.some((message) => message.includes(text)), text);
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
      { file: `${FOLDER}/lines.json`, line: 0, message: "section 12 has no vector lines.json: its vectors are groups.json, crops.json, snaps.json, boxes.json" },
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
  expectOnly("groups.json", vector("groups.json", null, (v) => { v.description = " "; v.rule = { ...v.rule, pause: 2500 }; v.cases = []; }), /^description is a text/, /^the rule is \{"pause":2500,"across":50,"down":50\}, and section 12 gives \{"pause":2000,"across":50,"down":50\}$/, /^cases lists the cases, one at least$/);
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
