// The check of the types of <novatrail-canvas> by tsc, never run: the element as canvas declares it
// and app uses it, imported from the npm package. What canvas and app may do type-checks;
// each line under a directive must be an error, or the unused directive is. app makes the element's
// mark of the contract's `Mark`, so a kind or a place the contract adds that the element has no
// type for fails tsc.

import { MarkKind } from "@altnovatrail/contracts/novatrail/api/v1/attempt_pb.js";
import type * as api from "@altnovatrail/contracts/novatrail/api/v1/attempt_pb.js";
import type * as canvas from "@altnovatrail/spec/canvas";
import type * as open from "@altnovatrail/spec/formatv0/open";

/** canvas's element: a class of the DOM that keeps the contract, with members of its own too. */
declare class Sheet extends HTMLElement implements canvas.CanvasElement {
  tool: canvas.Tool;
  task: open.Task | undefined;
  paper: canvas.PaperTask | undefined;
  get tracing(): canvas.TracingState | undefined;
  set tracing(state: canvas.TracingState | undefined);
  get reading(): canvas.TracingReading | undefined;
  set reading(reading: canvas.TracingReading | undefined);
  get grid(): canvas.PaperGrid | undefined;
  set grid(grid: canvas.PaperGrid | undefined);
  get pens(): canvas.PenSettings;
  set pens(settings: canvas.PenSettings | undefined);
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
  exportForDrawing(cover?: canvas.DrawingCover): Promise<canvas.ExportedPaper>;
  cropStrokes(submission: canvas.PaperSubmission): readonly canvas.CropStroke[];
  drawTutor(submission: canvas.PaperSubmission, act: canvas.TutorAct): Promise<void>;
  exportPicture(): Promise<Blob>;
  readonly paintStats: canvas.PaintStats;
  paintFlash: boolean;
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
  { kind: "tutor", t: 2100, strokes: [{ id: 3, kind: "tutor", style: { pen: "liner", color: "#e5322d", width: 3, opacity: 100 }, points: [{ x: 10, y: 10, t: 2100, p: 0 }, { x: 40, y: 12, t: 2100, p: 0 }] }], ids: [] },
  { kind: "undo", t: 2200, removed: [3], restored: [1, 2] },
  { kind: "move", t: 2600, ids: [1], strokes: [{ id: 4, kind: "pen", points: [{ x: 160, y: 340, t: 0, p: 0.5 }, { x: 160, y: 640, t: 400, p: 0.5 }] }] },
  { kind: "copy", t: 3000, ids: [4], strokes: [{ id: 5, kind: "pen", points: [{ x: 160, y: 680, t: 0, p: 0.5 }, { x: 160, y: 980, t: 400, p: 0.5 }] }] },
];

/** A style of each kind of pen, a stroke with one, and a cut that leaves two pieces of it. */
export const ink: canvas.StrokeStyle = { pen: "pen", color: "#1c1c1e", width: 2, opacity: 100 };
export const liner: canvas.StrokeStyle = { pen: "liner", color: "#0a63d6", width: 1.2, opacity: 100 };
export const marker: canvas.StrokeStyle = { pen: "marker", color: "#ffcc00", width: 12, opacity: 40 };
export const styled: readonly canvas.HistoryEvent[] = [
  {
    kind: "write",
    t: 300,
    stroke: { id: 1, kind: "mouse", style: liner, points: [{ x: 100, y: 300, t: 0, p: 0.5 }, { x: 200, y: 300, t: 150, p: 0.5 }, { x: 300, y: 300, t: 300, p: 0.5 }] },
  },
  {
    kind: "cut",
    t: 900,
    ids: [1],
    pieces: [
      { of: 1, stroke: { id: 2, kind: "mouse", style: liner, points: [{ x: 100, y: 300, t: 0, p: 0.5 }, { x: 180, y: 300, t: 120, p: 0.5 }] } },
      { of: 1, stroke: { id: 3, kind: "mouse", style: liner, points: [{ x: 220, y: 300, t: 180, p: 0.5 }, { x: 300, y: 300, t: 300, p: 0.5 }] } },
    ],
  },
  { kind: "undo", t: 1200, removed: [2, 3], restored: [1] },
];
export const pens: canvas.PenSettings = { pen: "marker", styles: { pen: ink, liner, marker }, eraser: "part", eraserSize: 16, select: "rectangle" };
sheet.pens = pens;
sheet.pens = undefined;
export const kind: canvas.PenKind = sheet.pens.pen;
// @ts-expect-error A kind of pen is one of three.
export const pencil: canvas.StrokeStyle = { pen: "pencil", color: "#000000", width: 1, opacity: 100 };
// @ts-expect-error A cut names the pieces it left, each of the stroke it was cut of.
export const unpieced: canvas.HistoryEvent = { kind: "cut", t: 0, ids: [1], pieces: [{ id: 2, kind: "pen", points: [] }] };
// @ts-expect-error The eraser takes strokes whole or in part: no third way.
export const brushed: canvas.PenSettings = { ...pens, eraser: "pixel" };
// @ts-expect-error Select draws a lasso or a rectangle: no other shape.
export const circled: canvas.PenSettings = { ...pens, select: "ellipse" };
// @ts-expect-error A move names the strokes it took off.
export const unnamed: canvas.HistoryEvent = { kind: "move", t: 0, strokes: [] };
document.addEventListener("penchange", (change) => {
  const chosen: canvas.PenKind = change.detail.pen;
  // @ts-expect-error The settings told are the learner's choice, to read.
  change.detail.eraserSize = chosen === "pen" ? 1 : 2;
});

/** A history of a task from paper: a stroke on the tracing paper, and one on the sheet. */
export const traced: readonly canvas.HistoryEvent[] = [
  { kind: "write", t: 300, on: "tracing", stroke: { id: 1, kind: "pen", points: [{ x: 40, y: 20, t: 0, p: 0.5 }] } },
  { kind: "write", t: 800, stroke: { id: 2, kind: "pen", points: [{ x: 100, y: 700, t: 500, p: 0.5 }] } },
];

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
export const paperSubmission: canvas.PaperSubmission = {
  crop: sheetSubmission.crop,
  groups: [{ label: "A", ids: [1, 2] }],
  tracing: { at: [60, 40], hidden: false },
  digest: "00112233445566ff",
};
export const submissions: readonly canvas.Submission[] = [sheetSubmission, workbookSubmission, paperSubmission];

sheet.tool = "eraser";
sheet.tool = "select";
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
 * The element's mark of the contract's: undefined for a mark with no kind or no place, which api
 * never sends.
 */
export function markOf(mark: api.Mark, name: string): canvas.Mark | undefined {
  const { place } = mark;
  let at: canvas.Anchor;
  switch (place.case) {
    case "answerSlot":
      at = { cell: { item: place.value.item, slot: place.value.slot } };
      break;
    case "cropBox":
      at = { box: [place.value.ymin, place.value.xmin, place.value.ymax, place.value.xmax] };
      break;
    case undefined:
      return undefined;
    default:
      return unknown(place);
  }
  switch (mark.kind) {
    case MarkKind.FRAME:
      return { kind: "frame", at, name };
    case MarkKind.WAVY_LINE:
      // A wavy line stands at a box alone: api sends it at no other place.
      return "box" in at ? { kind: "wavy_line", at, name } : undefined;
    case MarkKind.UNSPECIFIED:
      return undefined;
    default:
      return unknown(mark.kind);
  }
}

/** The marks of an answer of api, numbered among those the element takes. */
declare const answer: api.GetRungWordsResponse;
const placed = answer.marks.filter((mark) => markOf(mark, "") !== undefined);
export const given: canvas.Marks = {
  submission: sheetSubmission,
  marks: placed.flatMap((mark, n) => markOf(mark, `Tutor's mark ${n + 1} of ${placed.length}`) ?? []),
};
sheet.marks = given;
sheet.marks = { submission: workbookSubmission, marks: [{ kind: "frame", at: { cell: { item: 1, slot: 2 } }, name: "Tutor's mark 1 of 1: line 1, box 2" }] };
sheet.marks = { submission: sheetSubmission, marks: [{ kind: "frame", at: { group: "A" }, name: "Tutor's mark 1 of 1" }] };
sheet.marks = { submission: paperSubmission, marks: [{ kind: "wavy_line", at: { box: [400, 100, 480, 600] }, name: "Tutor's mark: where the mistake is" }] };
sheet.marks = { submission: paperSubmission, marks: [{ kind: "verdict", at: { box: [100, 600, 180, 700] }, correct: false, name: "Task 2: not yet" }] };
sheet.marks = undefined;
export const shown: canvas.Marks | undefined = sheet.marks;
export const kept: readonly canvas.HistoryEvent[] = sheet.history;
export const filled: canvas.Filled | null = sheet.filled;
export const first: boolean | undefined = sheet.filled?.[0]?.[0];
export const work: Promise<canvas.ExportedWork | null> = sheet.exportWork();
export const picture: Promise<Blob> = sheet.exportPicture();

/** The debug view reads what the drawing costs, and turns the flash of what a frame paints. */
const stats: canvas.PaintStats = sheet.paintStats;
export const paintP95: number = [...stats.paintMs].sort((a, b) => a - b)[Math.floor(stats.paintMs.length * 0.95)] ?? 0;
export const lastArea: number | undefined = stats.last?.area;
export const bytes: number = stats.buffers.reduce((n, b) => n + b.width * b.height * 4, 0);
sheet.paintFlash = true;
// @ts-expect-error: the reading is the element's, never the consumer's
sheet.paintStats = stats;

/** A worked example in place of the task, and how far its demo has gone, which app keeps. */
sheet.task = undefined;
sheet.workedExample = example;
export const demo: canvas.DemoState | undefined = sheet.demoState;
sheet.demoState = { opened: 2, hidden: true };
sheet.demoState = undefined;
sheet.workedExample = undefined;

/** A task from paper in place of the task, and where its tracing paper lies, which app keeps. */
declare const statement: Blob;
sheet.paper = { statement };
sheet.history = traced;
export const tracing: canvas.TracingState | undefined = sheet.tracing;
sheet.tracing = { at: [0, 120], hidden: true };
sheet.tracing = { at: [0, 120], hidden: false, scale: 1.5 };
sheet.tracing = undefined;
// The reading of the statement by Recognise, which app gives back.
export const reading: canvas.TracingReading | undefined = sheet.reading;
sheet.reading = { state: "busy" };
sheet.reading = { state: "done", statements: ["□ + 1 = 3"] };
sheet.reading = undefined;
// @ts-expect-error: a reading done holds its statements
sheet.reading = { state: "done" };
sheet.addEventListener("tracingread", (event) => {
  const none: null = event.detail;
  sheet.reading = { state: "busy" };
  return none;
});
export const grid: canvas.PaperGrid | undefined = sheet.grid;
sheet.grid = "blank";
sheet.grid = undefined;
// @ts-expect-error: a grid not of PaperGrid
sheet.grid = "hex";
sheet.addEventListener("gridchange", (event) => {
  const chosen: canvas.PaperGrid = event.detail.grid;
  return chosen;
});
sheet.tool = "hand";
sheet.paper = undefined;

/**
 * The work's keys tell its kind: the crop of a sheet, the crops of a workbook's boxes, or a task
 * from paper's two images.
 */
export const sent: Blob | readonly Blob[] =
  "statement" in done ? [done.statement, done.png] : "png" in done ? done.png : done.cells.map(({ png }) => png);
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
document.addEventListener("tracingchange", (change) => {
  const state: canvas.TracingState = change.detail;
  return state.hidden;
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
// @ts-expect-error The work's picture comes with no condition: a canvas that may give none breaks the contract.
export const none: canvas.CanvasElement["exportPicture"] = async () => null;
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
// @ts-expect-error A frame, a wavy line and a verdict are the kinds of a mark.
export const arrow: canvas.Mark = { kind: "arrow", at: { group: "A" }, name: "Tutor's mark 1 of 1" };
// @ts-expect-error A verdict says whether the answer is right.
export const verdictBare: canvas.Mark = { kind: "verdict", at: { box: [100, 600, 180, 700] }, name: "Task 2" };
// @ts-expect-error A verdict stands at a box on the crop alone.
export const verdictCell: canvas.Mark = { kind: "verdict", at: { cell: { item: 1, slot: 1 } }, correct: true, name: "Task 1: correct" };
// @ts-expect-error A wavy line stands at a box on the crop alone, never at a cell.
export const wavyCell: canvas.Mark = { kind: "wavy_line", at: { cell: { item: 1, slot: 1 } }, name: "Tutor's mark: where the mistake is" };
// @ts-expect-error Nor at a group.
export const wavyGroup: canvas.Mark = { kind: "wavy_line", at: { group: "A" }, name: "Tutor's mark: where the mistake is" };
// @ts-expect-error A task from paper is its crop, not the address of one.
sheet.paper = { statement: "page-1.jpg" };
// @ts-expect-error The tracing paper's place is two numbers, [x, y].
sheet.tracing = { at: [0], hidden: false };
// @ts-expect-error A stroke goes on the tracing paper or on the sheet: no other layer.
export const layered: canvas.HistoryEvent = { kind: "write", t: 0, on: "template", stroke: { id: 1, kind: "pen", points: [] } };
// @ts-expect-error A context of a task from paper names where its tracing paper lay.
export const untraced: canvas.PaperSubmission = { crop: sheetSubmission.crop, groups: [], digest: "00112233445566ff" };
// @ts-expect-error A context of a task from paper is no sheet's: the union is exact.
export const asSheet: canvas.SheetSubmission = paperSubmission;
declare const paperWork: canvas.ExportedPaper;
// @ts-expect-error Nor is its work a sheet's, though both have a PNG.
export const asSheetWork: canvas.ExportedSheet = paperWork;
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
document.addEventListener("tracingchange", (change) => {
  // @ts-expect-error The state told is where the learner put the tracing paper, to read.
  change.detail.hidden = true;
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
