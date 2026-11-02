// Written by hand, not generated: tools/types writes the folders of the module format's types
// beside this one, and leaves it as it is (R74).

/**
 * The types of the element `<novatrail-canvas>`: the contract of canvas and app (R36). The element
 * takes a task and its module's manifest, the files of its pictures and the learner's history of
 * writing, by properties; it gives the work for checking by a method, and tells what the learner did
 * by events. In place of a task it may show a lesson's worked example, whose demo the learner opens
 * part by part with its buttons, and how far they have gone is a property and an event too. The
 * types of the task, of the worked example and of the manifest are the module format's open views,
 * formatv0/open.
 *
 * The tutor's marks — the property `marks` and the types of a mark — wait for the contract of epic
 * E3, and are canvas's own until then. The element's members beyond this contract — its commands
 * undo() and clear(), which its own buttons call — and its place in the DOM's maps of tags and
 * events are canvas's too: its package registers the element. The declarations take the DOM's
 * types: Blob, CustomEvent and HTMLElement.
 *
 * @packageDocumentation
 */

import type * as open from "../formatv0/open/index.js";

/**
 * What a press of the primary button does on the sheet: the pen writes, the eraser erases. A task
 * without the eraser has the pen alone.
 */
export type Tool = "pen" | "eraser";

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
 * A point of a stroke: where it lies on the sheet, in its logical units, when it was written and
 * how hard the pointer pressed.
 */
export interface InkPoint {
  /** Across the sheet: 0 at its left edge, its width, 1000, at its right. */
  readonly x: number;
  /** Down the sheet: 0 at its top edge, its height, 1400, at its bottom. */
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
 * the sheet hands out are frozen through. The eval protocol takes the history as it is (epic E3).
 */
export type HistoryEvent =
  /**
   * A stroke written, and when it landed: its last point's time, or later, if it ended without its
   * pointerup after an action that landed while it was under way.
   */
  | { readonly kind: "write"; readonly t: number; readonly stroke: Stroke }
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
 * app keeps it on the device as it is, through JSON, unrounded, and sends it nowhere.
 */
export interface SheetSubmission {
  readonly crop: CropNumbers;
  readonly groups: readonly Group[];
  /**
   * What the submission was made of: 16 hex digits. It catches a context that went astray, not one
   * forged.
   */
  readonly digest: string;
}

/**
 * The context of one submission of a workbook: the table «box → stroke IDs», each filled box by its
 * place, in the task's order, and the digest of its strokes, of every box of the page and of the
 * table's rows. A context of another layout of the page the element does not take back. app keeps
 * it on the device as it is, and sends it nowhere.
 */
export interface WorkbookSubmission {
  readonly boxes: readonly Filling[];
  /** What the submission was made of: 16 hex digits. */
  readonly digest: string;
}

/** The context of one submission, of a sheet or of a workbook: its keys tell which. */
export type Submission = SheetSubmission | WorkbookSubmission;

/** The work of a sheet for checking: the PNG of the crop, and the context of the submission. */
export interface ExportedSheet {
  readonly png: Blob;
  readonly submission: SheetSubmission;
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

/** The work for checking, of a sheet or of a workbook: its key, `png` or `cells`, tells which. */
export type ExportedWork = ExportedSheet | ExportedWorkbook;

/** The events of the element, by their names, for a consumer's map of events. */
export interface CanvasEventMap {
  historychange: HistoryChangeEvent;
  toolchange: ToolChangeEvent;
  demochange: DemoChangeEvent;
}

/**
 * What gives the file of a picture by its reference, the picture's path from the module's media/
 * folder: the consumer's, for the canvas goes to no network. app takes the files from the device
 * part of the module's package, which api serves.
 */
export type Media = (ref: string) => Promise<Blob>;

/**
 * The element `<novatrail-canvas>` as its contract with app has it. The language of its buttons is
 * its own attribute `lang`.
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
   * Which answer slots are filled, frozen: a workbook's boxes, and on a sheet the task's one slot
   * bound `anywhere` or `sheet`. `null` on a sheet whose slots are bound `choice`, whose options app
   * marks, on a sheet with no task, and for a worked example. An action on the sheet changes it
   * before its `historychange`, and a task or a history given changes it with no event.
   */
  readonly filled: Filled | null;
  /**
   * The work for checking, as the sheet is when it is called: a sheet's crop or a workbook's boxes,
   * with the context of the submission. A sheet without strokes, a workbook with no box filled and a
   * worked example give `null`.
   */
  exportWork(): Promise<ExportedWork | null>;
}
