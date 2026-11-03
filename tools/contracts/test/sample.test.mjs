// The sample file of the eval protocol, as tools/contracts/sample.mjs checks it: by the image buf
// builds of spec's own contracts/, each of spec's examples in memory with one thing broken, and the
// examples themselves, which pass.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { before, test } from "node:test";
import zlib from "node:zlib";
import { root } from "../../release/test/repository.mjs";
import { build } from "../buf.mjs";
import { FOLDER, HEIGHTS, breaches, checkExamples, checkSample, labelOf, pngBreaches, sampleOf } from "../sample.mjs";

let image;
let message;
before(() => {
  const built = build(root);
  assert.deepEqual(built.errors, []);
  image = built.image;
  ({ message } = sampleOf(image));
  assert.ok(message);
});
const files = fs.readdirSync(path.join(root, FOLDER)).map((name) => `${FOLDER}/${name}`);
const example = (name) => JSON.parse(fs.readFileSync(path.join(root, FOLDER, `${name}.json`), "utf8"));
const measurement = () => example("sheet-measurement");
const evalSet = () => example("sheet-eval-set");
const workbook = () => example("workbook-child");

const bytesOf = (value) => Buffer.from(typeof value === "string" ? value : JSON.stringify(value, null, 2));
const problemsOf = (value) => checkSample(bytesOf(value), message).problems.map((problem) => problem.message);

// Every problem matches one of the patterns, and every pattern one of the problems.
function expectOnly(value, ...patterns) {
  const problems = problemsOf(value);
  for (const problem of problems) assert.ok(patterns.some((pattern) => pattern.test(problem)), `unexpected: ${problem}\nall:\n${problems.join("\n")}`);
  for (const pattern of patterns) assert.ok(problems.some((problem) => pattern.test(problem)), `missing: ${pattern}\nall:\n${problems.join("\n")}`);
}
const changed = (made, edit) => {
  edit(made);
  return made;
};

// A PNG of a grey image of 8 bits, w × h px, white; edit changes its chunks before they are written.
function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(zlib.crc32(body), 8 + data.length);
  return out;
}
function png(width, height, edit = (chunks) => chunks, { depth = 8, colour = 0, interlace = 0 } = {}) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = depth;
  header[9] = colour;
  header[12] = interlace;
  const rows = Buffer.alloc(height * (1 + width), 255);
  for (let y = 0; y < height; y++) rows[y * (1 + width)] = 0;
  const chunks = [["IHDR", header], ["IDAT", zlib.deflateSync(rows)], ["IEND", Buffer.alloc(0)]];
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), ...edit(chunks).map(([type, data]) => chunk(type, data))]);
}

test("spec's own examples pass, and together show every purpose, writer, ink, surface and event", () => {
  assert.deepEqual(checkExamples(root, image, files), { errors: [] });
  for (const file of files) assert.deepEqual(checkSample(fs.readFileSync(path.join(root, file)), message).problems, [], file);
});

test("the examples together show every purpose, writer, ink, surface and event", () => {
  const { errors } = checkExamples(root, image, [`${FOLDER}/sheet-measurement.json`]);
  const lacking = errors.map((error) => error.message.match(/^no example shows (\S+):/)?.[1]);
  assert.deepEqual(lacking.sort(), ["PURPOSE_EVAL_SET", "WRITER_ADULT_AS_CHILD", "WRITER_CHILD", "geometry", "workbook"]);
  assert.ok(errors.every((error) => error.file === FOLDER && error.line === 0));
});

test("an example that breaks a rule fails, and the coverage is not looked at", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "samples-"));
  try {
    const folder = path.join(dir, FOLDER);
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, "one.json"), bytesOf(changed(evalSet(), (s) => delete s.license)));
    const { errors } = checkExamples(dir, image, [`${FOLDER}/one.json`]);
    assert.deepEqual(errors.map((error) => [error.file, error.message]), [[`${FOLDER}/one.json`, 'a sample of an eval set names its license, "Apache-2.0"']]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("the image must hold the sample, and name only the purposes and writers the rules know", () => {
  assert.match(sampleOf({ file: [] }).error, /^the image of buf build has no novatrail\.eval\.v1\.Sample/);
  const more = structuredClone(image);
  const file = more.file.find((one) => one.package === "novatrail.eval.v1");
  file.enumType.find((one) => one.name === "Writer").value.push({ name: "WRITER_ROBOT", number: 4 });
  assert.match(sampleOf(more).error, /^novatrail\.eval\.v1\.Writer has WRITER_ROBOT, which the rules of contracts\/README\.md, section 11 do not name/);
});

test("a sample is read as JSON, strictly, as a writer writes it", () => {
  assert.match(problemsOf("{")[0], /^not JSON:/);
  assert.match(problemsOf('{"protocol": "a", "protocol": "b"}')[0], /a key that its object has already/);
  assert.match(problemsOf("[]")[0], /^a sample is an object/);
  assert.match(problemsOf(changed(evalSet(), (s) => (s.writer_name = "Anna")))[0], /^it does not read as novatrail\.eval\.v1\.Sample: .*writer_name/);
  const camel = changed(evalSet(), (s) => {
    s.textSetVersion = s.text_set_version;
    delete s.text_set_version;
  });
  assert.match(problemsOf(camel)[0], /^it is not as a writer writes it, with the protobuf names and every field, its zero too \(contracts\/README\.md, section 11\): at textSetVersion$/);
  const zero = changed(workbook(), (s) => delete s.workbook.filled_boxes[0].crops.crops[0].frames);
  assert.match(problemsOf(zero)[0], /^it is not as a writer writes it.*: at workbook\.filled_boxes\.0\.crops\.crops\.0$/);
  const string = changed(evalSet(), (s) => (s.sheet.crops.bundle_median = String(s.sheet.crops.bundle_median)));
  assert.match(problemsOf(string)[0], /^it is not as a writer writes it.*: at sheet\.crops\.bundle_median$/);
  const unset = changed(evalSet(), (s) => (s.sheet.groups = null));
  assert.match(problemsOf(unset)[0], /^it is not as a writer writes it.*: at sheet\.groups$/);
  const lines = checkSample(bytesOf(camel), message).problems;
  assert.ok(lines[0].line > 1, "the line of the key that differs");
});

test("what the sample is, its versions and its origin", () => {
  expectOnly(changed(evalSet(), (s) => (s.protocol = "novatrail.eval.v2")), /^protocol is "novatrail\.eval\.v2", and the file is read as "novatrail\.eval\.v1" alone$/);
  expectOnly(changed(evalSet(), (s) => (s.id = "Sample 1")), /^the ID "Sample 1" is not 1 to 64/);
  expectOnly(changed(evalSet(), (s) => (s.id = "a".repeat(65))), /^the ID "a{65}" is not/);
  expectOnly(changed(evalSet(), (s) => (s.purpose = "PURPOSE_UNSPECIFIED")), /^purpose is "PURPOSE_UNSPECIFIED", and a sample is made for PURPOSE_MEASUREMENT or PURPOSE_EVAL_SET$/);
  expectOnly(changed(evalSet(), (s) => (s.purpose = 7)), /^purpose is 7,/);
  expectOnly(changed(evalSet(), (s) => (s.writer = "WRITER_UNSPECIFIED")), /^writer is "WRITER_UNSPECIFIED", and a sample is written by WRITER_ADULT, WRITER_ADULT_AS_CHILD, WRITER_CHILD$/);
  expectOnly(changed(evalSet(), (s) => delete s.synthetic), /^the sample says neither person nor synthetic/);
  expectOnly(changed(evalSet(), (s) => {
    delete s.synthetic;
    s.person = {};
  }));
  for (const seed of ["18446744073709551616", "012", "-1", ""]) expectOnly(changed(evalSet(), (s) => (s.synthetic.seed = seed)), /^the seed .* is not an unsigned integer of 64 bits/);
  expectOnly(changed(evalSet(), (s) => (s.synthetic.seed = "18446744073709551615")));
  expectOnly(changed(evalSet(), (s) => (s.text_set_version = "draft 1")), /^text_set_version "draft 1" is not/);
  expectOnly(changed(evalSet(), (s) => (s.canvas_version = "v0.1.0")), /^canvas_version "v0\.1\.0" is not MAJOR\.MINOR\.PATCH$/);
});

test("the purpose and the writer give the sample its fields", () => {
  expectOnly(changed(evalSet(), (s) => (s.writer = "WRITER_CHILD")), /^a sample of an eval set is written by an adult, never by a child$/);
  expectOnly(changed(evalSet(), (s) => (s.writer_code = "K7Q2M9XD")), /^a sample of an eval set has no writer's code/);
  expectOnly(changed(evalSet(), (s) => (s.license = "CC-BY-4.0")), /^a sample of an eval set names its license, "Apache-2\.0"$/);
  const history = measurement().history;
  expectOnly(changed(evalSet(), (s) => {
    delete s.geometry;
    s.history = history;
    s.sheet = measurement().sheet;
  }), /^a sample of an eval set holds the final geometry, not the history of writing$/);
  expectOnly(changed(measurement(), (s) => delete s.writer_code), /^a sample of measurement has its writer's code$/);
  expectOnly(changed(measurement(), (s) => (s.writer_code = "k7q2")), /^the writer's code "k7q2" is not 6 to 16 digits and capital Latin letters$/);
  expectOnly(changed(measurement(), (s) => (s.license = "Apache-2.0")), /^a sample of measurement names no license: it is not published$/);
  expectOnly(changed(evalSet(), (s) => {
    s.purpose = "PURPOSE_MEASUREMENT";
    s.writer_code = "K7Q2M9XD";
    delete s.license;
  }), /^a sample of measurement by an adult holds the history of writing, not the final geometry$/);
  expectOnly(changed(measurement(), (s) => (s.writer = "WRITER_CHILD")), /^a sample of a child holds the final geometry, never the history of writing$/);
});

test("the task, without its key", () => {
  expectOnly(changed(evalSet(), (s) => delete s.task), /^the sample names no task$/);
  expectOnly(changed(evalSet(), (s) => delete s.task.tutor), /^the task names no source: modules, tutor or file$/);
  const tutor = evalSet().task.tutor;
  expectOnly(changed(evalSet(), (s) => (s.task.tutor = { ...tutor, tag: "0.1.1", file_digest: "sha256:ABC", bank: "", bank_digest: tutor.file_digest.toUpperCase() })),
    /^the tag "0\.1\.1" is not a tag vMAJOR\.MINOR\.PATCH$/, /^the file's digest "sha256:ABC" is not sha256: and 64 lowercase hexadecimal digits$/, /^the bank is empty$/, /^the bank's digest .* is not sha256:/);
  const digest = tutor.file_digest;
  expectOnly(changed(evalSet(), (s) => {
    delete s.task.tutor;
    s.task.modules = { tag: "v0.1.0", module: "fractions", version: "1.2.0", package_digest: digest };
  }));
  expectOnly(changed(evalSet(), (s) => {
    delete s.task.tutor;
    s.task.modules = { tag: "v0.1", module: "", version: "1.2", package_digest: "sha256:" };
  }), /^the tag "v0\.1" is not/, /^the module's ID is empty$/, /^the module's version "1\.2" is not MAJOR\.MINOR\.PATCH$/, /^the package's digest "sha256:" is not/);
  expectOnly(changed(evalSet(), (s) => {
    delete s.task.tutor;
    s.task.file = { file_digest: digest, bank: "bank.json", bank_digest: digest };
  }));
  expectOnly(changed(evalSet(), (s) => {
    delete s.task.tutor;
    s.task.file = { file_digest: "x", bank: "", bank_digest: "y" };
  }), /^the file's digest "x" is not/, /^the bank is empty$/, /^the bank's digest "y" is not/);
  expectOnly(changed(evalSet(), (s) => (s.task.task = "")), /^the task's ID is empty$/);
  expectOnly(changed(evalSet(), (s) => (s.task.seed = "42")));
  expectOnly(changed(evalSet(), (s) => (s.task.seed = "4.2")), /^the seed "4\.2" is not an unsigned integer/);
  expectOnly(changed(evalSet(), (s) => (s.task.open_view_digest = "sha256:12")), /^the digest of the open view "sha256:12" is not sha256:/);
});

test("the history of writing", () => {
  const events = () => measurement().history.events;
  const at = (edit) => changed(measurement(), (s) => edit(s.history.events));
  expectOnly(at((list) => (list[1].t_ms = 10)), /^the event is at 10 ms, before the one before it, at 128 ms$/, /^the stroke 2 is written at 10 ms, and its last point is at 586 ms: a stroke is written no sooner than its last point$/);
  // A stroke that ended without its pointerup, while another action landed, lands after its last
  // point (R22 canvas).
  expectOnly(at((list) => (list[0].t_ms = 200)));
  const unwritten = [/^(?:erase|clear) takes off the stroke 2, which the sheet does not show then$/, /^the undo puts back the stroke 2, which is never written$/, /^the group A names the stroke 2, which the sheet does not show$/];
  expectOnly(at((list) => (list[1].write.id = 0)), /^the stroke's ID is 0, and IDs count from 1$/, ...unwritten, /^clear names \[1,2,3\], and the sheet shows \[0,1,3\]/, /^the stroke 0 is in 0 groups/);
  expectOnly(at((list) => (list[1].write.id = 1)), /^the stroke 1 is written twice$/, ...unwritten, /^clear names \[1,2,3\], and the sheet shows \[1,3\]/);
  expectOnly(at((list) => (list[0].write.pointer = "")), /^the stroke names no type of pointer$/);
  expectOnly(at((list) => (list[0].write.points[0].x = 1000.5)), /^x is 1000\.5, off the sheet, from 0 to 1000$/);
  expectOnly(at((list) => (list[0].write.points[0].y = 210.85)), /^y is 210\.85, and a place is written to a tenth$/);
  expectOnly(at((list) => (list[0].write.points[0].t_ms = 129)), /^the point is at \d+ ms, before the one before it, at 129 ms: a stroke's points never go back in time$/);
  expectOnly(at((list) => (list[2].erase.ids = [])), /^the eraser takes no stroke off$/, /the undo puts back the stroke 1, which is on the sheet already/, /the undo puts back the stroke 2, which is on the sheet already/);
  expectOnly(at((list) => (list[2].erase.ids = [1, 1, 2])), /^erase names a stroke twice$/);
  expectOnly(at((list) => (list[2].erase.ids = [1, 2, 9])), /^erase takes off the stroke 9, which the sheet does not show then$/);
  expectOnly(at((list) => (list[5].clear.ids = [1, 2])), /^clear names \[1,2\], and the sheet shows \[1,2,3\]: a clear takes every stroke off$/, /the undo puts back the stroke 3, which is on the sheet already/);
  expectOnly(at((list) => (list[3].undo = { removed: [], restored: [] })), /^the undo changes nothing$/, /takes off the stroke 1, which the sheet does not show then/, /takes off the stroke 2, which the sheet does not show then/, /clear names \[1,2,3\], and the sheet shows \[3\]/);
  expectOnly(at((list) => (list[3].undo.removed = [1])), /^the undo takes off the stroke 1, which the sheet does not show then$/);
  expectOnly(at((list) => list.splice(3, 1, { t_ms: 4286 })), /^the event is none of write, erase, clear and undo$/, /takes off the stroke 1/, /takes off the stroke 2/, /clear names \[1,2,3\], and the sheet shows \[3\]/);
  assert.equal(events().length, 7);
  const empty = changed(measurement(), (s) => {
    s.history.events = [];
    s.sheet.groups = [];
    delete s.sheet.crops;
  });
  expectOnly(empty);
  expectOnly(changed(measurement(), (s) => {
    s.history.events = [];
    s.sheet.groups = [];
  }), /^the sheet shows no stroke, so it has no crop$/, /^the frames are of \["A","B"\], and the groups are \[\]$/);
  expectOnly(changed(measurement(), (s) => delete s.sheet.crops), /^the sheet shows strokes and holds no crops$/);
  expectOnly(changed(measurement(), (s) => delete s.history), /^the sample holds neither history nor geometry$/);
});

test("the final geometry", () => {
  expectOnly(changed(evalSet(), (s) => (s.geometry.strokes[2].id = 30)), /^stroke 3 has the ID 30: the final geometry numbers its strokes by place, from 1$/, /names the stroke 3, which the sheet does not show/, /^the stroke 30 is in 0 groups/);
  expectOnly(changed(evalSet(), (s) => (s.geometry.strokes[0].points = [])), /^the stroke 1 has no point$/);
  expectOnly(changed(workbook(), (s) => (s.geometry.strokes[0].points[0].y = 1400.1)), /^y is 1400\.1, off the page, from 0 to 1400$/);
});

test("a sheet: its size, its groups and its crops", () => {
  expectOnly(changed(evalSet(), (s) => (s.sheet.width = 0)), /^the sheet is 0 × 1400 units: 1 unit each way at least$/, /x is \S+, off the sheet, from 0 to 0/);
  expectOnly(changed(evalSet(), (s) => (s.sheet.digit_height = 300)), /^digit_height is 300, from 1 to 256 px$/, /the crops are at \[16,24,32,48\] px, and a sample's are at the heights of eval and the module's, \[16,24,32,48,300\]/);
  expectOnly(changed(evalSet(), (s) => (s.sheet.groups[1].label = "C")), /^group 2 is labelled "C", and the labels go A, B and on: "B"$/, /the frames are of \["A","B"\], and the groups are \["A","C"\]/);
  expectOnly(changed(evalSet(), (s) => s.sheet.groups[0].stroke_ids.reverse()), /^the group A names its strokes \[.*\], and they go ascending, each once$/);
  expectOnly(changed(evalSet(), (s) => s.sheet.groups[0].stroke_ids.push(99)), /^the group A names the stroke 99, which the sheet does not show$/);
  expectOnly(changed(evalSet(), (s) => (s.sheet.groups[1].stroke_ids = [])), /^the group B has no stroke$/, /^the stroke \d+ is in 0 groups, and every stroke the sheet shows is in one$/);
  expectOnly(changed(evalSet(), (s) => s.sheet.crops.crops.pop()), /^the crops are at \[16,24,32\] px/);
  expectOnly(changed(evalSet(), (s) => {
    s.sheet.digit_height = 20;
  }), /^the crops are at \[16,24,32,48\] px, and a sample's are at the heights of eval and the module's, \[16,20,24,32,48\]$/);
  const crop = (edit) => changed(evalSet(), (s) => edit(s.sheet.crops.crops[1], s.sheet.crops));
  expectOnly(crop((c) => (c.drawn_height = 25)), /^drawn_height is 25, from 1 to the height asked for, 24$/);
  expectOnly(crop((c) => (c.margin_top = -1)), /^the crop is \d+ × \d+ px with margins -1 and \d+/);
  expectOnly(crop((c) => (c.scale = 0)), /^scale 0 and line_width \S+ are positive numbers$/);
  expectOnly(crop((c) => (c.sheet_box.ymax = c.sheet_box.ymin)), /^sheet_box is .*: ymin less than ymax, xmin less than xmax$/);
  expectOnly(crop((c) => c.frames.pop()), /^the frames are of \["A"\], and the groups are \["A","B"\]$/);
  expectOnly(crop((c) => (c.frames[0].box.xmax = 1001)), /^the frame of A is .*: whole thousandths from 0 to 1000/);
  expectOnly(crop((c, set) => (set.ink_box.ymin = set.ink_box.ymax + 1)), /^ink_box is .*: the box of the points/);
  expectOnly(crop((c, set) => (set.bundle_median = 0)), /^bundle_median is 0, and h_med is a height of 1 tenth at least$/);
  expectOnly(crop((c) => (c.png = png(c.width + 1, c.height).toString("base64"))), /^the PNG at 24 px: it is \d+ × \d+ px, and the crop \d+ × \d+$/);
  expectOnly(crop((c) => (c.png = png(c.width, c.height, (chunks) => [chunks[0], ["tEXt", Buffer.from("Author\0Anna")], ...chunks.slice(1)]).toString("base64"))), /^the PNG at 24 px: it holds tEXt: a crop's PNG holds the chunks IHDR, IDAT and IEND alone, and no ancillary chunk$/);
  expectOnly(crop((c) => (c.png = png(c.width, c.height).toString("base64"))));
});

test("a PNG holds IHDR, IDAT and IEND alone, of the crop's size, grey, 8 bits", () => {
  assert.deepEqual(pngBreaches(png(3, 2), 3, 2), []);
  assert.deepEqual(pngBreaches(png(3, 2, (c) => [c[0], ["IDAT", c[1][1].subarray(0, 4)], ["IDAT", c[1][1].subarray(4)], c[2]]), 3, 2), []);
  assert.deepEqual(pngBreaches(Buffer.from("GIF89a"), 3, 2), ["it does not begin with the signature of a PNG"]);
  const good = png(3, 2);
  assert.deepEqual(pngBreaches(good.subarray(0, 46), 3, 2), ["the chunk \"IDAT\" is cut short"]);
  assert.deepEqual(pngBreaches(good.subarray(0, 14), 3, 2), ["a chunk is cut short"]);
  const broken = Buffer.from(good);
  broken[20] ^= 1;
  assert.deepEqual(pngBreaches(broken, 3, 2), ["the chunk \"IHDR\" fails its CRC"]);
  assert.deepEqual(pngBreaches(Buffer.concat([good, Buffer.from([0])]), 3, 2), ["bytes follow IEND"]);
  for (const type of ["tIME", "eXIf", "zTXt", "iTXt", "gAMA", "pHYs", "prVt"]) {
    assert.match(pngBreaches(png(3, 2, (c) => [c[0], [type, Buffer.alloc(1)], ...c.slice(1)]), 3, 2)[0], new RegExp(`^it holds ${type}: `));
  }
  assert.match(pngBreaches(png(3, 2, (c) => [c[0], ["PLTE", Buffer.alloc(3)], ...c.slice(1)]), 3, 2)[0], /^it holds PLTE: /);
  assert.deepEqual(pngBreaches(png(3, 2, (c) => [c[1], c[0], c[2]]), 3, 2), ["its chunks are IDAT, IHDR, IEND: IHDR, then IDAT, one or more in a row, then IEND"]);
  assert.deepEqual(pngBreaches(png(3, 2, (c) => [c[0], c[2]]), 3, 2), ["its chunks are IHDR, IEND: IHDR, then IDAT, one or more in a row, then IEND"]);
  assert.deepEqual(pngBreaches(png(3, 2, (c) => [["IHDR", c[0][1].subarray(0, 12)], c[1], c[2]]), 3, 2), ["its IHDR is not 13 bytes"]);
  assert.deepEqual(pngBreaches(png(3, 2, (c) => c, { colour: 2 }), 3, 2), ["its bit depth is 8 and its colour type 2: a crop is grey, 8 bits, colour type 0"]);
  assert.deepEqual(pngBreaches(png(3, 2, (c) => c, { depth: 16 }), 3, 2), ["its bit depth is 16 and its colour type 0: a crop is grey, 8 bits, colour type 0"]);
  assert.deepEqual(pngBreaches(png(3, 2, (c) => c, { interlace: 1 }), 3, 2), ["its compression, filter method or interlace is not 0"]);
  assert.match(pngBreaches(png(3, 2, (c) => [c[0], ["IDAT", Buffer.from("not zlib")], c[2]]), 3, 2)[0], /^its IDAT does not inflate: /);
  assert.deepEqual(pngBreaches(png(3, 2, (c) => [c[0], ["IDAT", zlib.deflateSync(Buffer.alloc(5))], c[2]]), 3, 2), ["its IDAT inflates to 5 bytes, and 2 rows of 3 px are 8"]);
  const rows = Buffer.alloc(8, 255);
  rows[0] = 0;
  rows[4] = 0;
  const hidden = Buffer.concat([zlib.deflateSync(rows), Buffer.from("Author: Anna")]);
  assert.deepEqual(pngBreaches(png(3, 2, (c) => [c[0], ["IDAT", hidden], c[2]]), 3, 2), ["its IDAT holds 12 bytes after the end of its zlib stream"]);
  rows[4] = 9;
  assert.deepEqual(pngBreaches(png(3, 2, (c) => [c[0], ["IDAT", zlib.deflateSync(rows)], c[2]]), 3, 2), ["its row 2 has the filter 9, and a PNG's filters are 0 to 4"]);
  rows[4] = 4;
  assert.deepEqual(pngBreaches(png(3, 2, (c) => [c[0], ["IDAT", zlib.deflateSync(rows)], c[2]]), 3, 2), []);
});

test("a workbook: its boxes, its filled boxes and its crops", () => {
  const book = (edit) => changed(workbook(), (s) => edit(s.workbook, s));
  expectOnly(book((w) => (w.boxes[0].answer_slot = { item: 0, slot: 1 })), /^the box is at \{"item":0,"slot":1\}: an item and a slot, each from 1$/, /^the filled box \{"item":1,"slot":1\} is none of the page's boxes$/);
  expectOnly(book((w) => w.boxes.reverse()), /^the box \S+ comes after \S+: the boxes go in the task's order, each once$/);
  expectOnly(book((w) => (w.boxes[3].left = 950)), /^the box 4\.1 at 950, \d+, 100 × 100 is not on the page/);
  expectOnly(book((w) => (w.filled_boxes[0].answer_slot = { item: 9, slot: 2 })), /^the filled box \{"item":9,"slot":2\} is none of the page's boxes$/, /^the filled box 2\.1 comes after 9\.2/);
  expectOnly(book((w) => w.filled_boxes.reverse()), /^the filled box \S+ comes after \S+: the filled boxes go in the task's order, each once$/);
  expectOnly(book((w) => w.filled_boxes[1].stroke_ids.push(w.filled_boxes[0].stroke_ids[0])), /^the stroke \d+ is in two boxes$/);
  expectOnly(book((w) => w.filled_boxes[0].stroke_ids.reverse()), /^the box 1\.1 names its strokes \[5,4,3\], and they go ascending, each once$/);
  expectOnly(book((w) => delete w.filled_boxes[0].crops), /^the filled box 1\.1 holds no crops$/);
  expectOnly(book((w) => (w.filled_boxes[0].crops.crops[0].frames = [{ label: "A", box: { ymin: 0, xmin: 0, ymax: 1000, xmax: 1000 } }])), /^the frames are of \["A"\], and a workbook has none$/);
  expectOnly(book((w, s) => s.geometry.strokes.push({ id: 17, points: [{ x: 500, y: 1300 }] })), /^the stroke 17 is in no box: the final geometry of a workbook holds the strokes of its boxes alone, and the draft goes nowhere$/);
  expectOnly(book((w) => (w.height = 0)), /^the page is 1000 × 0 units/, /off the page, from 0 to 0/, /is not on the page/);
  expectOnly(changed(workbook(), (s) => delete s.workbook), /^the sample holds neither sheet nor workbook$/);
});

test("the rules of section 12: a history's groups, and every crop's numbers by the strokes the file holds", () => {
  // A history's groups are what the rule gives its strokes, and the frames are drawn by the groups given.
  expectOnly(changed(measurement(), (s) => (s.sheet.groups = [{ label: "A", stroke_ids: [1] }, { label: "B", stroke_ids: [2, 3] }])),
    /^the groups are \[\{"label":"A","stroke_ids":\[1\]\},\{"label":"B","stroke_ids":\[2,3\]\}\], and the rule of groups gives the strokes the sheet shows \[\{"label":"A","stroke_ids":\[1,2\]\},\{"label":"B","stroke_ids":\[3\]\}\] \(contracts\/README\.md, section 12\)$/,
    /^crops\.0\.frames\.0\.box\.\w+ of the crops is \d+, and the rule of the crop gives \d+/);
  // The final geometry's groups are the device's: the rule does not redraw them, and the frames follow them.
  expectOnly(changed(evalSet(), (s) => {
    s.sheet.groups[0].stroke_ids.pop();
    s.sheet.groups[1].stroke_ids.unshift(11);
  }), /^crops\.0\.frames\.\d\.box\.\w+ of the crops is \d+, and the rule of the crop gives \d+/);
  const crop = (edit) => changed(evalSet(), (s) => edit(s.sheet.crops.crops[1], s.sheet.crops));
  expectOnly(crop((c) => (c.scale += 1e-9)), /^crops\.1\.scale of the crops is [\d.]+, and the rule of the crop gives [\d.]+ \(contracts\/README\.md, section 12\)$/);
  expectOnly(crop((c, set) => (set.ink_box.xmin -= 1)), /^ink_box\.xmin of the crops is \d+, and the rule of the crop gives \d+/);
  expectOnly(crop((c, set) => (set.bundle_median += 1)), /^bundle_median of the crops is \d+, and the rule of the crop gives \d+/);
  expectOnly(crop((c) => (c.sheet_box.xmax += 0.5)), /^crops\.1\.sheet_box\.xmax of the crops is/);
  const found = breaches(changed(workbook(), (s) => (s.workbook.filled_boxes[2].crops.crops[0].margin_left += 1)));
  assert.deepEqual(found.map((one) => one.at), [["workbook", "filled_boxes", 2, "crops", "crops", 0, "margin_left"]]);
  assert.match(found[0].message, /^crops\.0\.margin_left of the crops is \d+, and the rule of the crop gives \d+/);
  // A sample whose form breaks is not held to the rules: their numbers would say nothing new.
  expectOnly(changed(evalSet(), (s) => {
    s.sheet.crops.crops[1].scale += 1e-9;
    s.sheet.width = 0;
  }), /^the sheet is 0 × 1400 units/, /off the sheet, from 0 to 0/);
});

test("the rules of section 12: a history's boxes on a workbook are what the rule of boxes gives its strokes", () => {
  // The child's page written as an adult's measurement: the history of the same strokes, a stroke
  // each 400 ms, a point each 10 ms.
  const adult = () => changed(workbook(), (s) => {
    s.writer = "WRITER_ADULT";
    let time = 0;
    s.history = {
      events: s.geometry.strokes.map((stroke) => {
        const points = stroke.points.map((point, i) => ({ ...point, t_ms: time + 10 * i }));
        time = points.at(-1).t_ms + 400;
        return { t_ms: points.at(-1).t_ms, write: { id: stroke.id, pointer: "pen", points } };
      }),
    };
    delete s.geometry;
  });
  expectOnly(adult());
  // A stroke of the draft is no box's, and the history may hold it.
  expectOnly(changed(adult(), (s) => s.history.events.push({ t_ms: 99999, write: { id: 17, pointer: "pen", points: [{ x: 500, y: 1300, t_ms: 99999 }] } })));
  expectOnly(changed(adult(), (s) => {
    const [first, second] = s.workbook.filled_boxes;
    second.stroke_ids = [...first.stroke_ids.splice(2), ...second.stroke_ids].sort((a, b) => a - b);
  }), /^the filled boxes are .*, and the rule of boxes gives the strokes the page shows \[\{"answer_slot":\{"item":1,"slot":1\},"stroke_ids":\[3,4,5\]\},/, /^ink_box\.\w+ of the crops is/, /^\w+(?:\.\w+)* of the crops is/);
});

test("the breaches of a sample name where they are", () => {
  const found = breaches(changed(evalSet(), (s) => {
    s.id = "";
    s.geometry.strokes[0].points[0].x = -1;
  }));
  assert.deepEqual(found.map((one) => one.at), [["id"], ["geometry", "strokes", 0, "points", 0, "x"]]);
  // A point of a history is named by its path from the sample, as the events of the history are.
  const history = breaches(changed(measurement(), (s) => (s.history.events[1].write.points[2].x = 1000.5)));
  assert.deepEqual(history.map((one) => one.at), [["history", "events", 1, "write", "points", 2, "x"]]);
  assert.equal(labelOf(0), "A");
  assert.equal(labelOf(25), "Z");
  assert.equal(labelOf(26), "AA");
  assert.equal(labelOf(27), "AB");
  assert.equal(labelOf(701), "ZZ");
  assert.equal(labelOf(702), "AAA");
  assert.deepEqual(HEIGHTS, [16, 24, 32, 48]);
});
