// The sample file of the eval protocol, novatrail.eval.v1.Sample (contracts/README.md, section 11;
// R93; RUN.md, T58): whether a file is a sample as a writer writes it and as the rules of section 11
// let it be — the fields its purpose and its writer give it, its strokes, its sheet or page, its
// crops and their PNG. The examples of contracts/examples/eval/v1/ pass it, and together show
// every purpose, writer, ink, surface and event of the history of writing.
//
// A sample is read as section 11 reads one: UTF-8 JSON with no key twice, which @bufbuild/protobuf
// reads strictly by the descriptors of the image buf builds of contracts/ — a field it does not know
// is refused — and whose text is the one it writes back with the protobuf names and every field, its
// zero too. Then the rules no descriptor holds. The numbers of a crop are the rule of the crop's,
// which a sample holds as the device drew them: the check holds their form, and the PNG to its
// chunks, its header and its size, not how the crop was drawn.

import fs from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import zlib from "node:zlib";
import { createFileRegistry, fromJson, toJson } from "@bufbuild/protobuf";
import * as wkt from "@bufbuild/protobuf/wkt";
import { readVector } from "./observation.mjs";
import { isObject } from "./rules.mjs";

export const PACKAGE = "novatrail.eval.v1";
export const FOLDER = "contracts/examples/eval/v1";
const TEXT = "contracts/README.md, section 11";
const SAMPLE = `${PACKAGE}.Sample`;
const WRITTEN = { useProtoFieldName: true, alwaysEmitImplicit: true };

// The heights of a digit a sample's crops are drawn at, px, beside the module's own; the tallest a
// crop takes.
export const HEIGHTS = [16, 24, 32, 48];
const TALLEST = 256;
const LICENSE = "Apache-2.0";
// Each purpose and each writer, as the rules of section 11 name them; a value the package adds is
// named here by the task that adds it.
export const PURPOSES = ["PURPOSE_MEASUREMENT", "PURPOSE_EVAL_SET"];
export const WRITERS = ["WRITER_ADULT", "WRITER_ADULT_AS_CHILD", "WRITER_CHILD"];
const ADULTS = new Set(["WRITER_ADULT", "WRITER_ADULT_AS_CHILD"]);
const EVENTS = ["write", "erase", "clear", "undo"];
const SOURCES = ["modules", "tutor", "file"];

const ID = /^[a-z0-9-]{1,64}$/;
const CODE = /^[0-9A-Z]{6,16}$/;
const TEXT_SET = /^[A-Za-z0-9.-]{1,32}$/;
const VERSION = /^(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)$/;
const TAG = /^v(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)$/;
const DIGEST = /^sha256:[0-9a-f]{64}$/;
const SEED = /^(?:0|[1-9][0-9]*)$/;
const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const show = (value) => JSON.stringify(value);
const isSeed = (seed) => typeof seed === "string" && SEED.test(seed) && BigInt(seed) < 2n ** 64n;
const placeOf = ({ item, slot }) => `${item}.${slot}`;
const byPlace = (a, b) => a.item - b.item || a.slot - b.slot;

// A group's label by its place: A to Z, then AA, AB and on.
export function labelOf(n) {
  let label = "";
  for (let rest = n + 1; rest > 0; rest = Math.floor((rest - 1) / 26)) label = String.fromCodePoint(65 + ((rest - 1) % 26)) + label;
  return label;
}

// The message Sample, of the image buf builds of contracts/: { message }, or { error }, also when an
// enum of the package has a value that the rules of section 11 do not name.
export function sampleOf(image) {
  const set = fromJson(wkt.FileDescriptorSetSchema, image, { ignoreUnknownFields: true });
  const known = new Map(Object.values(wkt).filter((value) => value?.kind === "file").map((file) => [file.proto.name, file]));
  const resolve = (name) => set.file.find((proto) => proto.name === name) ?? known.get(name);
  const registry = createFileRegistry(...set.file.filter((proto) => proto.package === PACKAGE).map((proto) => createFileRegistry(proto, resolve)));
  const message = registry.getMessage(SAMPLE);
  if (!message) return { error: `the image of buf build has no ${SAMPLE}, the message of the sample file` };
  for (const [name, values] of [["Purpose", PURPOSES], ["Writer", WRITERS]]) {
    const named = registry.getEnum(`${PACKAGE}.${name}`)?.values.map((value) => value.name).filter((value) => !value.endsWith("_UNSPECIFIED")) ?? [];
    const unnamed = named.filter((value) => !values.includes(value));
    if (unnamed.length) return { error: `${PACKAGE}.${name} has ${unnamed.join(", ")}, which the rules of ${TEXT} do not name; the task that adds a value extends the check` };
  }
  return { message };
}

// The first path at which two JSON values that differ do, for the line of a problem: a key the
// first has and the second lacks, or else the deepest member where they part.
function differenceOf(a, b, at = []) {
  if (Array.isArray(a) && Array.isArray(b)) {
    const i = a.findIndex((each, n) => !isDeepStrictEqual(each, b[n]));
    if (i >= 0) return differenceOf(a[i], b[i], [...at, i]);
  } else if (isObject(a) && isObject(b)) {
    const extra = Object.keys(a).find((key) => !(key in b));
    if (extra !== undefined) return [...at, extra];
    const key = Object.keys(b).find((name) => !isDeepStrictEqual(a[name], b[name]));
    if (key !== undefined && key in a) return differenceOf(a[key], b[key], [...at, key]);
  }
  return at;
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
    const known = new Set();
    let time = 0;
    sample.history.events.forEach((event, i) => {
      const at = ["history", "events", i];
      if (event.t_ms < time) breach([...at, "t_ms"], `the event is at ${event.t_ms} ms, before the one before it, at ${time} ms`);
      time = Math.max(time, event.t_ms);
      const kind = EVENTS.find((name) => name in event);
      if (kind === "write") {
        const stroke = event.write;
        if (stroke.id < 1) breach([...at, "write", "id"], `the stroke's ID is ${stroke.id}, and IDs count from 1`);
        else if (known.has(stroke.id)) breach([...at, "write", "id"], `the stroke ${stroke.id} is written twice`);
        known.add(stroke.id);
        visible.add(stroke.id);
        if (stroke.pointer === "") breach([...at, "write", "pointer"], "the stroke names no type of pointer");
        if (stroke.points.length === 0) breach([...at, "write", "points"], `the stroke ${stroke.id} has no point`);
        let last = 0;
        stroke.points.forEach((point, j) => {
          const where = [...at, "write", "points", j];
          onSurface(point, where);
          if (point.t_ms < last) breach([...where, "t_ms"], `the point is at ${point.t_ms} ms, before the one before it, at ${last} ms: a stroke's points never go back in time`);
          last = Math.max(last, point.t_ms);
        });
        const end = stroke.points.at(-1)?.t_ms;
        if (end !== undefined && end !== event.t_ms) breach([...at, "t_ms"], `the stroke ${stroke.id} is written at ${event.t_ms} ms, and its last point is at ${end} ms: a stroke is written when its last point is`);
      } else if (kind === "erase" || kind === "clear") {
        const { ids } = event[kind];
        if (kind === "erase" && ids.length === 0) breach([...at, kind], "the eraser takes no stroke off");
        if (new Set(ids).size !== ids.length) breach([...at, kind], `${kind} names a stroke twice`);
        for (const id of ids) if (!visible.has(id)) breach([...at, kind], `${kind} takes off the stroke ${id}, which the sheet does not show then`);
        if (kind === "clear" && !isDeepStrictEqual(new Set(ids), visible)) breach([...at, kind], `clear names ${show(ids)}, and the sheet shows ${show([...visible].sort((a, b) => a - b))}: a clear takes every stroke off`);
        for (const id of ids) visible.delete(id);
      } else if (kind === "undo") {
        const { removed, restored } = event.undo;
        if (removed.length + restored.length === 0) breach([...at, "undo"], "the undo changes nothing");
        for (const id of removed) if (!visible.has(id)) breach([...at, "undo"], `the undo takes off the stroke ${id}, which the sheet does not show then`);
        for (const id of restored) if (!known.has(id) || visible.has(id)) breach([...at, "undo"], `the undo puts back the stroke ${id}, which is ${known.has(id) ? "on the sheet already" : "never written"}`);
        for (const id of removed) visible.delete(id);
        for (const id of restored) if (known.has(id)) visible.add(id);
      } else breach(at, "the event is none of write, erase, clear and undo");
    });
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

// IDs of strokes, ascending and each shown: what a group or a box names breaks of that.
function idsBreaches(ids, visible, at, what, breach) {
  if (ids.length === 0) breach(at, `${what} has no stroke`);
  if (ids.some((id, i) => i > 0 && id <= ids[i - 1])) breach(at, `${what} names its strokes ${show(ids)}, and they go ascending, each once`);
  if (visible) for (const id of ids) if (!visible.has(id)) breach(at, `${what} names the stroke ${id}, which the ${at[0]} does not show`);
}

// What the crops of one set of strokes break: one at each height of eval and at the module's, in
// order, each of whole and positive sizes, with the frames of the groups' labels given — on a
// workbook, null, and none — and its PNG.
function cropsBreaches(set, at, digit, labels, breach) {
  const box = set.ink_box;
  if (!box || box.ymin > box.ymax || box.xmin > box.xmax) breach([...at, "ink_box"], `ink_box is ${show(box)}: the box of the points, ymin no more than ymax and xmin no more than xmax`);
  if (set.bundle_median < 1) breach([...at, "bundle_median"], `bundle_median is ${set.bundle_median}, and h_med is a height of 1 tenth at least`);
  const heights = [...new Set([...HEIGHTS, digit])].sort((a, b) => a - b);
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
  if (!TEXT_SET.test(sample.text_set_version)) breach(["text_set_version"], `text_set_version ${show(sample.text_set_version)} is not 1 to 32 Latin letters, digits, dots and hyphens`);
  if (!VERSION.test(sample.canvas_version)) breach(["canvas_version"], `canvas_version ${show(sample.canvas_version)} is not MAJOR.MINOR.PATCH`);

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
      named(["modules", "module"], task.modules.module, "the module's ID");
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
  return found;
}

// A sample, its bytes, against the message: { problems, seen }, with seen what it shows of the
// package for the examples' coverage — its purpose, writer, ink, surface and events.
export function checkSample(bytes, message) {
  const seen = new Set();
  const read = readVector(bytes);
  if (read.problems) return { problems: read.problems, seen };
  const { value, lineOf } = read;
  if (!isObject(value)) return { problems: [{ line: 1, message: `a sample is an object, ${SAMPLE}` }], seen };
  let written;
  try {
    written = toJson(message, fromJson(message, value), WRITTEN);
  } catch (error) {
    return { problems: [{ line: 1, message: `it does not read as ${SAMPLE}: ${error.message}` }], seen };
  }
  if (!isDeepStrictEqual(written, value)) {
    const at = differenceOf(value, written);
    return { problems: [{ line: lineOf(at), message: `it is not as a writer writes it, with the protobuf names and every field, its zero too (${TEXT}): at ${at.join(".") || "its top"}` }], seen };
  }
  const problems = breaches(value).map(({ at, message: text }) => ({ line: lineOf(at), message: text }));
  seen.add(value.purpose).add(value.writer);
  for (const key of ["history", "geometry", "sheet", "workbook"]) if (key in value) seen.add(key);
  for (const event of value.history?.events ?? []) for (const name of EVENTS) if (name in event) seen.add(name);
  return { problems, seen };
}

// Sample files against the message, each a [name, path to read]: { errors, seen }, the errors
// { file, line, message } of each file by its name, and seen what they show together. spec's
// examples and the files another repository names are read by this same code (R93).
export function checkSamples(message, files) {
  const errors = [];
  const seen = new Set();
  for (const [file, full] of files) {
    const { problems, seen: found } = checkSample(fs.readFileSync(full), message);
    errors.push(...problems.map((one) => ({ file, ...one })));
    for (const each of found) seen.add(each);
  }
  return { errors, seen };
}

// The examples of the sample file at root, files of contracts/, by the image buf builds: the errors,
// { file, line, message } — each example's, and, when every one holds, what they lack together:
// every purpose, writer, ink, surface and event of the history of writing.
export function checkExamples(root, image, files) {
  const known = sampleOf(image);
  if (known.error) return { errors: [{ file: FOLDER, line: 0, message: known.error }] };
  const { errors, seen } = checkSamples(known.message, files.map((file) => [file, path.join(root, file)]));
  if (errors.length === 0) {
    for (const each of [...PURPOSES, ...WRITERS, "history", "geometry", "sheet", "workbook", ...EVENTS]) {
      if (!seen.has(each)) errors.push({ file: FOLDER, line: 0, message: `no example shows ${each}: together the examples show every purpose, writer, ink, surface and event of ${TEXT}` });
    }
  }
  return { errors };
}
