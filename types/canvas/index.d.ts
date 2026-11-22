// Written by hand, not generated: tools/types writes the folders of the module format's types
// beside this one, and leaves it as it is (R74).

/**
 * The types of the element `<novatrail-canvas>`: the contract of canvas and app (R36). The element
 * takes a task and its module's manifest, the files of its pictures and the learner's history of
 * writing, by properties; it gives the work for checking and the work's picture by its methods, and
 * tells what the learner did by events. In place of a task it may show a lesson's worked example,
 * whose demo the learner opens part by part with its buttons, and how far they have gone is a
 * property and an event too. In place of either it may show a task from the learner's paper: the
 * task's crop over a sheet as tracing paper, which the learner moves, hides and writes on, and where
 * the tracing paper lies and the grid the learner chose for the sheet are properties and events as
 * well (R162). The types of the
 * task, of the worked example and of the manifest are the module format's open views,
 * formatv0/open.
 *
 * It takes the tutor's marks of a submission too, by a property, with the submission's context:
 * their kind and their place come from the contract between app and api, novatrail.api.v1, whose
 * message `Mark` these types are checked against, and their names from app (contracts/README.md,
 * section 15; R83). The element's members beyond this contract — its commands undo() and clear(),
 * which its own buttons call — and its place in the DOM's maps of tags and events are canvas's:
 * its package registers the element. The declarations take the DOM's
 * types: Blob, CustomEvent and HTMLElement.
 *
 * @packageDocumentation
 */

import type * as open from "../formatv0/open/index.js";

/**
 * What a press of the primary button does on the sheet: the pen writes, the eraser erases, the hand
 * moves the sheet and writes nothing. A task without the eraser has the pen and the hand.
 */
export type Tool = "pen" | "eraser" | "hand";

/** What a `toolchange` tells: the tool the learner chose with the element's own buttons. */
export interface ToolChange {
  readonly tool: Tool;
}

/**
 * The event the element sends from its host, bubbling and composed, when the learner changes the
 * tool with its buttons — not when the consumer sets `tool`, nor when a new task puts the pen back.
 * Its detail is frozen.
 */
export type ToolChangeEvent = CustomEvent<ToolChange>;

/**
 * How far the learner has gone through a worked example's demo: how many of its parts are open,
 * from the first, and whether the whole demo is hidden. Every demo starts at
 * `{ opened: 0, hidden: false }`.
 */
export interface DemoState {
  /** How many parts of the demo are open, from the first: from 0 to all of them. */
  readonly opened: number;
  /** Whether the whole demo is hidden: its open parts stay open, out of sight. */
  readonly hidden: boolean;
}

/**
 * The event the element sends from its host, bubbling and composed, when the learner opens the
 * next part of the demo, or hides or shows the whole demo, with its buttons — not when the consumer
 * sets `demoState`, nor when a new worked example starts its demo at the beginning. Its detail is
 * the new state, frozen.
 */
export type DemoChangeEvent = CustomEvent<DemoState>;

/**
 * A task from the learner's paper (concepts 8; R162): the task's crop, which app cut on the device
 * from the photo of the page by its task frame. The element lays it over a sheet as tracing paper,
 * in place of a task's statement and template; the sheet's grid is the learner's, `PaperGrid`. It
 * has no answer slot of the format: its one slot is the whole work, at the place 1, 1. The tools
 * are the pen, the eraser and the hand.
 */
export interface PaperTask {
  /** The task's crop, a JPEG or a PNG, as app cut it, without the learner's strokes. */
  readonly statement: Blob;
}

/**
 * The grid of a task from paper's sheet, the learner's choice: dots, lines, none or squares, of the
 * step of the module format's default. A new task from paper starts in dots; the element's button
 * of the grid turns it to the next of them, round, in this order.
 */
export type PaperGrid = "dots" | "lines" | "blank" | "squares";

/** What a `gridchange` tells: the grid the learner chose with the element's button. */
export interface GridChange {
  readonly grid: PaperGrid;
}

/**
 * The event the element sends from its host, bubbling and composed, when the learner turns the
 * grid of a task from paper's sheet by its button — not when the consumer sets `grid`. Its detail is
 * frozen.
 */
export type GridChangeEvent = CustomEvent<GridChange>;

/**
 * Where the tracing paper of a task from paper lies on the sheet, and whether it is hidden. A new
 * task from paper starts at the element's own place for it, shown.
 */
export interface TracingState {
  /** Its top left corner on the sheet, in the sheet's units: [x, y]. */
  readonly at: readonly [x: number, y: number];
  /**
   * Whether the tracing paper is hidden, with the strokes on it: they stay in the history and in
   * the work for checking, out of sight.
   */
  readonly hidden: boolean;
}

/**
 * The event the element sends from its host, bubbling and composed, when the learner moves the
 * tracing paper by its grip "Move the task", or hides or shows it by its button atop the tools —
 * not when the consumer sets `tracing`. Its detail is the new state, frozen.
 */
export type TracingChangeEvent = CustomEvent<TracingState>;

/**
 * A point of a stroke: where it lies on the sheet, in its logical units, when it was written and
 * how hard the pointer pressed.
 */
export interface InkPoint {
  /**
   * Across the sheet: 0 at its left edge, at most 10000. The task's page is its first 1000, and the
   * sheet goes on to the right of it as far as the learner writes and moves it (R06 canvas).
   */
  readonly x: number;
  /** Down the sheet: 0 at its top edge, at most 14000; the task's page is its first 1400. */
  readonly y: number;
  /** Milliseconds since the sheet's first event: the time of a sample has no date. */
  readonly t: number;
  /** The pressure, 0 to 1, as the pointer reported it. */
  readonly p: number;
}

/** A stroke: one press of a pointer, from going down to coming up. */
export interface Stroke {
  /**
   * The stroke's ID on its sheet: 1, 2, … in the order the strokes began, never reused within one
   * history. A sheet given another history numbers on from that history's highest ID.
   */
  readonly id: number;
  /**
   * The pointer's type as the browser reported it — "pen", "touch", "mouse" or whatever else it
   * says. Only a pen's pressure changes the width of the line.
   */
  readonly kind: string;
  /** The points in the order they were written, the first where the pointer went down. */
  readonly points: readonly InkPoint[];
}

/**
 * An event of the history of writing: what an action on the sheet did, at the sheet's time `t`
 * when it landed, in the order the actions landed — so `t` never goes back along a history. Each
 * event says which strokes it put on the sheet or took off, so whoever reads the history replays it
 * without the rules of the stack of undo. The events are plain data, for JSON as they are; those
 * the sheet hands out are frozen through. A sample file of the eval protocol holds the same
 * history, spelt as its contract has it and without the pressure of a point (contracts/README.md,
 * section 12; R94).
 */
export type HistoryEvent =
  /**
   * A stroke written, and when it landed: its last point's time, or later, if it ended without its
   * pointerup after an action that landed while it was under way. On a task from paper, `on` is
   * `"tracing"` for a stroke written on the tracing paper, whose points are in the sheet's units
   * from the tracing paper's top left corner, so that it moves with it; a stroke of the sheet has
   * no `on`.
   */
  | { readonly kind: "write"; readonly t: number; readonly stroke: Stroke; readonly on?: "tracing" }
  /** One press of the eraser: the strokes it took off, in the sheet's order, when it lifted. */
  | { readonly kind: "erase"; readonly t: number; readonly ids: readonly number[] }
  /** The sheet cleared: every stroke that was on it, in the sheet's order. */
  | { readonly kind: "clear"; readonly t: number; readonly ids: readonly number[] }
  /**
   * The last action still in force taken back: the stroke it took off, if it was a writing, or the
   * strokes it brought back, if it was an erasing or a clearing.
   */
  | {
      readonly kind: "undo";
      readonly t: number;
      readonly removed: readonly number[];
      readonly restored: readonly number[];
    };

/**
 * What a `historychange` tells: the events the history of writing has gained, in its order, and
 * where the first of them stands in it — `history` is what was there before, and these. A store
 * whose length is not `from` has missed events, and reads `history` again.
 */
export interface HistoryChange {
  readonly events: readonly HistoryEvent[];
  readonly from: number;
}

/**
 * The event the element sends from its host, bubbling and composed, at once after every action on
 * the sheet: a stroke, an erasing, a clearing and an undo. Its detail is frozen. Setting `history`
 * sends none.
 */
export type HistoryChangeEvent = CustomEvent<HistoryChange>;

/**
 * An answer cell by its place, which has no ID: its item, and its place among the item's cells,
 * each from 1. On a workbook a cell is a box.
 */
export interface CellPlace {
  readonly item: number;
  readonly slot: number;
}

/**
 * Which answer slots the learner's strokes fill: per item, per slot, in the task's order, whether
 * the slot holds one of the strokes `exportWork()` would take. On a workbook a slot is a box; on a
 * sheet it is the task's one slot bound `anywhere` or `sheet`, and the sheet holds the strokes.
 */
export type Filled = readonly (readonly boolean[])[];

/** A filled box of a workbook and the IDs of its strokes, in ascending order. */
export interface Filling extends CellPlace {
  readonly ids: readonly number[];
}

/** A rectangle on the sheet, as the whole numbers of a crop hold it: in tenths of a unit. */
export interface Box {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

/**
 * A group's frame on a crop: its label, and its ink in fractions 0–1000 of the crop — every pixel
 * the ink of its strokes touches lies within it.
 */
export interface Frame {
  readonly label: string;
  /** [ymin, xmin, ymax, xmax] in whole thousandths of the crop's height and width; min < max. */
  readonly box: readonly [number, number, number, number];
}

/**
 * A group of the strokes on a sheet: its label, by place, and the IDs of its strokes, in ascending
 * order. The labels and the IDs are the table «label → stroke IDs» of one submission.
 */
export interface Group {
  readonly label: string;
  readonly ids: readonly number[];
}

/**
 * The numbers of a sheet's crop that the tutor's marks are placed by: where the crop lies on the
 * sheet, the frames of the groups, and the whole numbers they come from.
 */
export interface CropNumbers {
  /**
   * The height digits are drawn at, px: the height the manifest asks for, or less if the crop at it
   * would be too large.
   */
  readonly drawn: number;
  /** The width of the crop, px. */
  readonly width: number;
  /** The height of the crop, px. */
  readonly height: number;
  /** The margins above and to the left of the work, px; below and to the right is what is left. */
  readonly margins: readonly [top: number, left: number];
  /** Where the crop with its margins lies on the sheet: [ymin, xmin, ymax, xmax], in units. */
  readonly sheetBox: readonly [number, number, number, number];
  /** The frames of the groups, in the order of their labels. */
  readonly frames: readonly Frame[];
  /**
   * The whole numbers all of it comes from, in tenths of a unit: the box of the points, and the
   * median the scale takes.
   */
  readonly exact: { readonly box: Box; readonly median: number };
}

/**
 * The context of one submission of a sheet, which the element gives with its crop and takes back
 * with the tutor's marks: the crop's numbers, the groups of the strokes, and the digest of it all.
 * app keeps it on the device as it is, through JSON, unrounded, and sends it only within a stored
 * work, while the storage of the profile's works is on (R113).
 */
export interface SheetSubmission {
  readonly crop: CropNumbers;
  readonly groups: readonly Group[];
  /**
   * What the submission was made of: 16 hex digits. It catches a context that went astray, not one
   * forged.
   */
  readonly digest: string;
  /** Never on a sheet's context, so that a task from paper's is never taken for one. */
  readonly tracing?: never;
}

/**
 * The context of one submission of a workbook: the table «box → stroke IDs», each filled box by its
 * place, in the task's order, and the digest of its strokes, of every box of the page and of the
 * table's rows. A context of another layout of the page the element does not take back. app keeps
 * it on the device as it is, and sends it only within a stored work, while the storage of the
 * profile's works is on (R113).
 */
export interface WorkbookSubmission {
  readonly boxes: readonly Filling[];
  /** What the submission was made of: 16 hex digits. */
  readonly digest: string;
}

/**
 * The context of one submission of a task from paper: the numbers of the crop of the work — the
 * tracing paper at its place with the strokes on it, and the sheet's strokes —, the groups of the
 * strokes of both, where the tracing paper lay, and the digest of it all. A context of the tracing
 * paper at another place the element does not take back. app keeps it on the device, in the
 * profile's history of tasks from paper, and never sends it (R162).
 */
export interface PaperSubmission {
  readonly crop: CropNumbers;
  readonly groups: readonly Group[];
  readonly tracing: TracingState;
  /** What the submission was made of: 16 hex digits. */
  readonly digest: string;
}

/**
 * The context of one submission, of a sheet, of a workbook or of a task from paper: its keys tell
 * which.
 */
export type Submission = SheetSubmission | WorkbookSubmission | PaperSubmission;

/** The work of a sheet for checking: the PNG of the crop, and the context of the submission. */
export interface ExportedSheet {
  readonly png: Blob;
  readonly submission: SheetSubmission;
  /** Never on a sheet's work, so that a task from paper's is never taken for one. */
  readonly statement?: never;
}

/**
 * The crop of one filled box of a workbook — by the box's strokes alone, ink only, at the height of
 * a digit the manifest asks for — with its item and its slot.
 */
export interface ExportedCell extends CellPlace {
  readonly png: Blob;
}

/**
 * The work of a workbook for checking: the crop of each filled box, in the task's order, and the
 * context of the submission. The draft, the writing outside the boxes, goes nowhere.
 */
export interface ExportedWorkbook {
  readonly cells: readonly ExportedCell[];
  readonly submission: WorkbookSubmission;
}

/**
 * The work of a task from paper for checking, the two images of `PaperWork` of the contract: the
 * task's crop as it was given, and the PNG of the crop of the work — the tracing paper at its place
 * with the strokes on it, and the sheet's visible strokes, whether the tracing paper is shown or
 * hidden —, with the context of the submission (contracts/README.md, section 15).
 */
export interface ExportedPaper {
  readonly statement: Blob;
  readonly png: Blob;
  readonly submission: PaperSubmission;
}

/**
 * The work for checking, of a sheet, of a workbook or of a task from paper: its keys tell which —
 * `cells` a workbook, `statement` a task from paper, and `png` without it a sheet.
 */
export type ExportedWork = ExportedSheet | ExportedWorkbook | ExportedPaper;

/**
 * Where a tutor's mark is: a group of strokes by its label, an answer cell by its place, or a box on
 * the crop the model saw, as the contract's mark has its place (contracts/README.md, section 15). On
 * a workbook a mark stands on a cell alone. A group's label comes from api only if the frames of the
 * groups go with the work (repositories 8, Т-31).
 */
export type Anchor =
  | { readonly group: string }
  | { readonly cell: CellPlace }
  /** [ymin, xmin, ymax, xmax] in whole thousandths of the crop's height and width; min < max. */
  | { readonly box: readonly [number, number, number, number] };

/** A mark of the tutor's layer: a frame, a wavy line or a verdict, with where it is and its name. */
export type Mark = FrameMark | WavyLineMark | VerdictMark;

/** A frame round the place: on a sheet, on a workbook and on a task from paper. */
export interface FrameMark {
  readonly kind: "frame";
  readonly at: Anchor;
  /**
   * What a screen reader names it, in app's words, in the language of its screen: "Tutor's mark 1
   * of 2". The element words nothing, and a name empty or of white space alone is a TypeError.
   */
  readonly name: string;
}

/**
 * A wavy line under the place of the first mistake, on a task from paper alone, at a box on the
 * crop of its work, which the profile's hint mode "Show where" brings with the words of a rung
 * (concepts 10; R162). The element draws it under the strokes the box takes, on the sheet or on the
 * tracing paper, over a light halo, so that it holds the contrast of 3:1 over the sheet and over the
 * photo of any page, and puts it in the accessibility tree as it puts a frame, by its name (R90).
 */
export interface WavyLineMark {
  readonly kind: "wavy_line";
  /** [ymin, xmin, ymax, xmax] in whole thousandths of the crop's height and width; min < max. */
  readonly at: { readonly box: readonly [number, number, number, number] };
  /**
   * What a screen reader names it, in app's words, in the language of its screen: "Tutor's mark:
   * where the mistake is". A name empty or of white space alone is a TypeError.
   */
  readonly name: string;
}

/**
 * The verdict of one answer of a task from paper, by the answer on the crop of its work: a tick
 * when it is right, a cross when it is not, which app gives for each task of a frame of several
 * by the box its reading gave (R162). It is app's, not a mark of api's: the verdict of the answer
 * says it. The element draws it at the right of the group of the learner's strokes nearest the box,
 * one group a verdict, or of the box when none is near, over a light halo, so that it holds the
 * contrast of 3:1 over the sheet and over the photo of any page, and puts it in the accessibility
 * tree as it puts a frame, by its name (R90).
 */
export interface VerdictMark {
  readonly kind: "verdict";
  /** [ymin, xmin, ymax, xmax] in whole thousandths of the crop's height and width; min < max. */
  readonly at: { readonly box: readonly [number, number, number, number] };
  /** Whether the answer is right: a tick, or a cross. */
  readonly correct: boolean;
  /**
   * What a screen reader names it, in app's words, in the language of its screen: "Task 2: not
   * yet". A name empty or of white space alone is a TypeError.
   */
  readonly name: string;
}

/**
 * The tutor's marks of one submission, with the context of the submission that the element gave
 * with its work and app kept: a sheet's, a workbook's or a task from paper's. The marks are those of
 * one answer of api, in its order.
 */
export interface Marks {
  readonly submission: Submission;
  readonly marks: readonly Mark[];
}

/** The events of the element, by their names, for a consumer's map of events. */
export interface CanvasEventMap {
  historychange: HistoryChangeEvent;
  toolchange: ToolChangeEvent;
  demochange: DemoChangeEvent;
  tracingchange: TracingChangeEvent;
  gridchange: GridChangeEvent;
}

/**
 * What gives the file of a picture by its reference, the picture's path from the module's media/
 * folder: the consumer's, for the canvas goes to no network. app takes the files from the device
 * part of the module's package, which api serves.
 */
export type Media = (ref: string) => Promise<Blob>;

/**
 * The element `<novatrail-canvas>` as its contract with app has it. The language of its buttons is
 * its own attribute `lang`. While it has the boolean attribute `tools-hidden`, its bar of tools — and
 * on a worked example its row, with the slot `actions` — is out of sight and out of the
 * accessibility tree: app sets it on a phone while its tutor's sheet is open. While it has the boolean
 * attribute `statement-hidden`, it draws no task statement, and app draws the statement as its card
 * above the element (R161). Among the style properties `--novatrail-canvas-*` that app sets,
 * `--novatrail-canvas-accent` is the accent of the tool in use and of the focus ring,
 * `--novatrail-canvas-glass` the fill of the bar's glass, `--novatrail-canvas-top` the offset of the
 * band in whose middle the bar stands, and `--novatrail-canvas-pad-top` and
 * `--novatrail-canvas-pad-bottom` how far app's own bars float over the element's top and bottom:
 * the statement starts below the first, the sheet scrolls up past the second, and the bar's band
 * ends above the second. On a worked example, app puts its own "Continue" into the element's named slot `actions`, a child
 * `<button slot="actions">`, in one row after the element's Next and Demo (R36).
 */
export interface CanvasElement extends HTMLElement {
  /**
   * What a press of the primary button does. The learner switches it with the element's buttons,
   * which a `toolchange` tells; the consumer may set it too, which tells nothing.
   */
  tool: Tool;
  /**
   * The open view of the task, given before the history and the marks. The element shows a task
   * or a worked example, not both: a task given while it shows an example is a TypeError, and so is
   * a task with an answer slot bound `zone`, which no module of the first slice takes.
   */
  task: open.Task | undefined;
  /**
   * A task from the learner's paper, in place of a task of a module and of a worked example: one
   * given while the element shows either is a TypeError, and so are a task or an example given
   * while it shows one. Its manifest is none: the height of a digit on the crop is the default of
   * the module format, and the element's buttons speak its `lang`. Given before the history, the
   * tracing paper's state and the marks.
   */
  paper: PaperTask | undefined;
  /**
   * Where the tracing paper lies and whether it is hidden, frozen: `undefined` without a task from
   * paper. The learner changes it by the grip and the button, which a `tracingchange` tells; the
   * consumer keeps it and gives it back to open the task as it was, which tells nothing. A state
   * given before the task from paper is a TypeError, and so is one that puts the tracing paper
   * wholly off the sheet; `undefined` changes nothing.
   */
  get tracing(): TracingState | undefined;
  set tracing(state: TracingState | undefined);
  /**
   * The grid of the task from paper's sheet: `undefined` without a task from paper, and "dots" as
   * one comes. The learner turns it by the element's button, which a `gridchange` tells; the
   * consumer keeps it and gives it back, which tells nothing. A grid given before the task from
   * paper is a TypeError, and so is one not of `PaperGrid`; `undefined` changes nothing.
   */
  get grid(): PaperGrid | undefined;
  set grid(grid: PaperGrid | undefined);
  /**
   * The open view of a lesson's worked example, its segment `worked_example`, in place of a task;
   * its module's manifest is `manifest`, as a task's is. The element shows the example's statement
   * and its sheet, which the learner does not write on: the sheet takes no input, and the tool is the
   * pen alone, so an eraser is a TypeError. An example given while the element shows a task, or has
   * a history of writing, is a TypeError; while it shows one, so are a task, a history other than
   * the empty one and the marks, and `filled` and `exportWork()` give `null`. app gives each segment
   * of a lesson a new element. On one element, a task comes once the example is `undefined`, and
   * another example starts its demo at the beginning.
   */
  workedExample: open.WorkedExample | undefined;
  /**
   * How far the learner has gone through the worked example's demo, frozen: `undefined` without an
   * example, and `{ opened: 0, hidden: false }` as a new one starts. The learner changes it with the
   * element's buttons, which a `demochange` tells; the consumer keeps it and may give it back,
   * which tells nothing. Given before an example, a state is a TypeError, and so is one the demo
   * cannot have, such as more parts open than it has; `undefined` changes nothing.
   */
  get demoState(): DemoState | undefined;
  set demoState(state: DemoState | undefined);
  /**
   * The open view of the manifest of the module of the task or of the worked example. The element
   * reads its version of the module format, the height of a digit on the crop for checking,
   * `canvas.digit_height`, and its explanation language. A canvas setting it does not know is a
   * TypeError.
   */
  manifest: open.Manifest | undefined;
  /**
   * What gives the files of the pictures of the task or of the worked example — its statement's,
   * and every part's of its demo — by their references. A reference is asked for once, however many
   * pictures show it. Until a picture's file comes, or if it never does, its frame shows what it
   * shows in words. A new function serves the references that have no file yet. Anything but a
   * function or `undefined` is a TypeError.
   */
  media: Media | undefined;
  /**
   * The history of writing: every stroke, erasing, clearing and undo on the sheet, frozen. The
   * consumer keeps it, adding what `historychange` tells, and gives it back to open the sheet as it
   * was. A history the sheet could not have written is a TypeError, and the sheet stays as it was;
   * `undefined` is the empty one.
   */
  get history(): readonly HistoryEvent[];
  set history(history: readonly HistoryEvent[] | undefined);
  /**
   * The tutor's marks of one submission, on the tutor's layer, given after the task and the
   * history they hold on to. A mark holds on to the strokes the model saw at its place and is drawn
   * around those of them the sheet shows, as they are now: a box on the crop takes the strokes by
   * the rule of snapping (contracts/README.md, section 12), and a cell of a workbook is framed with
   * its box — round the box alone when the box was empty. A cell on a sheet, and a box that comes
   * near no stroke, have no frame: the question is asked without one. A submission goes back to the
   * sheet or the page it was made on, as its digest tells: one of other strokes or other boxes is a
   * TypeError, and so are marks given before the task and the history, a mark of another kind, a
   * name empty or of white space alone, a group's label the submission has not, a box that is not
   * whole thousandths with min < max, on a workbook any place but a cell, and a wavy line anywhere
   * but on a task from paper. A new history puts the
   * marks back on their strokes, or takes them off. `undefined` takes the marks off. A worked
   * example's sheet has nothing to mark: marks are a TypeError there.
   */
  get marks(): Marks | undefined;
  set marks(marks: Marks | undefined);
  /**
   * Which answer slots are filled, frozen: a workbook's boxes, on a sheet the task's one slot
   * bound `anywhere` or `sheet`, and on a task from paper its one slot, the sheet and the tracing
   * paper both. `null` on a sheet whose slots are bound `choice`, whose options app
   * marks, on a sheet with no task, and for a worked example. An action on the sheet changes it
   * before its `historychange`, and a task or a history given changes it with no event.
   */
  readonly filled: Filled | null;
  /**
   * The work for checking, as the sheet is when it is called: a sheet's crop, a workbook's boxes, or
   * a task from paper's crop of its work with the task's crop, with the context of the submission. A
   * sheet without strokes, a task from paper with no stroke on the sheet or on the tracing paper, a
   * workbook with no box filled and a worked example give `null`.
   */
  exportWork(): Promise<ExportedWork | null>;
  /**
   * The picture of the work, which app puts as the stored work's `picture` (contracts/README.md,
   * section 15): always a Blob of a PNG, with no condition, of the strokes the surface shows as it is
   * when it is called — the page, a sheet's or a workbook's, and the ink past it, right and down, with
   * the tracing paper of a task from paper where it lies —, within the limit of a stored work there.
   * Its size, in its PNG's header, and its colours are canvas's (R83 canvas).
   */
  exportPicture(): Promise<Blob>;
}
