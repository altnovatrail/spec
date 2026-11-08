// The sample file of the eval protocol, novatrail.eval.v1.Sample (contracts/README.md, section 11;
// R93, R95; RUN.md, T58, T60): whether a file is a sample as a writer writes it and as the rules of
// section 11 let it be — the fields its purpose and its writer give it, its strokes, its sheet or
// page, its crops and their PNG, and its markup, as far as the file alone holds it. The samples
// among the examples of contracts/examples/eval/v1/ pass it, and together show every purpose,
// writer, ink, surface and event of the history of writing, and every kind of part of a markup.
//
// A sample is read as section 11 reads one: UTF-8 JSON with no key twice, which @bufbuild/protobuf
// reads strictly by the descriptors of the image buf builds of contracts/ — a field it does not know
// is refused — and whose text is the one it writes back with the protobuf names and every field, its
// zero too. Then the rules no descriptor holds, and, once its sheet or page holds its form, those
// of section 12 (tools/contracts/strokes.mjs): the numbers of every crop are those the rule of the
// crop gives the strokes the file holds, and the groups and the boxes of a history those its rules
// give. A PNG is held to its chunks, its header and its size, not to its pixels.

import fs from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import zlib from "node:zlib";
import { createFileRegistry, fromJson, toJson } from "@bufbuild/protobuf";
import * as wkt from "@bufbuild/protobuf/wkt";
import { ESSAY_REASONS, REASONS, WHITE_SPACE, differenceOf, readVector } from "./observation.mjs";
import { isObject } from "./rules.mjs";
import { CROP_RULE, cropSetOf, fold, groupsOf, heightsOf, historyBreaches, labelOf, numbersOf, ruleDifference, tableOf } from "./strokes.mjs";

export { labelOf };

export const PACKAGE = "novatrail.eval.v1";
export const FOLDER = "contracts/examples/eval/v1";
const TEXT = "contracts/README.md, section 11";
const WRITTEN = { useProtoFieldName: true, alwaysEmitImplicit: true };

// The heights of a digit a sample's crops are drawn at, px, beside the module's own; the tallest a
// crop takes.
export const HEIGHTS = CROP_RULE.heights;
const TALLEST = 256;
const LICENSE = "Apache-2.0";
// Each purpose and each writer, as the rules of section 11 name them; a value the package adds is
// named here by the task that adds it.
export const PURPOSES = ["PURPOSE_MEASUREMENT", "PURPOSE_EVAL_SET"];
export const WRITERS = ["WRITER_ADULT", "WRITER_ADULT_AS_CHILD", "WRITER_CHILD"];
const ADULTS = new Set(["WRITER_ADULT", "WRITER_ADULT_AS_CHILD"]);
const EVENTS = ["write", "erase", "clear", "undo"];
// Each kind of a part of the writing, as the rules of section 11 name them; what a markup shows of
// the examples' coverage beside them.
export const PART_KINDS = ["PART_KIND_TEXT", "PART_KIND_DRAWING"];
const MARKUP = ["parts", "marks", "first_error", "final_answer", "a workbook's truth"];
const BLANK = "UNREADABLE_BLANK";
const ONE_ANSWER = new Set(["UNREADABLE_ILLEGIBLE", "UNREADABLE_AMBIGUOUS"]);
const SEVERAL = "UNREADABLE_SEVERAL_FINAL_ANSWERS";
const NONE = "UNREADABLE_NO_FINAL_ANSWER";
const SOURCES = ["modules", "tutor", "file"];

export const ID = /^[a-z0-9-]{1,64}$/;
// Whether a string is the ID of a module, or a local ID — of a trap, say —, as the module format's
// schemas define them (format/schemas/common.schema.json, $defs module_id and local_id): the
// pattern, the length, and no name Windows reserves for a device.
const COMMON = JSON.parse(fs.readFileSync(new URL("../../format/schemas/common.schema.json", import.meta.url), "utf8")).$defs;
const idOf = ({ pattern, maxLength, not }) => (value) => typeof value === "string" && new RegExp(pattern, "u").test(value) && [...value].length <= maxLength && !new RegExp(not.pattern, "u").test(value);
export const isModuleId = idOf(COMMON.module_id);
export const isLocalId = idOf(COMMON.local_id);
const CODE = /^[0-9A-Z]{6,16}$/;
const TEXT_SET = /^[A-Za-z0-9.-]{1,32}$/;
const VERSION = /^(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)$/;
// The versions of a file that the samples page did not write (the amendment of 2026-11-07 to R93):
// no release of canvas is 0.0.0, and its page names no set of texts "none".
const NOT_THE_PAGE = { canvas_version: "0.0.0", text_set_version: "none" };
export const TAG = /^v(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)$/;
const DIGEST = /^sha256:[0-9a-f]{64}$/;
const SEED = /^(?:0|[1-9][0-9]*)$/;
const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

export const show = (value) => JSON.stringify(value);
const isSeed = (seed) => typeof seed === "string" && SEED.test(seed) && BigInt(seed) < 2n ** 64n;
export const placeOf = ({ item, slot }) => `${item}.${slot}`;
export const byPlace = (a, b) => a.item - b.item || a.slot - b.slot;

// A message of the package, of the image buf builds of contracts/: { message }, or { error }, also
// when an enum named has a value that the rules of the text do not name. The sample file's and the
// runner's report's (tools/contracts/report.mjs).
export function messageOf(image, { name, what, text, enums }) {
  const set = fromJson(wkt.FileDescriptorSetSchema, image, { ignoreUnknownFields: true });
  const known = new Map(Object.values(wkt).filter((value) => value?.kind === "file").map((file) => [file.proto.name, file]));
  const resolve = (file) => set.file.find((proto) => proto.name === file) ?? known.get(file);
  const registry = createFileRegistry(...set.file.filter((proto) => proto.package === PACKAGE).map((proto) => createFileRegistry(proto, resolve)));
  const message = registry.getMessage(`${PACKAGE}.${name}`);
  if (!message) return { error: `the image of buf build has no ${PACKAGE}.${name}, ${what}` };
  for (const [enumName, values] of enums) {
    const named = registry.getEnum(`${PACKAGE}.${enumName}`)?.values.map((value) => value.name).filter((value) => !value.endsWith("_UNSPECIFIED")) ?? [];
    const unnamed = named.filter((value) => !values.includes(value));
    if (unnamed.length) return { error: `${PACKAGE}.${enumName} has ${unnamed.join(", ")}, which the rules of ${text} do not name; the task that adds a value extends the check` };
  }
  return { message };
}

// The message Sample: { message }, or { error }, also when an enum of the sample has a value that the
// rules of section 11 do not name.
export const sampleOf = (image) => messageOf(image, { name: "Sample", what: "the message of the sample file", text: TEXT, enums: [["Purpose", PURPOSES], ["Writer", WRITERS], ["PartKind", PART_KINDS]] });

// A file of the package, its bytes, read as section 11 reads a sample — UTF-8 JSON with no key twice,
// read strictly by the message and as a writer writes it, with the text of the rules named —:
// { value, lineOf }, or { problems }.
export function readMessage(bytes, message, { what, text }) {
  const read = readVector(bytes);
  if (read.problems) return { problems: read.problems };
  const { value, lineOf } = read;
  if (!isObject(value)) return { problems: [{ line: 1, message: `${what} is an object, ${message.typeName}` }] };
  let written;
  try {
    written = toJson(message, fromJson(message, value), WRITTEN);
  } catch (error) {
    return { problems: [{ line: 1, message: `it does not read as ${message.typeName}: ${error.message}` }] };
  }
  if (!isDeepStrictEqual(written, value)) {
    const at = differenceOf(value, written);
    return { problems: [{ line: lineOf(at), message: `it is not as a writer writes it, with the protobuf names and every field, its zero too (${text}): at ${at.join(".") || "its top"}` }] };
  }
  return { value, lineOf };
}

// What a PNG breaks of a crop's (section 11): its signature, every chunk whole with its CRC, the
// chunks IHDR, IDAT and IEND alone, in that order, a grey image of 8 bits of the crop's width and
// height, not interlaced, whose data is one zlib stream, nothing after it, that inflates to its
// rows, each with a filter of PNG.
export function pngBreaches(bytes, width, height) {
  if (bytes.length < 8 || !bytes.subarray(0, 8).equals(SIGNATURE)) return ["it does not begin with the signature of a PNG"];
  const chunks = [];
  let at = 8;
  while (at < bytes.length) {
    if (at + 12 > bytes.length) return ["a chunk is cut short"];
    const length = bytes.readUInt32BE(at);
    const type = bytes.toString("latin1", at + 4, at + 8);
    if (at + 12 + length > bytes.length) return [`the chunk ${show(type)} is cut short`];
    if (zlib.crc32(bytes.subarray(at + 4, at + 8 + length)) !== bytes.readUInt32BE(at + 8 + length)) return [`the chunk ${show(type)} fails its CRC`];
    chunks.push({ type, data: bytes.subarray(at + 8, at + 8 + length) });
    at += 12 + length;
    if (type === "IEND") break;
  }
  if (at !== bytes.length) return ["bytes follow IEND"];
  const types = chunks.map((chunk) => chunk.type);
  const other = [...new Set(types.filter((type) => !["IHDR", "IDAT", "IEND"].includes(type)))];
  if (other.length) return [`it holds ${other.join(", ")}: a crop's PNG holds the chunks IHDR, IDAT and IEND alone, and no ancillary chunk`];
  if (!/^IHDR(?:IDAT)+IEND$/.test(types.join(""))) return [`its chunks are ${types.join(", ")}: IHDR, then IDAT, one or more in a row, then IEND`];
  const header = chunks[0].data;
  if (header.length !== 13) return ["its IHDR is not 13 bytes"];
  const found = [];
  const [shownWidth, shownHeight] = [header.readUInt32BE(0), header.readUInt32BE(4)];
  if (shownWidth !== width || shownHeight !== height) found.push(`it is ${shownWidth} × ${shownHeight} px, and the crop ${width} × ${height}`);
  if (header[8] !== 8 || header[9] !== 0) found.push(`its bit depth is ${header[8]} and its colour type ${header[9]}: a crop is grey, 8 bits, colour type 0`);
  if (header[10] !== 0 || header[11] !== 0 || header[12] !== 0) found.push("its compression, filter method or interlace is not 0");
  if (found.length === 0) {
    const data = Buffer.concat(chunks.filter((chunk) => chunk.type === "IDAT").map((chunk) => chunk.data));
    let inflated;
    try {
      inflated = zlib.inflateSync(data, { info: true });
    } catch (error) {
      return [`its IDAT does not inflate: ${error.message}`];
    }
    const rows = inflated.buffer;
    // zlib stops at the end of its stream, and what follows it would hold anything.
    if (inflated.engine.bytesWritten !== data.length) found.push(`its IDAT holds ${data.length - inflated.engine.bytesWritten} bytes after the end of its zlib stream`);
    if (rows.length !== height * (1 + width)) found.push(`its IDAT inflates to ${rows.length} bytes, and ${height} rows of ${width} px are ${height * (1 + width)}`);
    else {
      const row = Array.from({ length: height }, (_, y) => rows[y * (1 + width)]).findIndex((filter) => filter > 4);
      if (row >= 0) found.push(`its row ${row + 1} has the filter ${rows[row * (1 + width)]}, and a PNG's filters are 0 to 4`);
    }
  }
  return found;
}

// What the strokes of a sample break, on a sheet or page of the size given, and the IDs of the
// strokes it shows at the end.
function strokesOf(sample, size, breach) {
  const visible = new Set();
  const onSurface = (point, at) => {
    for (const [axis, most] of [["x", size.width], ["y", size.height]]) {
      const value = point[axis];
      if (!Number.isFinite(value) || value < 0 || value > most) breach([...at, axis], `${axis} is ${show(value)}, off the ${size.kind}, from 0 to ${most}`);
      else if (Math.round(value * 10) / 10 !== value) breach([...at, axis], `${axis} is ${value}, and a place is written to a tenth`);
    }
  };
  if ("history" in sample) {
    const events = (at) => ["history", "events", ...at];
    for (const id of historyBreaches(sample.history.events, (at, message) => breach(events(at), message), (point, at) => onSurface(point, events(at)))) visible.add(id);
  } else if ("geometry" in sample) {
    sample.geometry.strokes.forEach((stroke, i) => {
      const at = ["geometry", "strokes", i];
      if (stroke.id !== i + 1) breach([...at, "id"], `stroke ${i + 1} has the ID ${stroke.id}: the final geometry numbers its strokes by place, from 1`);
      visible.add(stroke.id);
      if (stroke.points.length === 0) breach([...at, "points"], `the stroke ${stroke.id} has no point`);
      stroke.points.forEach((point, j) => onSurface(point, [...at, "points", j]));
    });
  } else {
    breach([], "the sample holds neither history nor geometry");
    return null;
  }
  return visible;
}

// IDs of strokes, ascending and each shown on the surface named: what a group, a box or a part names
// breaks of that.
function idsBreaches(ids, visible, at, what, breach, surface = at[0]) {
  if (ids.length === 0) breach(at, `${what} has no stroke`);
  if (ids.some((id, i) => i > 0 && id <= ids[i - 1])) breach(at, `${what} names its strokes ${show(ids)}, and they go ascending, each once`);
  if (visible) for (const id of ids) if (!visible.has(id)) breach(at, `${what} names the stroke ${id}, which the ${surface} does not show`);
}

// What the crops of one set of strokes break: one at each height of eval and at the module's, in
// order, each of whole and positive sizes, with the frames of the groups' labels given — on a
// workbook, null, and none — and its PNG.
function cropsBreaches(set, at, digit, labels, breach) {
  const box = set.ink_box;
  if (!box || box.ymin > box.ymax || box.xmin > box.xmax) breach([...at, "ink_box"], `ink_box is ${show(box)}: the box of the points, ymin no more than ymax and xmin no more than xmax`);
  if (set.bundle_median < 1) breach([...at, "bundle_median"], `bundle_median is ${set.bundle_median}, and h_med is a height of 1 tenth at least`);
  const heights = heightsOf(digit);
  const given = set.crops.map((crop) => crop.digit_height);
  if (!isDeepStrictEqual(given, heights)) breach([...at, "crops"], `the crops are at ${show(given)} px, and a sample's are at the heights of eval and the module's, ${show(heights)}`);
  set.crops.forEach((crop, i) => {
    const where = [...at, "crops", i];
    if (crop.drawn_height < 1 || crop.drawn_height > crop.digit_height) breach([...where, "drawn_height"], `drawn_height is ${crop.drawn_height}, from 1 to the height asked for, ${crop.digit_height}`);
    if (crop.width < 1 || crop.height < 1 || crop.margin_top < 0 || crop.margin_left < 0) breach(where, `the crop is ${crop.width} × ${crop.height} px with margins ${crop.margin_top} and ${crop.margin_left}: sizes of 1 px at least, margins of 0 at least`);
    if (!(crop.scale > 0) || !Number.isFinite(crop.scale) || !(crop.line_width > 0) || !Number.isFinite(crop.line_width)) breach(where, `scale ${show(crop.scale)} and line_width ${show(crop.line_width)} are positive numbers`);
    const sheet = crop.sheet_box;
    if (!sheet || !(sheet.ymin < sheet.ymax) || !(sheet.xmin < sheet.xmax)) breach([...where, "sheet_box"], `sheet_box is ${show(sheet)}: ymin less than ymax, xmin less than xmax`);
    const named = crop.frames.map((frame) => frame.label);
    if (!isDeepStrictEqual(named, labels ?? [])) breach([...where, "frames"], `the frames are of ${show(named)}, and ${labels ? `the groups are ${show(labels)}` : "a workbook has none"}`);
    crop.frames.forEach((frame, j) => {
      const b = frame.box;
      if (!b || ![b.ymin, b.xmin, b.ymax, b.xmax].every((n) => n >= 0 && n <= 1000) || b.ymin >= b.ymax || b.xmin >= b.xmax) breach([...where, "frames", j], `the frame of ${frame.label} is ${show(b)}: whole thousandths from 0 to 1000, ymin less than ymax and xmin less than xmax`);
    });
    for (const text of pngBreaches(Buffer.from(crop.png, "base64"), crop.width, crop.height)) breach([...where, "png"], `the PNG at ${crop.digit_height} px: ${text}`);
  });
}

// What a crop set breaks of the numbers the rule of the crop gives the strokes it is of: the first
// number that differs, if any. Its PNG aside: the rule gives no pixels.
function cropRuleBreaches(given, strokes, groups, digit, at) {
  const parted = ruleDifference(numbersOf(given), cropSetOf(strokes, groups, digit));
  return parted ? [{ at: [...at, ...parted.at], message: `${parted.at.join(".")} of the crops is ${show(parted.given)}, and the rule of the crop gives ${show(parted.computed)} (contracts/README.md, section 12)` }] : [];
}

// What a sample, whose form holds, breaks of the rules of section 12. The crops are drawn from the
// strokes the file holds — those a history shows at the end, or the final geometry —, a sheet's
// with its groups and a box's with none. A history holds the strokes as they came, so its groups
// on a sheet and its table of boxes on a workbook are what the rules give them; the final geometry
// holds them no more as the device saw them, so its groups and table are the device's.
function rulesBreaches(sample, kind) {
  const found = [];
  const surface = sample[kind];
  let strokes = sample.geometry?.strokes;
  if (sample.history) {
    const { written, visible } = fold(sample.history.events);
    strokes = visible.map((id) => written.get(id));
  }
  const byId = new Map(strokes.map((stroke) => [stroke.id, stroke]));
  if (kind === "sheet") {
    const groups = sample.history && groupsOf(strokes).groups;
    if (groups && !isDeepStrictEqual(surface.groups, groups)) found.push({ at: ["sheet", "groups"], message: `the groups are ${show(surface.groups)}, and the rule of groups gives the strokes the sheet shows ${show(groups)} (contracts/README.md, section 12)` });
    if (surface.crops) found.push(...cropRuleBreaches(surface.crops, strokes, surface.groups, surface.digit_height, ["sheet", "crops"]));
  } else {
    const table = sample.history && tableOf(strokes, surface.boxes).filled_boxes;
    const given = surface.filled_boxes.map((box) => ({ answer_slot: box.answer_slot, stroke_ids: box.stroke_ids }));
    if (table && !isDeepStrictEqual(given, table)) found.push({ at: ["workbook", "filled_boxes"], message: `the filled boxes are ${show(given)}, and the rule of boxes gives the strokes the page shows ${show(table)} (contracts/README.md, section 12)` });
    surface.filled_boxes.forEach((box, i) => found.push(...cropRuleBreaches(box.crops, box.stroke_ids.map((id) => byId.get(id)), [], surface.digit_height, ["workbook", "filled_boxes", i, "crops"])));
  }
  return found;
}

// What a sample's markup breaks of the rules of section 11 that the file alone holds: its truth,
// its notes, and its parts or marks by the surface, with the strokes the surface shows. What only
// the task holds — that the truth is a valid observation of it, a final answer only beside a slot
// bound anywhere, the marks of criteria its rubric has — is the runner's (section 13).
function markupBreaches(sample, kind, visible, breach) {
  const { markup } = sample;
  const at = (...rest) => ["markup", ...rest];
  if (!markup.truth) {
    breach(at(), "the markup has no truth: every answer slot that AI reads, as a reader that reads right gives it");
    return;
  }
  const truth = markup.truth.answer_slots;
  const places = new Map();
  truth.forEach((slot, i) => {
    const where = at("truth", "answer_slots", i);
    const place = slot.answer_slot;
    if (!place || place.item < 1 || place.slot < 1) breach([...where, "answer_slot"], `the answer slot is at ${show(place)}: an item and a slot, each from 1`);
    else {
      if (i > 0 && truth[i - 1].answer_slot && byPlace(truth[i - 1].answer_slot, place) >= 0) breach([...where, "answer_slot"], `the answer slot ${placeOf(place)} comes after ${placeOf(truth[i - 1].answer_slot)}: the truth goes in the task's order, each once`);
      places.set(placeOf(place), slot);
    }
    if ("value" in slot) {
      if (WHITE_SPACE.test(slot.value)) breach([...where, "value"], `the value ${show(slot.value)} is empty or only white space: where nothing is written, the slot is blank`);
    } else if ("unreadable" in slot) {
      if (!REASONS.has(slot.unreadable)) breach([...where, "unreadable"], `the reason ${show(slot.unreadable)} is none of the observation's (contracts/README.md, section 10)`);
    } else breach(where, `the answer slot ${placeOf(place ?? {})} gives neither a value nor a reason`);
    if ("crop_box" in slot) breach([...where, "crop_box"], "the truth gives no box on a crop: the parts and their strokes say where the answer is");
  });
  if (visible?.size === 0) {
    truth.forEach((slot, i) => {
      if (slot.unreadable !== BLANK) breach(at("truth", "answer_slots", i), `the ${kind === "sheet" ? "sheet" : "page"} shows no stroke, so every answer slot is ${BLANK}`);
    });
  }
  markup.notes.forEach((note, i) => {
    const where = at("notes", i);
    const place = note.answer_slot;
    const slot = place && places.get(placeOf(place));
    if (!slot) breach([...where, "answer_slot"], `the note is of ${show(place)}, which is none of the truth's answer slots`);
    else if (i > 0 && markup.notes[i - 1].answer_slot && byPlace(markup.notes[i - 1].answer_slot, place) >= 0) breach([...where, "answer_slot"], `the note of ${placeOf(place)} comes after that of ${placeOf(markup.notes[i - 1].answer_slot)}: the notes go ascending by place, each once`);
    if (!note.mirrored && !note.crossed_out) breach(where, `the note of ${placeOf(place ?? {})} sets nothing apart: a note is only of an answer slot it sets apart`);
    if (note.mirrored && slot && slot.unreadable !== "UNREADABLE_AMBIGUOUS") breach([...where, "mirrored"], `a mirrored digit is read as UNREADABLE_AMBIGUOUS, and the truth of ${placeOf(place)} is ${show(slot.value ?? slot.unreadable)}`);
  });
  if (kind === "workbook") {
    const boxes = sample.workbook.boxes.map((box) => placeOf(box.answer_slot ?? {}));
    const given = truth.map((slot) => placeOf(slot.answer_slot ?? {}));
    if (!isDeepStrictEqual(given, boxes)) breach(at("truth", "answer_slots"), `the truth names the boxes ${show(given)}, and on a workbook it names every box of the page, in order: ${show(boxes)}`);
    const filled = new Set(sample.workbook.filled_boxes.map((box) => placeOf(box.answer_slot ?? {})));
    truth.forEach((slot, i) => {
      if (slot.answer_slot && !filled.has(placeOf(slot.answer_slot)) && slot.unreadable !== BLANK) breach(at("truth", "answer_slots", i), `the box ${placeOf(slot.answer_slot)} holds no stroke, so its truth is ${BLANK}`);
    });
    if ("parts" in markup || "marks" in markup) breach(at(), "a workbook's markup has neither parts nor marks: its places are its boxes");
    return;
  }
  if ("parts" in markup) partsBreaches(markup, truth, visible, at, breach);
  else if ("marks" in markup) marksBreaches(markup, truth, at, breach);
  else breach(at(), "a sheet's markup gives the parts of its solution, or the people's marks of its essay");
}

// What the parts of a solution break: their kinds and texts, every stroke the sheet shows in one
// part, the first error at a part not crossed out, and the parts that hold the final answer
// against the truth of the one answer slot bound anywhere.
function partsBreaches(markup, truth, visible, at, breach) {
  const { parts } = markup.parts;
  if (visible?.size && parts.length === 0) breach(at("parts"), "the sheet shows strokes, and the markup names no part: each stroke is in one");
  if (visible?.size === 0 && parts.length) breach(at("parts"), "the sheet shows no stroke, so its markup has no part");
  const counted = new Map();
  parts.forEach((part, i) => {
    const where = at("parts", "parts", i);
    if (!PART_KINDS.includes(part.kind)) breach([...where, "kind"], `the part ${i + 1} is of the kind ${show(part.kind)}, and a part is ${PART_KINDS.join(" or ")}`);
    if (WHITE_SPACE.test(part.text)) breach([...where, "text"], `the part ${i + 1} has no text: a text as written, or a drawing described in words`);
    idsBreaches(part.stroke_ids, visible, [...where, "stroke_ids"], `the part ${i + 1}`, breach, "sheet");
    for (const id of part.stroke_ids) counted.set(id, (counted.get(id) ?? 0) + 1);
    if (part.final_answer && part.crossed_out) breach([...where, "final_answer"], `the part ${i + 1} is crossed out, so it holds no final answer`);
  });
  if (visible && parts.length) for (const id of visible) if (counted.get(id) !== 1) breach(at("parts", "parts"), `the stroke ${id} is in ${counted.get(id) ?? 0} parts, and every stroke the sheet shows is in one`);
  if ("first_error" in markup.parts) {
    const place = markup.parts.first_error;
    if (place < 1 || place > parts.length) breach(at("parts", "first_error"), `the first error is at the part ${place}, and the parts are 1 to ${parts.length}`);
    else if (parts[place - 1].crossed_out) breach(at("parts", "first_error"), `the first error is at the part ${place}, which is crossed out and no part of the solution`);
  }
  // A part crossed out holds no final answer, whatever it says: its breach is named above.
  const finals = parts.filter((part) => part.final_answer && !part.crossed_out).length;
  if (finals && truth.length !== 1) breach(at("truth", "answer_slots"), `a part holds the final answer, so the task's answer slot is the one bound anywhere, and the truth names ${truth.length}`);
  for (const [i, slot] of truth.entries()) {
    const where = at("truth", "answer_slots", i);
    if (slot.unreadable === SEVERAL && finals < 2) breach(where, `the truth is ${SEVERAL}, and ${finals} part${finals === 1 ? " holds" : "s hold"} a final answer: two at least`);
    else if (slot.unreadable === NONE && finals) breach(where, `the truth is ${NONE}, and ${finals} part${finals === 1 ? " holds" : "s hold"} one`);
    else if (finals === 1 && truth.length === 1 && "unreadable" in slot && !ONE_ANSWER.has(slot.unreadable)) breach(where, `one part holds the final answer, so its truth is a value, UNREADABLE_ILLEGIBLE or UNREADABLE_AMBIGUOUS, not ${show(slot.unreadable)}`);
    else if (finals > 1 && slot.unreadable !== SEVERAL) breach(where, `${finals} parts hold a final answer, so the truth is ${SEVERAL}`);
  }
}

// What the people's marks of an essay break: the truth of its one answer slot, its text or why
// there is none, and the criteria, ascending and each once, marked only when there is text.
function marksBreaches(markup, truth, at, breach) {
  const { marks } = markup.marks;
  if (truth.length !== 1) breach(at("truth", "answer_slots"), `an essay's truth is its one answer slot, bound sheet, and the truth names ${truth.length}`);
  else if (!("value" in truth[0]) && !ESSAY_REASONS.has(truth[0].unreadable)) breach(at("truth", "answer_slots", 0), `an essay is its text, blank or illegible, not ${show(truth[0].unreadable)}`);
  else if (marks.length && !("value" in truth[0])) breach(at("marks", "marks"), "an essay that cannot be read reaches no assessment, so no criterion has a mark");
  marks.forEach((mark, i) => {
    if (mark.criterion < 1) breach(at("marks", "marks", i, "criterion"), `the criterion ${mark.criterion} is no place in a rubric, from 1`);
    else if (i > 0 && mark.criterion <= marks[i - 1].criterion) breach(at("marks", "marks", i, "criterion"), `the criterion ${mark.criterion} comes after ${marks[i - 1].criterion}: the marks go ascending, each once`);
  });
}

// What a sample, as JSON with the protobuf names, breaks of the rules of section 11: each { at,
// message }, with at its path in the file; none when it is valid.
export function breaches(sample) {
  const found = [];
  const breach = (at, message) => found.push({ at, message });
  if (sample.protocol !== PACKAGE) breach(["protocol"], `protocol is ${show(sample.protocol)}, and the file is read as ${show(PACKAGE)} alone`);
  if (!ID.test(sample.id)) breach(["id"], `the ID ${show(sample.id)} is not 1 to 64 lowercase Latin letters, digits and hyphens`);
  const { purpose, writer } = sample;
  if (!PURPOSES.includes(purpose)) breach(["purpose"], `purpose is ${show(purpose)}, and a sample is made for ${PURPOSES.join(" or ")}`);
  if (!WRITERS.includes(writer)) breach(["writer"], `writer is ${show(writer)}, and a sample is written by ${WRITERS.join(", ")}`);
  if (!("person" in sample) && !("synthetic" in sample)) breach([], "the sample says neither person nor synthetic: who or what made its strokes");
  if ("synthetic" in sample && !isSeed(sample.synthetic.seed)) breach(["synthetic", "seed"], `the seed ${show(sample.synthetic.seed)} is not an unsigned integer of 64 bits in decimal digits`);
  const versions = { text_set_version: [TEXT_SET, "1 to 32 Latin letters, digits, dots and hyphens"], canvas_version: [VERSION, "MAJOR.MINOR.PATCH"] };
  for (const [field, [form, words]] of Object.entries(versions)) {
    if (!form.test(sample[field])) breach([field], `${field} ${show(sample[field])} is not ${words}`);
    else if ("synthetic" in sample && sample[field] !== NOT_THE_PAGE[field]) breach([field], `a synthetic sample was not written by the samples page, so its ${field} is ${show(NOT_THE_PAGE[field])}, not ${show(sample[field])}`);
  }

  // What the purpose and the writer give the sample.
  if (purpose === "PURPOSE_EVAL_SET") {
    if (writer === "WRITER_CHILD") breach(["writer"], "a sample of an eval set is written by an adult, never by a child");
    if ("writer_code" in sample) breach(["writer_code"], "a sample of an eval set has no writer's code: it would link published samples with each other");
    if (sample.license !== LICENSE) breach("license" in sample ? ["license"] : [], `a sample of an eval set names its license, ${show(LICENSE)}`);
    if ("history" in sample) breach(["history"], "a sample of an eval set holds the final geometry, not the history of writing");
  } else if (purpose === "PURPOSE_MEASUREMENT") {
    if (!("writer_code" in sample)) breach([], "a sample of measurement has its writer's code");
    else if (!CODE.test(sample.writer_code)) breach(["writer_code"], `the writer's code ${show(sample.writer_code)} is not 6 to 16 digits and capital Latin letters`);
    if ("license" in sample) breach(["license"], "a sample of measurement names no license: it is not published");
    if (ADULTS.has(writer) && "geometry" in sample) breach(["geometry"], "a sample of measurement by an adult holds the history of writing, not the final geometry");
    if (writer === "WRITER_CHILD" && "history" in sample) breach(["history"], "a sample of a child holds the final geometry, never the history of writing");
  }

  // The task, without its key.
  const { task } = sample;
  if (!task) breach([], "the sample names no task");
  else {
    const source = SOURCES.find((name) => name in task);
    const form = (at, value, pattern, what) => {
      if (!pattern.test(value)) breach(["task", ...at], `${what} ${show(value)} is not ${pattern === DIGEST ? "sha256: and 64 lowercase hexadecimal digits" : pattern === TAG ? "a tag vMAJOR.MINOR.PATCH" : "MAJOR.MINOR.PATCH"}`);
    };
    const named = (at, value, what) => {
      if (value === "") breach(["task", ...at], `${what} is empty`);
    };
    if (source === "modules") {
      form(["modules", "tag"], task.modules.tag, TAG, "the tag");
      if (!isModuleId(task.modules.module)) breach(["task", "modules", "module"], `the module's ID ${show(task.modules.module)} is not the ID of a module, <publisher>/<name>, as the module format has it`);
      form(["modules", "version"], task.modules.version, VERSION, "the module's version");
      form(["modules", "package_digest"], task.modules.package_digest, DIGEST, "the package's digest");
    } else if (source === "tutor") {
      form(["tutor", "tag"], task.tutor.tag, TAG, "the tag");
      form(["tutor", "file_digest"], task.tutor.file_digest, DIGEST, "the file's digest");
      named(["tutor", "bank"], task.tutor.bank, "the bank");
      form(["tutor", "bank_digest"], task.tutor.bank_digest, DIGEST, "the bank's digest");
    } else if (source === "file") {
      form(["file", "file_digest"], task.file.file_digest, DIGEST, "the file's digest");
      named(["file", "bank"], task.file.bank, "the bank");
      form(["file", "bank_digest"], task.file.bank_digest, DIGEST, "the bank's digest");
    } else breach(["task"], "the task names no source: modules, tutor or file");
    named(["task"], task.task, "the task's ID");
    if ("seed" in task && !isSeed(task.seed)) breach(["task", "seed"], `the seed ${show(task.seed)} is not an unsigned integer of 64 bits in decimal digits`);
    form(["open_view_digest"], task.open_view_digest, DIGEST, "the digest of the open view");
  }

  // The surface, its strokes, and their groups, boxes and crops.
  const kind = "sheet" in sample ? "sheet" : "workbook" in sample ? "workbook" : null;
  if (!kind) {
    breach([], "the sample holds neither sheet nor workbook");
    return found;
  }
  const surface = sample[kind];
  const formed = found.length;
  const size = { kind: kind === "sheet" ? "sheet" : "page", width: surface.width, height: surface.height };
  if (surface.width < 1 || surface.height < 1) breach([kind], `the ${size.kind} is ${surface.width} × ${surface.height} units: 1 unit each way at least`);
  if (surface.digit_height < 1 || surface.digit_height > TALLEST) breach([kind, "digit_height"], `digit_height is ${surface.digit_height}, from 1 to ${TALLEST} px`);
  const visible = strokesOf(sample, size, breach);
  if (kind === "sheet") {
    const counted = new Map();
    surface.groups.forEach((group, i) => {
      const at = ["sheet", "groups", i];
      if (group.label !== labelOf(i)) breach([...at, "label"], `group ${i + 1} is labelled ${show(group.label)}, and the labels go A, B and on: ${show(labelOf(i))}`);
      idsBreaches(group.stroke_ids, visible, [...at, "stroke_ids"], `the group ${group.label}`, breach);
      for (const id of group.stroke_ids) counted.set(id, (counted.get(id) ?? 0) + 1);
    });
    if (visible) for (const id of visible) if (counted.get(id) !== 1) breach(["sheet", "groups"], `the stroke ${id} is in ${counted.get(id) ?? 0} groups, and every stroke the sheet shows is in one`);
    if (surface.crops) cropsBreaches(surface.crops, ["sheet", "crops"], surface.digit_height, surface.groups.map((group) => group.label), breach);
    else if (visible?.size) breach(["sheet"], "the sheet shows strokes and holds no crops");
    if (surface.crops && visible?.size === 0) breach(["sheet", "crops"], "the sheet shows no stroke, so it has no crop");
  } else {
    const places = new Set();
    surface.boxes.forEach((box, i) => {
      const at = ["workbook", "boxes", i];
      const place = box.answer_slot;
      if (!place || place.item < 1 || place.slot < 1) breach([...at, "answer_slot"], `the box is at ${show(place)}: an item and a slot, each from 1`);
      else {
        if (i > 0 && surface.boxes[i - 1].answer_slot && byPlace(surface.boxes[i - 1].answer_slot, place) >= 0) breach([...at, "answer_slot"], `the box ${placeOf(place)} comes after ${placeOf(surface.boxes[i - 1].answer_slot)}: the boxes go in the task's order, each once`);
        places.add(placeOf(place));
      }
      if (box.left < 0 || box.top < 0 || box.width < 1 || box.height < 1 || box.left + box.width > surface.width || box.top + box.height > surface.height) breach(at, `the box ${placeOf(place ?? {})} at ${box.left}, ${box.top}, ${box.width} × ${box.height} is not on the page, of 1 unit each way at least`);
    });
    const filled = new Set();
    surface.filled_boxes.forEach((box, i) => {
      const at = ["workbook", "filled_boxes", i];
      const place = box.answer_slot;
      if (!place || !places.has(placeOf(place))) breach([...at, "answer_slot"], `the filled box ${show(place)} is none of the page's boxes`);
      else if (i > 0 && surface.filled_boxes[i - 1].answer_slot && byPlace(surface.filled_boxes[i - 1].answer_slot, place) >= 0) breach([...at, "answer_slot"], `the filled box ${placeOf(place)} comes after ${placeOf(surface.filled_boxes[i - 1].answer_slot)}: the filled boxes go in the task's order, each once`);
      idsBreaches(box.stroke_ids, visible, [...at, "stroke_ids"], `the box ${placeOf(place ?? {})}`, breach);
      for (const id of box.stroke_ids) {
        if (filled.has(id)) breach([...at, "stroke_ids"], `the stroke ${id} is in two boxes`);
        filled.add(id);
      }
      if (box.crops) cropsBreaches(box.crops, [...at, "crops"], surface.digit_height, null, breach);
      else breach(at, `the filled box ${placeOf(place ?? {})} holds no crops`);
    });
    if (visible && "geometry" in sample) for (const id of visible) if (!filled.has(id)) breach(["geometry"], `the stroke ${id} is in no box: the final geometry of a workbook holds the strokes of its boxes alone, and the draft goes nowhere`);
  }
  // The rules of section 12, once the sheet or the page holds its form.
  if (found.length === formed) found.push(...rulesBreaches(sample, kind));
  // The markup, which a sample may lack: the runner then measures nothing on it (section 13).
  if ("markup" in sample) markupBreaches(sample, kind, visible, breach);
  return found;
}

// A sample, its bytes, against the message: { problems, seen, value }, with seen what it shows of the
// package for the examples' coverage — its purpose, writer, ink, surface and events, and what its
// markup shows: its kinds of part, parts or marks, a first error, a final answer, a workbook's truth;
// and value the sample read.
export function checkSample(bytes, message) {
  const seen = new Set();
  const read = readMessage(bytes, message, { what: "a sample", text: TEXT });
  if (read.problems) return { problems: read.problems, seen };
  const { value, lineOf } = read;
  const problems = breaches(value).map(({ at, message: text }) => ({ line: lineOf(at), message: text }));
  seen.add(value.purpose).add(value.writer);
  for (const key of ["history", "geometry", "sheet", "workbook"]) if (key in value) seen.add(key);
  for (const event of value.history?.events ?? []) for (const name of EVENTS) if (name in event) seen.add(name);
  const { markup } = value;
  if (markup?.parts) {
    seen.add("parts");
    for (const part of markup.parts.parts) {
      seen.add(part.kind);
      if (part.final_answer) seen.add("final_answer");
    }
    if ("first_error" in markup.parts) seen.add("first_error");
  }
  if (markup?.marks) seen.add("marks");
  if (markup?.truth && "workbook" in value) seen.add("a workbook's truth");
  return { problems, seen, value, lineOf };
}

// Sample files against the message, each a [name, path to read]: { errors, seen, samples, held },
// the errors { file, line, message } of each file by its name, seen what they show together,
// samples the files that hold, by their IDs, and held each that holds, { file, line, value, lineOf },
// with line that of its ID, in the order of the files. Two of them may share an ID, which samples
// then holds by the last: sameIds finds them where the files are held together. spec's examples and the files another repository
// names are read by this same code (R93).
export function checkSamples(message, files) {
  const errors = [];
  const seen = new Set();
  const samples = new Map();
  const held = [];
  for (const [file, full] of files) {
    const { problems, seen: found, value, lineOf } = checkSample(fs.readFileSync(full), message);
    errors.push(...problems.map((one) => ({ file, ...one })));
    if (problems.length === 0) {
      samples.set(value.id, value);
      held.push({ file, line: lineOf(["id"]), value, lineOf });
    }
    for (const each of found) seen.add(each);
  }
  return { errors, seen, samples, held };
}

// Of the samples that hold, held as checkSamples gives them, the second of two with one ID and
// every one after it, with why their IDs are one each: by default, that a report names a sample by its
// ID, so the samples it is held to have one each.
const HELD = "a report names a sample by its ID, so the samples it is held to have one ID each";
export function sameIds(held, why = HELD) {
  const first = new Map();
  const errors = [];
  for (const { file, line, value: { id } } of held) {
    if (first.has(id)) errors.push({ file, line, message: `the ID ${id} is ${first.get(id)}'s too: ${why}` });
    else first.set(id, file);
  }
  return errors;
}

// What the samples of a module's eval set break of the rules of section 13 that need neither the
// module's package nor a key, held as checkSamples gives them, of the module by its ID: each is of
// the purpose PURPOSE_EVAL_SET, with its markup, of a task of its own module — its source is
// modules, with the module's ID —, and no two of the set share an ID. The task itself, and the
// digest of its open view, are the runner's to check, by the package (contracts/README.md, section
// 13).
const SET = "contracts/README.md, section 13";
export function evalSetBreaches(module, held) {
  const errors = [];
  for (const { file, value, lineOf } of held) {
    const breach = (at, message) => errors.push({ file, line: lineOf(at), message });
    if (value.purpose !== "PURPOSE_EVAL_SET") breach(["purpose"], `a sample of the eval set of ${module} is of the purpose PURPOSE_EVAL_SET, not ${show(value.purpose)} (${SET})`);
    if (!value.markup) breach([], `a sample of an eval set has its markup, which the runner measures AI by (${SET})`);
    const source = value.task?.modules;
    if (!source) breach(["task"], `a sample of the eval set of ${module} is of a task of that module: its source is modules (${SET})`);
    else if (source.module !== module) breach(["task", "modules", "module"], `a sample of the eval set of ${module} is of a task of that module, not of ${show(source.module)} (${SET})`);
  }
  errors.push(...sameIds(held, `no two samples of an eval set share an ID (${SET})`));
  return errors;
}

// The examples of the sample file at root, files of contracts/, by the image buf builds: the errors,
// { file, line, message } — each example's, and, when every one holds, what they lack together:
// every purpose, writer, ink, surface and event of the history of writing, and of a markup every
// kind of part, parts and marks, a first error, a final answer and a workbook's truth, and two of
// one ID; and samples, those that hold by their IDs, which the examples of the runner's report are
// of.
export function checkExamples(root, image, files) {
  const known = sampleOf(image);
  if (known.error) return { errors: [{ file: FOLDER, line: 0, message: known.error }], samples: new Map() };
  const { errors, seen, samples, held } = checkSamples(known.message, files.map((file) => [file, path.join(root, file)]));
  errors.push(...sameIds(held));
  if (errors.length === 0) {
    for (const each of [...PURPOSES, ...WRITERS, "history", "geometry", "sheet", "workbook", ...EVENTS, ...PART_KINDS, ...MARKUP]) {
      if (!seen.has(each)) errors.push({ file: FOLDER, line: 0, message: `no example shows ${each}: together the examples show every purpose, writer, ink, surface and event of ${TEXT}, and of a markup every kind of part, parts and marks, a first error, a final answer and a workbook's truth` });
    }
  }
  return { errors, samples };
}
