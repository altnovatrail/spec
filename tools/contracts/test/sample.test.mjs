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
import { isReport } from "../report.mjs";
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
const files = fs.readdirSync(path.join(root, FOLDER)).map((name) => `${FOLDER}/${name}`).filter((file) => !isReport(file));
const marked = (name) => JSON.parse(fs.readFileSync(path.join(root, FOLDER, `${name}.json`), "utf8"));
// The examples without their markup, which a sample may lack: the rules of its other fields are
// tested on them, and those of the markup on the examples as they are.
const example = (name) => changed(marked(name), (s) => delete s.markup);
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

test("spec's own examples pass, and together show every purpose, writer, ink, surface and event, and every kind of part", () => {
  const { errors, samples } = checkExamples(root, image, files);
  assert.deepEqual(errors, []);
  assert.deepEqual([...samples.keys()].sort(), files.map((file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8")).id).sort(), "every example that holds is handed on, by its ID");
  for (const file of files) assert.deepEqual(checkSample(fs.readFileSync(path.join(root, file)), message).problems, [], file);
  for (const file of files) assert.ok(JSON.parse(fs.readFileSync(path.join(root, file), "utf8")).markup, `${file} has its markup`);
});

test("the examples together show every purpose, writer, ink, surface and event, and what a markup holds", () => {
  const { errors } = checkExamples(root, image, [`${FOLDER}/sheet-measurement.json`]);
  const lacking = errors.map((error) => error.message.match(/^no example shows (.+?): together/)?.[1]);
  assert.deepEqual(lacking.sort(), ["PART_KIND_DRAWING", "PURPOSE_EVAL_SET", "WRITER_ADULT_AS_CHILD", "WRITER_CHILD", "a workbook's truth", "geometry", "marks", "workbook"]);
  assert.ok(errors.every((error) => error.file === FOLDER && error.line === 0));
});

test("an example that breaks a rule fails, and the coverage is not looked at", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "samples-"));
  try {
    const folder = path.join(dir, FOLDER);
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, "one.json"), bytesOf(changed(evalSet(), (s) => delete s.license)));
    const { errors, samples } = checkExamples(dir, image, [`${FOLDER}/one.json`]);
    assert.deepEqual(errors.map((error) => [error.file, error.message]), [[`${FOLDER}/one.json`, 'a sample of an eval set names its license, "Apache-2.0"']]);
    assert.equal(samples.size, 0, "a sample that breaks a rule is not handed on");
    assert.deepEqual(checkExamples(dir, { file: [] }, [`${FOLDER}/one.json`]).samples, new Map());
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("no two examples have one ID: a report names a sample by its ID", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "samples-"));
  try {
    const folder = path.join(dir, FOLDER);
    fs.mkdirSync(folder, { recursive: true });
    for (const file of files) fs.copyFileSync(path.join(root, file), path.join(dir, file));
    const copy = `${FOLDER}/copy.json`;
    fs.copyFileSync(path.join(root, files[0]), path.join(dir, copy));
    const { id } = JSON.parse(fs.readFileSync(path.join(root, files[0]), "utf8"));
    const { errors } = checkExamples(dir, image, [...files, copy]);
    assert.deepEqual(errors.map((error) => [error.file, error.message]), [[copy, `the ID ${id} is ${files[0]}'s too: a report names a sample by its ID, so the samples it is held to have one ID each`]]);
    assert.ok(errors[0].line > 1, "the line of the ID");
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

test("a synthetic sample has the versions of a file the samples page did not write", () => {
  expectOnly(changed(evalSet(), (s) => (s.canvas_version = "0.1.0")), /^a synthetic sample was not written by the samples page, so its canvas_version is "0\.0\.0", not "0\.1\.0"$/);
  expectOnly(changed(evalSet(), (s) => (s.text_set_version = "0.1")), /^a synthetic sample was not written by the samples page, so its text_set_version is "none", not "0\.1"$/);
  const byThePage = (s) => {
    delete s.synthetic;
    s.person = {};
    s.canvas_version = "0.1.2";
    s.text_set_version = "2026-11a";
  };
  expectOnly(changed(evalSet(), byThePage));
  expectOnly(changed(evalSet(), (s) => {
    delete s.synthetic;
    s.person = {};
  }));
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

// The examples with their markup: a solution with a drawing on a history, an essay, a workbook.
const drawing = () => marked("sheet-drawing");
const essay = () => marked("sheet-essay");
const book = () => marked("workbook-child");
const markup = (sample, edit) => changed(sample, (s) => edit(s.markup, s));
const value = (text) => ({ answer_slot: { item: 1, slot: 1 }, value: text });
const reason = (unreadable) => ({ answer_slot: { item: 1, slot: 1 }, unreadable });

test("a sample without its markup is a sample, and the markup holds a truth", () => {
  expectOnly(evalSet());
  expectOnly(workbook());
  expectOnly(markup(drawing(), (m) => delete m.truth), /^the markup has no truth: every answer slot that AI reads/);
});

test("the truth: every answer slot that AI reads, its value as written or why there is none", () => {
  expectOnly(markup(drawing(), (m) => (m.truth.answer_slots[0].answer_slot = { item: 0, slot: 1 })), /^the answer slot is at \{"item":0,"slot":1\}: an item and a slot, each from 1$/);
  expectOnly(markup(book(), (m) => m.truth.answer_slots.reverse()), /^the answer slot \S+ comes after \S+: the truth goes in the task's order, each once$/, /^the truth names the boxes .*, and on a workbook it names every box of the page, in order: /);
  expectOnly(markup(drawing(), (m) => (m.truth.answer_slots[0].value = "  ")), /^the value "  " is empty or only white space: where nothing is written, the slot is blank$/);
  expectOnly(markup(drawing(), (m) => (m.truth.answer_slots[0] = reason(9))), /^the reason 9 is none of the observation's/, /^one part holds the final answer, so its truth is a value, UNREADABLE_ILLEGIBLE or UNREADABLE_AMBIGUOUS, not 9$/);
  expectOnly(markup(drawing(), (m) => delete m.truth.answer_slots[0].value), /^the answer slot 1\.1 gives neither a value nor a reason$/);
  expectOnly(markup(drawing(), (m) => (m.truth.answer_slots[0].crop_box = { ymin: 0, xmin: 0, ymax: 10, xmax: 10 })), /^the truth gives no box on a crop/);
  // A sheet that shows no stroke: every answer slot is blank, and the solution has no part.
  const blank = (truth) => changed(drawing(), (s) => {
    s.history.events = [];
    s.sheet.groups = [];
    delete s.sheet.crops;
    s.markup.truth.answer_slots = [truth];
    s.markup.parts = { parts: [] };
  });
  expectOnly(blank(reason("UNREADABLE_BLANK")));
  expectOnly(blank(value("12")), /^the sheet shows no stroke, so every answer slot is UNREADABLE_BLANK$/);
  expectOnly(changed(blank(reason("UNREADABLE_BLANK")), (s) => (s.markup.parts.parts = drawing().markup.parts.parts.slice(1))), /^the sheet shows no stroke, so its markup has no part$/, /^the part 1 names the stroke \d+, which the sheet does not show$/, /^one part holds the final answer, so its truth is a value, .*, not "UNREADABLE_BLANK"$/);
});

test("the notes set answer slots apart: a mirrored digit, something crossed out", () => {
  const note = (one) => markup(book(), (m) => (m.notes = [one]));
  expectOnly(note({ answer_slot: { item: 1, slot: 1 }, mirrored: false, crossed_out: true }));
  expectOnly(note({ answer_slot: { item: 1, slot: 1 }, mirrored: true, crossed_out: false }), /^a mirrored digit is read as UNREADABLE_AMBIGUOUS, and the truth of 1\.1 is "14"$/);
  expectOnly(changed(note({ answer_slot: { item: 1, slot: 1 }, mirrored: true, crossed_out: false }), (s) => (s.markup.truth.answer_slots[0] = reason("UNREADABLE_AMBIGUOUS"))));
  expectOnly(note({ answer_slot: { item: 9, slot: 9 }, mirrored: false, crossed_out: true }), /^the note is of \{"item":9,"slot":9\}, which is none of the truth's answer slots$/);
  expectOnly(note({ answer_slot: { item: 1, slot: 1 }, mirrored: false, crossed_out: false }), /^the note of 1\.1 sets nothing apart/);
  const both = [{ answer_slot: { item: 2, slot: 1 }, mirrored: false, crossed_out: true }, { answer_slot: { item: 1, slot: 1 }, mirrored: false, crossed_out: true }];
  expectOnly(markup(book(), (m) => (m.notes = both)), /^the note of 1\.1 comes after that of 2\.1: the notes go ascending by place, each once$/);
});

test("a workbook's truth names every box, an empty box blank, and nothing else", () => {
  expectOnly(markup(book(), (m) => m.truth.answer_slots.pop()), /^the truth names the boxes .*, and on a workbook it names every box of the page, in order: /);
  expectOnly(markup(book(), (m) => (m.truth.answer_slots[6] = { answer_slot: { item: 6, slot: 1 }, value: "7" })), /^the box 6\.1 holds no stroke, so its truth is UNREADABLE_BLANK$/);
  expectOnly(markup(book(), (m) => (m.parts = { parts: [] })), /^a workbook's markup has neither parts nor marks: its places are its boxes$/);
  expectOnly(markup(drawing(), (m) => delete m.parts), /^a sheet's markup gives the parts of its solution, or the people's marks of its essay$/);
});

test("the parts of a solution: each stroke in one, the first error, the final answer", () => {
  const parts = (edit) => markup(drawing(), (m) => edit(m.parts.parts, m));
  expectOnly(parts((p) => (p[0].kind = "PART_KIND_UNSPECIFIED")), /^the part 1 is of the kind "PART_KIND_UNSPECIFIED", and a part is PART_KIND_TEXT or PART_KIND_DRAWING$/);
  expectOnly(parts((p) => (p[1].text = " ")), /^the part 2 has no text: a text as written, or a drawing described in words$/);
  expectOnly(parts((p) => p[0].stroke_ids.push(999)), /^the part 1 names the stroke 999, which the sheet does not show$/);
  expectOnly(parts((p) => p[1].stroke_ids.push(p[0].stroke_ids[0])), /^the part 2 names its strokes .*, and they go ascending, each once$/, /^the stroke \d+ is in 2 parts, and every stroke the sheet shows is in one$/);
  expectOnly(parts((p) => p[0].stroke_ids.shift()), /^the stroke \d+ is in 0 parts, and every stroke the sheet shows is in one$/);
  expectOnly(parts((p) => (p[1].stroke_ids = [])), /^the part 2 has no stroke$/, /is in 0 parts/);
  expectOnly(parts((p) => p.splice(0)), /^the sheet shows strokes, and the markup names no part: each stroke is in one$/, /^the first error is at the part 1, and the parts are 1 to 0$/);
  expectOnly(parts((p, m) => (m.parts.first_error = 3)), /^the first error is at the part 3, and the parts are 1 to 2$/);
  expectOnly(parts((p, m) => delete m.parts.first_error));
  expectOnly(parts((p) => (p[0].crossed_out = true)), /^the first error is at the part 1, which is crossed out and no part of the solution$/);
  expectOnly(parts((p) => (p[1].crossed_out = true)), /^the part 2 is crossed out, so it holds no final answer$/);
  // A part crossed out holds no final answer, so it counts toward none of the truth's.
  expectOnly(parts((p) => {
    p[0].final_answer = true;
    p[0].crossed_out = true;
    p[0].stroke_ids = p[0].stroke_ids.slice();
  }), /^the part 1 is crossed out, so it holds no final answer$/, /^the first error is at the part 1, which is crossed out/);
  expectOnly(parts((p, m) => {
    p.push({ ...p[1], stroke_ids: [], final_answer: true, crossed_out: true });
    p[1].stroke_ids.length && p[2].stroke_ids.push(p[1].stroke_ids.pop());
    m.truth.answer_slots[0] = reason("UNREADABLE_SEVERAL_FINAL_ANSWERS");
  }), /^the part 3 is crossed out, so it holds no final answer$/, /^the truth is UNREADABLE_SEVERAL_FINAL_ANSWERS, and 1 part holds a final answer: two at least$/);
  expectOnly(parts((p) => (p[0].illegible = true)));
  expectOnly(parts((p, m) => m.truth.answer_slots.push({ answer_slot: { item: 2, slot: 1 }, value: "3" })), /^a part holds the final answer, so the task's answer slot is the one bound anywhere, and the truth names 2$/);
  expectOnly(parts((p, m) => (m.truth.answer_slots[0] = reason("UNREADABLE_BLANK"))), /^one part holds the final answer, so its truth is a value, UNREADABLE_ILLEGIBLE or UNREADABLE_AMBIGUOUS, not "UNREADABLE_BLANK"$/);
  expectOnly(parts((p, m) => (m.truth.answer_slots[0] = reason("UNREADABLE_ILLEGIBLE"))));
  expectOnly(parts((p, m) => (m.truth.answer_slots[0] = reason("UNREADABLE_SEVERAL_FINAL_ANSWERS"))), /^the truth is UNREADABLE_SEVERAL_FINAL_ANSWERS, and 1 part holds a final answer: two at least$/);
  expectOnly(parts((p, m) => (m.truth.answer_slots[0] = reason("UNREADABLE_NO_FINAL_ANSWER"))), /^the truth is UNREADABLE_NO_FINAL_ANSWER, and 1 part holds one$/);
  expectOnly(parts((p, m) => {
    p[1].final_answer = false;
    m.truth.answer_slots[0] = reason("UNREADABLE_NO_FINAL_ANSWER");
  }));
  expectOnly(parts((p) => (p[0].final_answer = true)), /^2 parts hold a final answer, so the truth is UNREADABLE_SEVERAL_FINAL_ANSWERS$/);
  expectOnly(parts((p, m) => {
    p[0].final_answer = true;
    m.truth.answer_slots[0] = reason("UNREADABLE_SEVERAL_FINAL_ANSWERS");
  }));
});

test("the people's marks of an essay: of its text, ascending by criterion", () => {
  const marks = (edit) => markup(essay(), (m) => edit(m.marks.marks, m));
  expectOnly(marks((list, m) => m.truth.answer_slots.push({ answer_slot: { item: 2, slot: 1 }, value: "x" })), /^an essay's truth is its one answer slot, bound sheet, and the truth names 2$/);
  expectOnly(marks((list, m) => (m.truth.answer_slots[0] = reason("UNREADABLE_AMBIGUOUS"))), /^an essay is its text, blank or illegible, not "UNREADABLE_AMBIGUOUS"$/);
  expectOnly(marks((list, m) => (m.truth.answer_slots[0] = reason("UNREADABLE_ILLEGIBLE"))), /^an essay that cannot be read reaches no assessment, so no criterion has a mark$/);
  expectOnly(marks((list, m) => {
    m.truth.answer_slots[0] = reason("UNREADABLE_ILLEGIBLE");
    list.splice(0);
  }));
  expectOnly(marks((list) => (list[0].criterion = 0)), /^the criterion 0 is no place in a rubric, from 1$/);
  expectOnly(marks((list) => list.reverse()), /^the criterion \d comes after \d: the marks go ascending, each once$/);
});

test("the image names only the kinds of part the rules know", () => {
  const more = structuredClone(image);
  const file = more.file.find((one) => one.package === "novatrail.eval.v1" && one.enumType?.some((each) => each.name === "PartKind"));
  file.enumType.find((one) => one.name === "PartKind").value.push({ name: "PART_KIND_TABLE", number: 3 });
  assert.match(sampleOf(more).error, /^novatrail\.eval\.v1\.PartKind has PART_KIND_TABLE, which the rules of contracts\/README\.md, section 11 do not name/);
});

test("the breaches of a sample name where they are", () => {
  const parted = breaches(changed(drawing(), (s) => (s.markup.parts.parts[1].text = "")));
  assert.deepEqual(parted.map((one) => one.at), [["markup", "parts", "parts", 1, "text"]]);
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
