// The rules that the device and the runner share (contracts/README.md, section 12; R94; RUN.md,
// T59): how a history of writing folds into the strokes a sheet shows, the groups of strokes and
// the groups of a stroke taken off, the crop and its numbers, how a box of a model snaps to the
// strokes, and which box of a workbook a stroke fills. A second implementation, written from the
// text, beside canvas's, whose CI passes the same vectors, and tutor's runner's.
//
// Every rule counts in whole numbers: a place in whole tenths of a unit, round(10 × v) with a half
// rounded up, a time in whole milliseconds, and after that only adds, subtracts, multiplies and
// compares, but for the few numbers that are one division of two whole numbers. Every whole number
// stays below 2^53, so a double holds it exactly.
//
// The test vectors of the rules are four JSON files, contracts/vectors/eval/v1/<rule>.json, each
// { description, rule, cases }: rule, the rule's numbers, which are section 12's; and each case
// { name, description, ... } with the input of the rule and what it gives, the messages of the
// package as JSON with the protobuf names and every field written, and beside them what no message
// holds:
// - groups.json: history, a History; visible, the IDs the sheet shows at the end; neighbours, the
//   pairs of them that are neighbours; groups, each a Group, and group_boxes, the box of each, a
//   TenthsBox; and erased, the groups of each stroke taken off, { stroke_id, labels };
// - crops.json: digit_height, the module's; strokes, each a FinalStroke, and groups; bundles, the
//   IDs of each bundle; and crops, a CropSet, each PNG empty: the vectors hold no pixels;
// - snaps.json: digit_height, strokes, groups and crops, as in crops.json; and snaps, each
//   { digit_height, box, stroke_ids, snapped }, a box of a model, a CropBox, on the crop at that
//   height, the strokes it takes and the box of their points, a TenthsBox, or null;
// - boxes.json: boxes, the page's, each a PageBox in the task's order; strokes; verdicts, each
//   stroke's box, { stroke_id, answer_slot }, an AnswerSlotPlace or null; and filled_boxes, each a
//   FilledBox without its crops.
// The messages are read by @bufbuild/protobuf with the descriptors of the image buf builds of
// contracts/, as the vectors of the observation are (tools/contracts/observation.mjs).

import fs from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { createFileRegistry, fromJson, toJson } from "@bufbuild/protobuf";
import * as wkt from "@bufbuild/protobuf/wkt";
import { differenceOf, keysOf, readVector } from "./observation.mjs";
import { isObject } from "./rules.mjs";

export const PACKAGE = "novatrail.eval.v1";
export const FOLDER = "contracts/vectors/eval/v1";
const TEXT = "contracts/README.md, section 12";

// The rules' numbers, as section 12 gives them and the vectors repeat them.
export const GROUP_RULE = { pause: 2000, across: 50, down: 50 };
export const CROP_RULE = { margin: 12, flat: 15, ceiling: 100, side: 200, edge: 1568, tokens: 1568, patch: 28, heights: [16, 24, 32, 48] };
export const SNAP_RULE = { margin: 250, share: [2, 3] };
export const BOX_RULE = { margin: 120, limit: 1600 };

const byNumber = (a, b) => a - b;

// A place in whole tenths of a unit: round(10 × v), a half rounded up. Every place is on the sheet,
// so never below 0, where Math.round rounds a half up as section 12 does.
export const tenths = (value) => Math.round(10 * value);

// a / b rounded down and up, for whole a and b with |a| below 2^53 and b above 0. It is exact: a
// quotient that is not whole lies 1 / b or more from the nearest whole number, and the division of
// doubles errs by half a unit in the last place of a / b at most, which is below 1 / b.
export const floorDiv = (a, b) => Math.floor(a / b);
export const ceilDiv = (a, b) => Math.ceil(a / b);

// The box of points, { ymin, xmin, ymax, xmax } in whole tenths, of one stroke or of several.
export function extentOf(points) {
  const box = { ymin: Infinity, xmin: Infinity, ymax: -Infinity, xmax: -Infinity };
  for (const point of points) {
    const [x, y] = [tenths(point.x), tenths(point.y)];
    box.ymin = Math.min(box.ymin, y);
    box.xmin = Math.min(box.xmin, x);
    box.ymax = Math.max(box.ymax, y);
    box.xmax = Math.max(box.xmax, x);
  }
  return box;
}

// How far apart two boxes are across and down, 0 where they touch or overlap.
const gapsOf = (a, b) => [Math.max(0, b.xmin - a.xmax, a.xmin - b.xmax), Math.max(0, b.ymin - a.ymax, a.ymin - b.ymax)];

// What a history of writing, events of novatrail.eval.v1.HistoryEvent as JSON, breaks of section
// 11: each event no sooner than the one before it; a stroke written with an ID from 1 that no
// other has, the type of its pointer and its points, which never go back in time, the last no
// later than the event — a stroke is written when its last point is, or later, when another action
// landed while it was written; erase, clear and undo taking off strokes the sheet shows, a clear all
// of them, and an undo putting back strokes written and not shown. breach(at, message) gets each,
// with at its path from the events, and point(point, at) each point to check its place. The IDs the
// sheet shows at the end.
export function historyBreaches(events, breach, point) {
  const visible = new Set();
  const known = new Set();
  let time = 0;
  events.forEach((event, i) => {
    const at = [i];
    if (event.t_ms < time) breach([...at, "t_ms"], `the event is at ${event.t_ms} ms, before the one before it, at ${time} ms`);
    time = Math.max(time, event.t_ms);
    const kind = ["write", "erase", "clear", "undo"].find((name) => name in event);
    if (kind === "write") {
      const stroke = event.write;
      if (stroke.id < 1) breach([...at, "write", "id"], `the stroke's ID is ${stroke.id}, and IDs count from 1`);
      else if (known.has(stroke.id)) breach([...at, "write", "id"], `the stroke ${stroke.id} is written twice`);
      known.add(stroke.id);
      visible.add(stroke.id);
      if (stroke.pointer === "") breach([...at, "write", "pointer"], "the stroke names no type of pointer");
      if (stroke.points.length === 0) breach([...at, "write", "points"], `the stroke ${stroke.id} has no point`);
      let last = 0;
      stroke.points.forEach((one, j) => {
        const where = [...at, "write", "points", j];
        point(one, where);
        if (one.t_ms < last) breach([...where, "t_ms"], `the point is at ${one.t_ms} ms, before the one before it, at ${last} ms: a stroke's points never go back in time`);
        last = Math.max(last, one.t_ms);
      });
      const end = stroke.points.at(-1)?.t_ms;
      if (end !== undefined && end > event.t_ms) breach([...at, "t_ms"], `the stroke ${stroke.id} is written at ${event.t_ms} ms, and its last point is at ${end} ms: a stroke is written no sooner than its last point`);
    } else if (kind === "erase" || kind === "clear") {
      const { ids } = event[kind];
      if (kind === "erase" && ids.length === 0) breach([...at, kind], "the eraser takes no stroke off");
      if (new Set(ids).size !== ids.length) breach([...at, kind], `${kind} names a stroke twice`);
      for (const id of ids) if (!visible.has(id)) breach([...at, kind], `${kind} takes off the stroke ${id}, which the sheet does not show then`);
      if (kind === "clear" && !isDeepStrictEqual(new Set(ids), visible)) breach([...at, kind], `clear names ${JSON.stringify(ids)}, and the sheet shows ${JSON.stringify([...visible].sort(byNumber))}: a clear takes every stroke off`);
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
  return visible;
}

// A history of writing folded, events of novatrail.eval.v1.HistoryEvent as JSON: the strokes it
// wrote, by ID, and the IDs of those the sheet shows at the end, ascending. Only adding and taking
// off IDs: a clear reads as an erase, and an undo takes off what it removed and puts back what it
// restored, with no rule of the stack of undo.
export function fold(events) {
  const written = new Map();
  const shown = new Set();
  for (const event of events) {
    if (event.write) {
      written.set(event.write.id, event.write);
      shown.add(event.write.id);
    }
    for (const id of event.erase?.ids ?? event.clear?.ids ?? event.undo?.removed ?? []) shown.delete(id);
    for (const id of event.undo?.restored ?? []) shown.add(id);
  }
  return { written, visible: [...shown].sort(byNumber) };
}

// What the rule of groups knows of a stroke: its ID, its box in tenths, and its span, from the
// earliest time of its points to the latest, in whole milliseconds.
function spanOf(stroke) {
  const times = stroke.points.map((point) => Math.round(point.t_ms));
  return { id: stroke.id, box: extentOf(stroke.points), start: Math.min(...times), end: Math.max(...times) };
}

// Whether two strokes are neighbours: the pause between them, from the end of the earlier to the
// start of the later and 0 when they overlap in time, no more than the rule's, and the gap between
// their boxes no more than its across and its down, in tenths. Each bound is in.
function neighbours(a, b, rule) {
  const pause = Math.max(0, b.start - a.end, a.start - b.end);
  const [across, down] = gapsOf(a.box, b.box);
  return pause <= rule.pause && across <= 10 * rule.across && down <= 10 * rule.down;
}

// The label of the group at a place, from 0: A to Z, then AA, AB and on.
export function labelOf(n) {
  let label = "";
  for (let rest = n + 1; rest > 0; rest = Math.floor((rest - 1) / 26)) label = String.fromCodePoint(65 + ((rest - 1) % 26)) + label;
  return label;
}

// The groups of the strokes a sheet shows, each { id, points: [{ x, y, t_ms }] }: { groups, boxes,
// neighbours } — the groups by their place, each { label, stroke_ids } with its IDs ascending; the
// box of each group's points in tenths, in the same order; and the pairs of neighbours, [a, b] with
// a < b, in order. A group is the strokes a chain of neighbours joins. The places are its box, top,
// left, bottom and right, then its earliest start, then its least ID.
export function groupsOf(strokes, rule = GROUP_RULE) {
  const spans = strokes.map(spanOf).sort((a, b) => a.id - b.id);
  const parent = spans.map((_, i) => i);
  const root = (i) => (parent[i] === i ? i : (parent[i] = root(parent[i])));
  const pairs = [];
  for (let i = 0; i < spans.length; i++) {
    for (let j = i + 1; j < spans.length; j++) {
      if (!neighbours(spans[i], spans[j], rule)) continue;
      pairs.push([spans[i].id, spans[j].id]);
      parent[root(j)] = root(i);
    }
  }
  const joined = new Map();
  spans.forEach((span, i) => {
    const r = root(i);
    if (!joined.has(r)) joined.set(r, []);
    joined.get(r).push(span);
  });
  const found = [...joined.values()].map((members) => ({
    ids: members.map((span) => span.id),
    box: {
      ymin: Math.min(...members.map((span) => span.box.ymin)),
      xmin: Math.min(...members.map((span) => span.box.xmin)),
      ymax: Math.max(...members.map((span) => span.box.ymax)),
      xmax: Math.max(...members.map((span) => span.box.xmax)),
    },
    start: Math.min(...members.map((span) => span.start)),
  }));
  found.sort((a, b) => a.box.ymin - b.box.ymin || a.box.xmin - b.box.xmin || a.box.ymax - b.box.ymax || a.box.xmax - b.box.xmax || a.start - b.start || a.ids[0] - b.ids[0]);
  return {
    groups: found.map((group, n) => ({ label: labelOf(n), stroke_ids: group.ids })),
    boxes: found.map((group) => group.box),
    neighbours: pairs.sort((a, b) => a[0] - b[0] || a[1] - b[1]),
  };
}

// The groups of each stroke written and not shown at the end — erased, cleared or taken off by an
// undo —, ascending by ID: { stroke_id, labels }, the labels of the groups of the shown strokes
// that would be its neighbours by the same rule, in the order of the groups. With none, it is in
// no group; with neighbours in two groups, in both.
export function erasedOf(history, rule = GROUP_RULE) {
  const { written, visible } = fold(history.events);
  const shown = visible.map((id) => written.get(id));
  const { groups } = groupsOf(shown, rule);
  const labelOfStroke = new Map(groups.flatMap((group) => group.stroke_ids.map((id) => [id, group.label])));
  const spans = shown.map(spanOf);
  const order = new Map(groups.map((group, n) => [group.label, n]));
  const isShown = new Set(visible);
  return [...written.keys()].filter((id) => !isShown.has(id)).sort(byNumber).map((id) => {
    const span = spanOf(written.get(id));
    const labels = new Set(spans.filter((other) => neighbours(span, other, rule)).map((other) => labelOfStroke.get(other.id)));
    return { stroke_id: id, labels: [...labels].sort((a, b) => order.get(a) - order.get(b)) };
  });
}

// The bundles of strokes, each { id, points: [{ x, y }] }: the strokes whose points span the rule's
// flat or more from top to bottom, joined by a chain of boxes that touch or overlap; a lower stroke
// is a line, and joins nothing. Each bundle's IDs ascending, the bundles by their least ID; and the
// height of each, in tenths.
export function bundlesOf(strokes, rule = CROP_RULE) {
  const tall = strokes.map((stroke) => ({ id: stroke.id, box: extentOf(stroke.points) })).filter((one) => one.box.ymax - one.box.ymin >= 10 * rule.flat).sort((a, b) => a.id - b.id);
  const parent = tall.map((_, i) => i);
  const root = (i) => (parent[i] === i ? i : (parent[i] = root(parent[i])));
  for (let i = 0; i < tall.length; i++) {
    for (let j = i + 1; j < tall.length; j++) {
      const [across, down] = gapsOf(tall[i].box, tall[j].box);
      if (across === 0 && down === 0) parent[root(j)] = root(i);
    }
  }
  const joined = new Map();
  tall.forEach((one, i) => {
    const r = root(i);
    if (!joined.has(r)) joined.set(r, []);
    joined.get(r).push(one);
  });
  return [...joined.values()].map((members) => ({
    ids: members.map((one) => one.id),
    height: Math.max(...members.map((one) => one.box.ymax)) - Math.min(...members.map((one) => one.box.ymin)),
  }));
}

// h_med, in tenths: the lower median of the heights of the bundles, the ⌊(n − 1) / 2⌋-th from the
// lowest, or the rule's flat when there is no bundle.
export function medianOf(bundles, rule = CROP_RULE) {
  if (bundles.length === 0) return 10 * rule.flat;
  const heights = bundles.map((bundle) => bundle.height).sort(byNumber);
  return heights[Math.floor((heights.length - 1) / 2)];
}

// The numbers of one crop at the height of a digit asked for, D, of strokes whose points' box is B
// and whose scale takes H, both in tenths, and the frames of the groups given — each { label,
// points }, none on a workbook —, as the message Crop writes them, its PNG aside.
export function cropOf(digit, B, H, groups, rule = CROP_RULE) {
  const sizeAt = (drawn) => {
    const [w0, h0] = [ceilDiv((B.xmax - B.xmin) * drawn, H) + 2 * rule.margin, ceilDiv((B.ymax - B.ymin) * drawn, H) + 2 * rule.margin];
    const [width, height] = [Math.max(w0, rule.side), Math.max(h0, rule.side)];
    return { width, height, left: rule.margin + Math.floor((width - w0) / 2), top: rule.margin + Math.floor((height - h0) / 2) };
  };
  const fits = ({ width, height }) => Math.max(width, height) <= rule.edge && ceilDiv(width, rule.patch) * ceilDiv(height, rule.patch) <= rule.tokens;
  let drawn = digit;
  while (drawn > 1 && !fits(sizeAt(drawn))) drawn -= 1;
  const { width, height, left, top } = sizeAt(drawn);
  const r = (Math.max(drawn, 12) + 24) * H;
  const X = (x) => 24 * ((x - B.xmin) * drawn + left * H);
  const Y = (y) => 24 * ((y - B.ymin) * drawn + top * H);
  const frames = groups.map((group) => {
    const g = extentOf(group.points);
    return {
      label: group.label,
      box: {
        ymin: floorDiv(1000 * (Y(g.ymin) - r), 24 * H * height),
        xmin: floorDiv(1000 * (X(g.xmin) - r), 24 * H * width),
        ymax: ceilDiv(1000 * (Y(g.ymax) + r), 24 * H * height),
        xmax: ceilDiv(1000 * (X(g.xmax) + r), 24 * H * width),
      },
    };
  });
  return {
    digit_height: digit,
    drawn_height: drawn,
    width,
    height,
    margin_top: top,
    margin_left: left,
    scale: (10 * drawn) / H,
    line_width: Math.max(drawn, 12) / 12,
    sheet_box: {
      ymin: (B.ymin * drawn - top * H) / (10 * drawn),
      xmin: (B.xmin * drawn - left * H) / (10 * drawn),
      ymax: (B.ymin * drawn - top * H + height * H) / (10 * drawn),
      xmax: (B.xmin * drawn - left * H + width * H) / (10 * drawn),
    },
    frames,
  };
}

// The heights of a digit a set of crops is drawn at: those of eval and the module's, ascending.
export const heightsOf = (digit, rule = CROP_RULE) => [...new Set([...rule.heights, digit])].sort(byNumber);

// The crops of one set of strokes, each { id, points: [{ x, y }] }, with their groups, each { label,
// stroke_ids } — on a workbook, none —, at the module's height of a digit: as the message CropSet
// writes them, each PNG aside, or null when there is no stroke.
export function cropSetOf(strokes, groups, digit, rule = CROP_RULE) {
  if (strokes.length === 0) return null;
  const B = extentOf(strokes.flatMap((stroke) => stroke.points));
  const median = medianOf(bundlesOf(strokes, rule), rule);
  const H = Math.min(median, 10 * rule.ceiling);
  const byId = new Map(strokes.map((stroke) => [stroke.id, stroke]));
  const inked = groups.map((group) => ({ label: group.label, points: group.stroke_ids.flatMap((id) => byId.get(id)?.points ?? []) }));
  return { ink_box: B, bundle_median: median, crops: heightsOf(digit, rule).map((height) => cropOf(height, B, H, inked, rule)) };
}

// Which strokes a box of a model snaps to on one crop of a set: the box in whole thousandths of the
// crop, widened by the rule's margin in thousandths of the height drawn, holds a point of a stroke,
// edges in, and takes the stroke when it holds k of its n points with k ≥ 1 and below × k ≥ above
// × n, for the rule's share [above, below]. { stroke_ids, snapped }: the strokes taken, ascending,
// and the box of their points in tenths, or null when it takes none. H is the set's, by the rule of
// the crop it was drawn by.
export function snapOf(set, crop, box, strokes, rule = SNAP_RULE, cropRule = CROP_RULE) {
  const B = set.ink_box;
  const H = Math.min(set.bundle_median, 10 * cropRule.ceiling);
  const { drawn_height: D, width: w, height: h, margin_top: my, margin_left: mx } = crop;
  const mu = rule.margin * D;
  const holds = (point) => {
    const [x, y] = [tenths(point.x), tenths(point.y)];
    const X = 1000 * ((x - B.xmin) * D + mx * H);
    const Y = 1000 * ((y - B.ymin) * D + my * H);
    return (box.xmin * w - mu) * H <= X && X <= (box.xmax * w + mu) * H && (box.ymin * h - mu) * H <= Y && Y <= (box.ymax * h + mu) * H;
  };
  const [above, below] = rule.share;
  const taken = strokes.filter((stroke) => {
    const k = stroke.points.filter(holds).length;
    return k >= 1 && below * k >= above * stroke.points.length;
  }).sort((a, b) => a.id - b.id);
  return { stroke_ids: taken.map((stroke) => stroke.id), snapped: taken.length ? extentOf(taken.flatMap((stroke) => stroke.points)) : null };
}

// The box of a workbook's page that a stroke, { id, points: [{ x, y }] }, fills, of the page's
// boxes in the task's order, each a PageBox in whole units: its index, or -1 for the draft. A box
// holds the stroke when the box of its points is no wider and no taller than the rule's limit in
// thousandths of the box, and its middle lies in the box widened by the rule's margin in
// thousandths of its size; of those, the one that holds the most of its points in it widened, and
// of those the earliest.
export function boxOf(stroke, boxes, rule = BOX_RULE) {
  const { xmin: x0, xmax: x1, ymin: y0, ymax: y1 } = extentOf(stroke.points);
  const points = stroke.points.map((point) => [tenths(point.x), tenths(point.y)]);
  let best = -1;
  let most = 0;
  boxes.forEach((box, i) => {
    const [L, T, W, H] = [10 * box.left, 10 * box.top, 10 * box.width, 10 * box.height];
    const [left, right] = [1000 * L - rule.margin * W, 1000 * (L + W) + rule.margin * W];
    const [top, bottom] = [1000 * T - rule.margin * H, 1000 * (T + H) + rule.margin * H];
    const size = 1000 * (x1 - x0) <= rule.limit * W && 1000 * (y1 - y0) <= rule.limit * H;
    const middle = 1000 * (x0 + x1) >= 2 * left && 1000 * (x0 + x1) <= 2 * right && 1000 * (y0 + y1) >= 2 * top && 1000 * (y0 + y1) <= 2 * bottom;
    if (!size || !middle) return;
    const held = points.filter(([x, y]) => 1000 * x >= left && 1000 * x <= right && 1000 * y >= top && 1000 * y <= bottom).length;
    if (best < 0 || held > most) [best, most] = [i, held];
  });
  return best;
}

// The boxes the strokes of a page fill: { verdicts, filled_boxes } — each stroke's box by ID
// ascending, { stroke_id, answer_slot } with null for the draft; and the filled boxes in the task's
// order, as the message FilledBox writes them without its crops, their IDs ascending.
export function tableOf(strokes, boxes, rule = BOX_RULE) {
  const sorted = [...strokes].sort((a, b) => a.id - b.id);
  const filled = boxes.map(() => []);
  const verdicts = sorted.map((stroke) => {
    const i = boxOf(stroke, boxes, rule);
    if (i >= 0) filled[i].push(stroke.id);
    return { stroke_id: stroke.id, answer_slot: i >= 0 ? boxes[i].answer_slot : null };
  });
  return { verdicts, filled_boxes: boxes.flatMap((box, i) => (filled[i].length ? [{ answer_slot: box.answer_slot, stroke_ids: filled[i] }] : [])) };
}

// A crop set as the rule of the crop gives it: its PNG aside, since the rule gives no pixels.
export const numbersOf = (set) => set && { ...set, crops: set.crops.map(({ png, ...numbers }) => numbers) };

// Where a value given parts from what a rule computes: null, or { at, given, computed } — the first
// path where they part, and the two values there.
export function ruleDifference(given, computed) {
  if (isDeepStrictEqual(given, computed)) return null;
  const at = differenceOf(given, computed);
  const valueAt = (value) => at.reduce((part, step) => part?.[step], value);
  return { at, given: valueAt(given), computed: valueAt(computed) };
}

// The test vectors of the rules.

const WRITTEN = { useProtoFieldName: true, alwaysEmitImplicit: true };
const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const show = (value) => JSON.stringify(value);
const isIds = (ids) => Array.isArray(ids) && ids.every((id) => Number.isInteger(id) && id >= 1);
// The sheet, and a workbook's page, in units.
const SHEET = { width: 1000, height: 1400 };
const MESSAGES = ["History", "FinalStroke", "Group", "TenthsBox", "CropSet", "PageBox", "FilledBox"].map((name) => `${PACKAGE}.${name}`);
const PLACES = ["novatrail.observation.v1.CropBox", "novatrail.observation.v1.AnswerSlotPlace"];

// The messages the vectors hold, of the image buf builds of contracts/: { messages }, by their full
// names, or { error }. The files of the package are read with those they import.
export function messagesOf(image) {
  const set = fromJson(wkt.FileDescriptorSetSchema, image, { ignoreUnknownFields: true });
  const known = new Map(Object.values(wkt).filter((value) => value?.kind === "file").map((file) => [file.proto.name, file]));
  const resolve = (name) => set.file.find((proto) => proto.name === name) ?? known.get(name);
  const registry = createFileRegistry(...set.file.filter((proto) => proto.package === PACKAGE).map((proto) => createFileRegistry(proto, resolve)));
  const messages = {};
  for (const name of [...MESSAGES, ...PLACES]) {
    messages[name] = registry.getMessage(name);
    if (!messages[name]) return { error: `the image of buf build has no ${name}, which the vectors of the rules hold` };
  }
  return { messages };
}

// A message of a vector, as JSON: { value } as it reads, or { problem } when it does not read, or is
// not as a writer writes it, with the protobuf names and every field.
function messageAt(json, schema) {
  let read;
  try {
    read = toJson(schema, fromJson(schema, json), WRITTEN);
  } catch (error) {
    return { problem: `it does not read as ${schema.typeName}: ${error.message}` };
  }
  if (!isDeepStrictEqual(read, json)) return { problem: `it is not as a writer writes ${schema.typeName}, with the protobuf names and every field: ${show(read)} (contracts/README.md, section 6)` };
  return { value: read };
}

// What each vector file holds: the keys of its cases, beyond name and description, and how a case
// is checked, check(value, here, read, rule, seen), with here(text, at) naming a problem at a path
// of the case and read(json, name, at) a message of the package or null.
const VECTORS = {
  "groups.json": { rule: GROUP_RULE, keys: ["history", "visible", "neighbours", "groups", "group_boxes", "erased"], check: checkGroups },
  "crops.json": { rule: CROP_RULE, keys: ["digit_height", "strokes", "groups", "bundles", "crops"], check: checkCrops },
  "snaps.json": { rule: SNAP_RULE, keys: ["digit_height", "strokes", "groups", "crops", "snaps"], check: checkSnaps },
  "boxes.json": { rule: BOX_RULE, keys: ["boxes", "strokes", "verdicts", "filled_boxes"], check: checkBoxes },
};
export const VECTOR_FILES = Object.keys(VECTORS);

// Each point on the sheet, 1000 × 1400 units.
function onSheet(here, prefix) {
  return (point, at) => {
    for (const [axis, most] of [["x", SHEET.width], ["y", SHEET.height]]) {
      if (!(point[axis] >= 0 && point[axis] <= most)) here(`${axis} is ${show(point[axis])}, off the sheet, from 0 to ${most}`, [...prefix, ...at, axis]);
    }
  };
}

// A list of messages, each read: the list, or null after naming its first problem.
function listOf(value, key, name, here, read) {
  if (!Array.isArray(value[key])) {
    here(`${key} is a list of ${name}`, [key]);
    return null;
  }
  const list = [];
  for (const [i, json] of value[key].entries()) {
    const one = read(json, name, [key, i]);
    if (one === null) return null;
    list.push(one);
  }
  return list;
}

// What the strokes and the groups of a case break: strokes with IDs from 1, each once, with their
// points on the sheet; and groups labelled A, B and on, each stroke in one, its IDs ascending.
function strokesAndGroups(strokes, groups, here) {
  const ids = new Set();
  strokes.forEach((stroke, i) => {
    if (stroke.id < 1 || ids.has(stroke.id)) here(`the stroke's ID is ${stroke.id}: IDs count from 1, each once`, ["strokes", i, "id"]);
    ids.add(stroke.id);
    if (stroke.points.length === 0) here(`the stroke ${stroke.id} has no point`, ["strokes", i, "points"]);
    stroke.points.forEach((point, j) => onSheet(here, ["strokes", i])(point, ["points", j]));
  });
  if (!groups) return;
  const counted = new Map();
  groups.forEach((group, i) => {
    if (group.label !== labelOf(i)) here(`group ${i + 1} is labelled ${show(group.label)}, and the labels go A, B and on: ${show(labelOf(i))}`, ["groups", i, "label"]);
    if (group.stroke_ids.length === 0 || group.stroke_ids.some((id, j) => j > 0 && id <= group.stroke_ids[j - 1])) here(`the group ${group.label} names ${show(group.stroke_ids)}: one stroke at least, ascending, each once`, ["groups", i, "stroke_ids"]);
    for (const id of group.stroke_ids) counted.set(id, (counted.get(id) ?? 0) + 1);
  });
  for (const id of ids) if (counted.get(id) !== 1) here(`the stroke ${id} is in ${counted.get(id) ?? 0} groups, and each stroke is in one`, ["groups"]);
  for (const id of counted.keys()) if (!ids.has(id)) here(`a group names the stroke ${id}, which the case does not have`, ["groups"]);
}

// A rule's result against the case's: none, or the first path where they part.
function compare(given, computed, key, here, what) {
  const parted = ruleDifference(given, computed);
  if (parted) here(`${[key, ...parted.at].join(".")} is ${show(parted.given)}, and ${what} gives ${show(parted.computed)}`, [key, ...parted.at]);
}

// The strokes, groups and crops of a case of crops.json or snaps.json, read and held to the rule of
// the crop at the module's height of a digit, each PNG empty: { strokes, groups, crops }, or null
// after naming a problem.
function cropsOfCase(value, here, read, rule, seen) {
  if (!Number.isInteger(value.digit_height) || value.digit_height < 1 || value.digit_height > 256) {
    here(`digit_height is ${show(value.digit_height)}, a whole number of px from 1 to 256`, ["digit_height"]);
    return null;
  }
  const strokes = listOf(value, "strokes", "FinalStroke", here, read);
  const groups = listOf(value, "groups", "Group", here, read);
  if (!strokes || !groups) return null;
  const before = seen.problems;
  strokesAndGroups(strokes, groups, here);
  if (seen.problems > before) return null;
  const crops = read(value.crops, "CropSet", ["crops"]);
  if (!crops) return null;
  crops.crops.forEach((crop, i) => {
    if (crop.png !== "") here("png is empty: the vectors hold no pixels", ["crops", "crops", i, "png"]);
  });
  compare(numbersOf(crops), cropSetOf(strokes, groups, value.digit_height, rule), "crops", here, "the rule of the crop");
  return { strokes, groups, crops };
}

function checkGroups(value, here, read, rule, seen) {
  const history = read(value.history, "History", ["history"]);
  if (!history) return;
  const before = seen.problems;
  historyBreaches(history.events, (at, text) => here(text, ["history", "events", ...at]), onSheet(here, ["history", "events"]));
  if (seen.problems > before) return;
  for (const event of history.events) for (const kind of ["erase", "clear", "undo"]) if (kind in event) seen.events.add(kind);
  const { written, visible } = fold(history.events);
  compare(value.visible, visible, "visible", here, "the fold of the history");
  const computed = groupsOf(visible.map((id) => written.get(id)), rule);
  compare(value.neighbours, computed.neighbours, "neighbours", here, "the rule of groups");
  const groups = listOf(value, "groups", "Group", here, read);
  const boxes = listOf(value, "group_boxes", "TenthsBox", here, read);
  if (groups) compare(groups, computed.groups, "groups", here, "the rule of groups");
  if (boxes) compare(boxes, computed.boxes, "group_boxes", here, "the rule of groups");
  const erased = erasedOf(history, rule);
  compare(value.erased, erased, "erased", here, "the rule of the groups of a stroke taken off");
  for (const one of erased) seen.erased.add(one.labels.length === 0 ? "none" : one.labels.length > 1 ? "several" : "one");
}

function checkCrops(value, here, read, rule, seen) {
  const found = cropsOfCase(value, here, read, rule, seen);
  if (!found) return;
  const bundles = bundlesOf(found.strokes, rule);
  compare(value.bundles, bundles.map((bundle) => bundle.ids), "bundles", here, "the rule of bundles");
  const drawn = cropSetOf(found.strokes, found.groups, value.digit_height, rule);
  if (bundles.length === 0) seen.crops.add("no bundle");
  if (drawn && drawn.bundle_median > 10 * rule.ceiling) seen.crops.add("above the ceiling");
  if (drawn?.crops.some((crop) => crop.drawn_height < crop.digit_height)) seen.crops.add("drawn smaller");
}

function checkSnaps(value, here, read, rule, seen) {
  const found = cropsOfCase(value, here, read, CROP_RULE, seen);
  if (!found) return;
  const { strokes, crops } = found;
  if (!Array.isArray(value.snaps) || value.snaps.length === 0) return here("snaps lists the boxes of a model, one at least", ["snaps"]);
  value.snaps.forEach((snap, i) => {
    const at = ["snaps", i];
    const wrong = isObject(snap) ? keysOf(snap, ["digit_height", "box", "stroke_ids", "snapped"]) : ["a snap is an object"];
    if (wrong.length) return wrong.forEach((text) => here(`snap ${i + 1}: ${text}`, at));
    const crop = crops.crops.find((one) => one.digit_height === snap.digit_height);
    if (!crop) return here(`snap ${i + 1} is on the crop at ${show(snap.digit_height)} px, which the crops do not have`, [...at, "digit_height"]);
    const box = read(snap.box, "novatrail.observation.v1.CropBox", [...at, "box"]);
    const snapped = snap.snapped === null ? null : read(snap.snapped, "TenthsBox", [...at, "snapped"]);
    if (!box || (snap.snapped !== null && !snapped)) return;
    if (!isIds(snap.stroke_ids)) return here(`snap ${i + 1}: stroke_ids lists IDs of strokes`, [...at, "stroke_ids"]);
    const taken = snapOf(crops, crop, box, strokes, rule, CROP_RULE);
    compare({ stroke_ids: snap.stroke_ids, snapped }, taken, `snaps.${i}`, (text) => here(text, at), "the rule of snapping");
    seen.snaps.add(taken.snapped ? "taken" : "none");
  });
}

function checkBoxes(value, here, read, rule, seen) {
  const boxes = listOf(value, "boxes", "PageBox", here, read);
  const strokes = listOf(value, "strokes", "FinalStroke", here, read);
  if (!boxes || !strokes) return;
  const before = seen.problems;
  strokesAndGroups(strokes, null, here);
  boxes.forEach((box, i) => {
    const place = box.answer_slot;
    const previous = boxes[i - 1]?.answer_slot;
    if (!place || place.item < 1 || place.slot < 1 || (previous && (previous.item - place.item || previous.slot - place.slot) >= 0)) here(`the box is at ${show(place)}: an item and a slot, each from 1, in the task's order, each once`, ["boxes", i, "answer_slot"]);
    if (box.left < 0 || box.top < 0 || box.width < 1 || box.height < 1 || box.left + box.width > SHEET.width || box.top + box.height > SHEET.height) here(`the box at ${box.left}, ${box.top}, ${box.width} × ${box.height} is not on the page, 1000 × 1400, of 1 unit each way at least`, ["boxes", i]);
  });
  if (seen.problems > before) return;
  const table = tableOf(strokes, boxes, rule);
  if (!Array.isArray(value.verdicts)) return here("verdicts lists each stroke's box", ["verdicts"]);
  const verdicts = [];
  for (const [i, verdict] of value.verdicts.entries()) {
    const wrong = isObject(verdict) ? keysOf(verdict, ["stroke_id", "answer_slot"]) : ["a verdict is an object"];
    if (wrong.length) return wrong.forEach((text) => here(`verdict ${i + 1}: ${text}`, ["verdicts", i]));
    const place = verdict.answer_slot === null ? null : read(verdict.answer_slot, "novatrail.observation.v1.AnswerSlotPlace", ["verdicts", i, "answer_slot"]);
    if (verdict.answer_slot !== null && !place) return;
    verdicts.push({ stroke_id: verdict.stroke_id, answer_slot: place });
  }
  compare(verdicts, table.verdicts, "verdicts", here, "the rule of boxes");
  const filled = listOf(value, "filled_boxes", "FilledBox", here, read);
  if (filled) compare(filled, table.filled_boxes, "filled_boxes", here, "the rule of boxes");
  if (table.verdicts.some((verdict) => verdict.answer_slot === null)) seen.boxes.add("draft");
  if (table.filled_boxes.length) seen.boxes.add("filled");
}

// A vector, its bytes and its file's name, against the messages: { problems, seen }, with seen
// what it holds for the coverage of the rules, and cases, how many it holds.
export function checkVector(bytes, name, messages) {
  const seen = { events: new Set(), erased: new Set(), crops: new Set(), snaps: new Set(), boxes: new Set(), cases: 0, problems: 0 };
  const kind = VECTORS[name];
  if (!kind) return { problems: [{ line: 0, message: `section 12 has no vector ${name}: its vectors are ${VECTOR_FILES.join(", ")}` }], seen };
  const read = readVector(bytes);
  if (read.problems) return { problems: read.problems, seen };
  const { value, lineOf } = read;
  const problems = [];
  const problem = (at, text) => {
    seen.problems += 1;
    problems.push({ line: lineOf(at), message: text });
  };
  if (!isObject(value)) return { problems: [{ line: 1, message: "a vector is an object: description, rule and cases" }], seen };
  for (const text of keysOf(value, ["description", "rule", "cases"])) problem([], text);
  if (problems.length) return { problems, seen };
  if (typeof value.description !== "string" || value.description.trim() === "") problem(["description"], "description is a text that says what the vector holds");
  if (!isDeepStrictEqual(value.rule, kind.rule)) problem(["rule"], `the rule is ${show(value.rule)}, and section 12 gives ${show(kind.rule)}`);
  if (!Array.isArray(value.cases) || value.cases.length === 0) problem(["cases"], "cases lists the cases, one at least");
  if (problems.length) return { problems, seen };
  seen.cases = value.cases.length;
  const names = new Set();
  value.cases.forEach((one, k) => {
    const at = ["cases", k];
    const which = isObject(one) && typeof one.name === "string" ? one.name : `case ${k + 1}`;
    const here = (text, more = []) => problem([...at, ...more], `${which}: ${text}`);
    if (!isObject(one)) return here("a case is an object");
    const wrong = keysOf(one, ["name", "description", ...kind.keys]);
    if (wrong.length) return wrong.forEach((text) => here(text));
    if (!NAME.test(one.name)) here("name is lowercase Latin letters and digits, in words joined by hyphens", ["name"]);
    else if (names.has(one.name)) here("another case has this name", ["name"]);
    names.add(one.name);
    if (typeof one.description !== "string" || one.description.trim() === "") here("description is a text that says what the case shows", ["description"]);
    const readAt = (json, type, path) => {
      const full = type.includes(".") ? type : `${PACKAGE}.${type}`;
      const got = messageAt(json, messages[full]);
      if (got.problem) {
        here(got.problem, path);
        return null;
      }
      return got.value;
    };
    kind.check(one, here, readAt, kind.rule, seen);
  });
  return { problems, seen };
}

// The vectors of the rules at root, files of contracts/, by the image buf builds: the errors, { file,
// line, message } — each vector's, and, when every one holds, what they lack together: each of the
// four files, the events of a history that take strokes off, a stroke taken off in no group and in
// two, a crop with no bundle, with h_med above the ceiling and drawn smaller than asked, a box of a
// model that takes strokes and one that takes none, and a stroke of the draft and a filled box —,
// and how many cases they hold.
export function checkVectors(root, image, files) {
  const known = messagesOf(image);
  if (known.error) return { errors: [{ file: FOLDER, line: 0, message: known.error }], cases: 0 };
  const errors = [];
  const seen = { events: new Set(), erased: new Set(), crops: new Set(), snaps: new Set(), boxes: new Set(), cases: 0 };
  for (const file of files) {
    const { problems, seen: found } = checkVector(fs.readFileSync(path.join(root, file)), path.posix.basename(file), known.messages);
    errors.push(...problems.map((one) => ({ file, ...one })));
    for (const key of ["events", "erased", "crops", "snaps", "boxes"]) for (const each of found[key]) seen[key].add(each);
    seen.cases += found.cases;
  }
  if (errors.length === 0) {
    const lack = (text) => errors.push({ file: FOLDER, line: 0, message: `no vector ${text}: the vectors hold every rule of ${TEXT}` });
    const names = new Set(files.map((file) => path.posix.basename(file)));
    for (const name of VECTOR_FILES) if (!names.has(name)) errors.push({ file: `${FOLDER}/${name}`, line: 0, message: `the file is missing: the vectors of ${TEXT} are ${VECTOR_FILES.join(", ")}` });
    for (const kind of ["erase", "clear", "undo"]) if (!seen.events.has(kind)) lack(`has a history with ${kind}`);
    if (!seen.erased.has("none")) lack("has a stroke taken off that is in no group");
    if (!seen.erased.has("several")) lack("has a stroke taken off that is in two groups");
    for (const what of ["no bundle", "above the ceiling", "drawn smaller"]) if (!seen.crops.has(what)) lack(`has a crop with ${what === "drawn smaller" ? "a height drawn below the height asked for" : what === "no bundle" ? "no bundle" : "h_med above the ceiling"}`);
    if (!seen.snaps.has("taken")) lack("has a box of a model that takes strokes");
    if (!seen.snaps.has("none")) lack("has a box of a model that takes none");
    if (!seen.boxes.has("draft")) lack("has a stroke of the draft");
    if (!seen.boxes.has("filled")) lack("has a filled box");
  }
  return { errors, cases: seen.cases };
}
