// A document cut into pieces for its translation, and the translated pieces joined back. A piece
// ends right before a heading or, in a decision log, before the opening paragraph of an entry,
// "**R01. …**", once it holds `size` bytes. One that has grown to half as much again ends before
// any paragraph of its own, such as an amendment; to twice as much, before an item of a list or a
// row of a table, which then goes on in the next piece. Never inside a block of code or a quote.

const BOUNDARY = /^(?:#{1,6}\s|\*\*R\d+\.\s)/;
const PARAGRAPH = /^(?![\s>|]|[-*+]\s|\d+[.)]\s)\S/;
const ITEM = /^[-*+]\s/;
const ROW = /^\|/;
const DELIMITER = /^\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)*\|?\s*$/;
const FENCE = /^\s*(```|~~~)/;

// The pieces of `source`, in order: joined, they are the source byte for byte.
export function split(source, size = 40_000) {
  const lines = source.split(/(?<=\n)/);
  const pieces = [];
  let piece = "";
  let fence = null;
  let previous = "";
  let rows = 0; // the rows of the table the line stands in, so far
  for (const line of lines) {
    const fenced = FENCE.exec(line);
    if (fenced && (fence === null || fenced[1] === fence)) fence = fence === null ? fenced[1] : null;
    rows = ROW.test(line) ? rows + 1 : 0;
    const bytes = Buffer.byteLength(piece);
    const open = fence === null && !fenced;
    const blank = previous.trim() === "";
    const ends =
      open &&
      ((blank && BOUNDARY.test(line) && bytes >= size) ||
        (blank && PARAGRAPH.test(line) && bytes >= size * 1.5) ||
        (bytes >= size * 2 && (ITEM.test(line) || (rows > 2 && !DELIMITER.test(line)))));
    if (ends && piece) {
      pieces.push(piece);
      piece = "";
    }
    piece += line;
    previous = line;
  }
  if (piece) pieces.push(piece);
  return pieces;
}

// What follows the text of each piece — its newlines, as the original's piece has them — so that
// the translated pieces join as the original's did: a table or a list cut in two joins with no
// blank line.
export const endsOf = (pieces) => pieces.map((p) => /\s*$/.exec(p)[0]);

// The translated pieces joined, each ending as `ends` says, or else with a blank line.
export function join(pieces, ends = []) {
  return pieces.map((p, i) => p.replace(/\s+$/, "") + (ends[i] ?? (i === pieces.length - 1 ? "\n" : "\n\n"))).join("");
}
