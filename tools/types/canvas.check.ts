// The check of the types of <novatrail-canvas> by tsc, never run (R74): the element as canvas
// declares it and app uses it, imported from the npm package. `just types-check` copies it into its
// project as canvas.ts, beside the corpus, and tsc takes it under each resolution of modules, with
// the DOM (tools/types/typescript.mjs). What canvas and app may do type-checks; each line under a
// directive must be an error, and were it not, the directive would go unused, and that would be the
// error instead. The marks are checked against the message `Mark` of the contract between app and
// api, from the npm package of its code, which the recipe installs beside (R83): app makes the
// element's mark of the contract's, and a kind or a place the contract adds that the element has
// no type for fails tsc.

import { MarkKind } from "@altnovatrail/contracts/novatrail/api/v1/attempt_pb.js";
import type * as api from "@altnovatrail/contracts/novatrail/api/v1/attempt_pb.js";
import type * as canvas from "@altnovatrail/spec/canvas";
import type * as open from "@altnovatrail/spec/formatv0/open";

/** canvas's element: a class of the DOM that keeps the contract, with members of its own too. */
declare class Sheet extends HTMLElement implements canvas.CanvasElement {
  tool: canvas.Tool;
  task: open.Task | undefined;
  workedExample: open.WorkedExample | undefined;
  get demoState(): canvas.DemoState | undefined;
  set demoState(state: canvas.DemoState | undefined);
  manifest: open.Manifest | undefined;
  media: canvas.Media | undefined;
  get history(): readonly canvas.HistoryEvent[];
  set history(history: readonly canvas.HistoryEvent[] | undefined);
  get marks(): canvas.Marks | undefined;
  set marks(marks: canvas.Marks | undefined);
  get filled(): canvas.Filled | null;
  exportWork(): Promise<canvas.ExportedWork | null>;
  undo(): boolean;
  clear(): boolean;
}

// canvas puts the element's events in the DOM's map of events, as its package does: their types
// then hold on the element, on its ancestors and on the document alike.
declare global {
  interface GlobalEventHandlersEventMap extends canvas.CanvasEventMap {}
}

declare const task: open.Task;
declare const manifest: open.Manifest;
declare const example: open.WorkedExample;
declare const done: canvas.ExportedWork;
declare const event: canvas.HistoryEvent;

export const sheet: canvas.CanvasElement = new Sheet();

/** A history of each kind of event, as a sheet writes it: plain data, for JSON as it is. */
export const history: readonly canvas.HistoryEvent[] = [
  { kind: "write", t: 400, stroke: { id: 1, kind: "pen", points: [{ x: 100, y: 300, t: 0, p: 0.5 }, { x: 100, y: 600, t: 400, p: 0.5 }] } },
  { kind: "write", t: 900, stroke: { id: 2, kind: "touch", points: [{ x: 200, y: 300, t: 700, p: 0 }] } },
  { kind: "erase", t: 1200, ids: [2] },
  { kind: "undo", t: 1500, removed: [], restored: [2] },
  { kind: "clear", t: 2000, ids: [1, 2] },
];

/** The context of a sheet's submission and of a workbook's, as app keeps them. */
export const sheetSubmission: canvas.SheetSubmission = {
  crop: {
    drawn: 16,
    width: 235,
    height: 200,
    margins: [33, 12],
    sheetBox: [225.75, 73, 675.75, 601.75],
    frames: [{ label: "A", box: [156, 43, 840, 172] }],
    exact: { box: { minX: 1000, minY: 3000, maxX: 5740, maxY: 6000 }, median: 360 },
  },
  groups: [{ label: "A", ids: [1] }],
  digest: "0123456789abcdef",
};
export const workbookSubmission: canvas.WorkbookSubmission = { boxes: [{ item: 1, slot: 2, ids: [1, 3] }], digest: "fedcba9876543210" };
export const submissions: readonly canvas.Submission[] = [sheetSubmission, workbookSubmission];

sheet.tool = "eraser";
sheet.task = task;
sheet.task = undefined;
sheet.manifest = manifest;
sheet.manifest = undefined;
sheet.media = async (ref) => new Blob([ref]);
sheet.media = undefined;
sheet.history = history;
sheet.history = undefined;

/** What a value the check has no type for is: never, so that tsc fails where one comes. */
function unknown(value: never): never {
  throw new TypeError(`no type of the element for ${String(value)}`);
}

/**
 * The element's mark of the contract's, with the name app writes: undefined for a mark with no
 * kind or no place, which api never sends (contracts/README.md, section 15).
 */
export function markOf(mark: api.Mark, name: string): canvas.Mark | undefined {
  let kind: canvas.Mark["kind"];
  switch (mark.kind) {
    case MarkKind.FRAME:
      kind = "frame";
      break;
    case MarkKind.UNSPECIFIED:
      return undefined;
    default:
      return unknown(mark.kind);
  }
  const { place } = mark;
  switch (place.case) {
    case "answerSlot":
      return { kind, at: { cell: { item: place.value.item, slot: place.value.slot } }, name };
    case "cropBox":
      return { kind, at: { box: [place.value.ymin, place.value.xmin, place.value.ymax, place.value.xmax] }, name };
    case undefined:
      return undefined;
    default:
      return unknown(place);
  }
}

/**
 * The marks of an answer of api, given with the context app kept of its submission: numbered among
 * those the element takes.
 */
declare const answer: api.GetRungWordsResponse;
const placed = answer.marks.filter((mark) => markOf(mark, "") !== undefined);
export const given: canvas.Marks = {
  submission: sheetSubmission,
  marks: placed.flatMap((mark, n) => markOf(mark, `Tutor's mark ${n + 1} of ${placed.length}`) ?? []),
};
sheet.marks = given;
sheet.marks = { submission: workbookSubmission, marks: [{ kind: "frame", at: { cell: { item: 1, slot: 2 } }, name: "Tutor's mark 1 of 1: line 1, box 2" }] };
sheet.marks = { submission: sheetSubmission, marks: [{ kind: "frame", at: { group: "A" }, name: "Tutor's mark 1 of 1" }] };
sheet.marks = undefined;
export const shown: canvas.Marks | undefined = sheet.marks;
export const kept: readonly canvas.HistoryEvent[] = sheet.history;
export const filled: canvas.Filled | null = sheet.filled;
export const first: boolean | undefined = sheet.filled?.[0]?.[0];
export const work: Promise<canvas.ExportedWork | null> = sheet.exportWork();

/** A worked example in place of the task, and how far its demo has gone, which app keeps. */
sheet.task = undefined;
sheet.workedExample = example;
export const demo: canvas.DemoState | undefined = sheet.demoState;
sheet.demoState = { opened: 2, hidden: true };
sheet.demoState = undefined;
sheet.workedExample = undefined;

/** The work's key tells its kind: the crop of a sheet, or the crops of a workbook's boxes. */
export const sent: Blob | readonly Blob[] = "png" in done ? done.png : done.cells.map(({ png }) => png);
export const places: readonly canvas.CellPlace[] = "cells" in done ? done.cells : [];
export const context: canvas.Submission = done.submission;

/** The events, on the element and on the document they bubble up to. */
sheet.addEventListener("historychange", (change: canvas.HistoryChangeEvent) => change.detail.from);
document.addEventListener("historychange", (change) => {
  const events: readonly canvas.HistoryEvent[] = change.detail.events;
  return events;
});
document.addEventListener("toolchange", (change) => {
  const tool: canvas.Tool = change.detail.tool;
  return tool;
});
document.addEventListener("demochange", (change) => {
  const state: canvas.DemoState = change.detail;
  return state.opened;
});

// @ts-expect-error The filled boxes are the element's to tell, not the consumer's to set.
sheet.filled = null;
// @ts-expect-error Nor to change in place.
filled?.[0]?.push(true);
// @ts-expect-error null is no history: undefined, and undefined alone, is the empty one.
sheet.history = null;
// @ts-expect-error null is no manifest: undefined, and undefined alone, is none.
sheet.manifest = null;
// @ts-expect-error null is no media: undefined, and undefined alone, is none.
sheet.media = null;
// @ts-expect-error A picture's file comes as a Blob, not as its address.
sheet.media = async (ref: string) => ref;
// @ts-expect-error The commands are canvas's own, which its buttons call: the contract has none.
sheet.undo();
// @ts-expect-error null is no worked example: undefined, and undefined alone, is none.
sheet.workedExample = null;
// @ts-expect-error A state of a demo says both how many parts are open and whether it is hidden.
sheet.demoState = { opened: 1 };
// @ts-expect-error A tool the sheet has not is no tool of it.
sheet.tool = "ruler";
// @ts-expect-error null is no marks: undefined, and undefined alone, is none.
sheet.marks = null;
// @ts-expect-error The marks come with the context of their submission, which places them.
sheet.marks = { marks: [] };
// @ts-expect-error A mark has a name, which app writes: the element words nothing.
export const unnamed: canvas.Mark = { kind: "frame", at: { cell: { item: 1, slot: 1 } } };
// @ts-expect-error A frame is the one kind of a mark so far.
export const arrow: canvas.Mark = { kind: "arrow", at: { group: "A" }, name: "Tutor's mark 1 of 1" };
// @ts-expect-error A box on the crop is four numbers, [ymin, xmin, ymax, xmax].
export const corner: canvas.Anchor = { box: [0, 0] };
document.addEventListener("historychange", (change) => {
  // @ts-expect-error The events told are the sheet's, to read.
  change.detail.events.push(event);
});
document.addEventListener("toolchange", (change) => {
  // @ts-expect-error The tool told is the learner's choice, to read.
  change.detail.tool = "pen";
});
document.addEventListener("demochange", (change) => {
  // @ts-expect-error The state told is how far the learner went, to read.
  change.detail.opened = 0;
});
// @ts-expect-error A workbook's work has no PNG of a sheet: its key tells which it is.
export const png: Blob = done.png;
if ("cells" in done) {
  // @ts-expect-error The crops are the element's to give, not the consumer's to change.
  done.cells.push({ item: 1, slot: 1, png: new Blob() });
}
// @ts-expect-error An answer cell has no ID: its place names it.
export const cell: canvas.CellPlace = { item: 1, slot: "a" };
// @ts-expect-error A context without its digest is no context of a submission.
export const undigested: canvas.WorkbookSubmission = { boxes: [] };
// @ts-expect-error An erasing names the strokes it took off, not a stroke.
export const erased: canvas.HistoryEvent = { kind: "erase", t: 0, stroke: { id: 1, kind: "pen", points: [] } };
