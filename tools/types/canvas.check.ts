// The check of the types of <novatrail-canvas> by tsc, never run (R74): the element as canvas
// declares it and app uses it, imported from the npm package. `just types-check` copies it into its
// project as canvas.ts, beside the corpus, and tsc takes it under each resolution of modules, with
// the DOM (tools/types/typescript.mjs). What canvas and app may do type-checks; each line under a
// directive must be an error, and were it not, the directive would go unused, and that would be the
// error instead.

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
  get history(): readonly canvas.HistoryEvent[];
  set history(history: readonly canvas.HistoryEvent[] | undefined);
  get filled(): canvas.Filled | null;
  exportWork(): Promise<canvas.ExportedWork | null>;
  undo(): boolean;
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
sheet.history = history;
sheet.history = undefined;
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
// @ts-expect-error null is no worked example: undefined, and undefined alone, is none.
sheet.workedExample = null;
// @ts-expect-error A state of a demo says both how many parts are open and whether it is hidden.
sheet.demoState = { opened: 1 };
// @ts-expect-error A tool the sheet has not is no tool of it.
sheet.tool = "ruler";
// @ts-expect-error The marks wait for the contract of epic E3: the element's contract has none yet.
sheet.marks = undefined;
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
