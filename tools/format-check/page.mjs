// The page of a workbook, as section 14 of the format text gives it (format/README.md; the
// 2026-11-01 amendment to R51): where the template puts each item's number, the pieces of its line
// and its boxes, in whole units of the page, from the task's items alone, by the numbers and the
// table of widths of format/page.yaml. A second implementation beside module-kit's, by which spec's
// CI computes the vectors of the page and checks task.workbook-page. It is the layout of canvas,
// src/core/page.ts and src/core/widths.ts at its commit 73807f2 (Apache-2.0, as all of NovaTrail),
// ported to JavaScript with its numbers read from page.yaml rather than held in the code. Which
// character is which comes from explicit ranges of code points alone, never from the engine's
// Unicode tables, so that every engine lays a page out alike.

// The table that a run of format-check reads from format/page.yaml, or null when it has none:
// task.workbook-page is then not checked.
let current = null;

// Takes the value of format/page.yaml, valid against its schema, for the checks that follow, or
// null.
export function usePage(value) {
  current = value ? tableOf(value) : null;
}

// Whether a run has a table to lay pages out by.
export const hasPage = () => current !== null;

// "U+00A0" as a code point; "U+0300–U+036F" as a range [from, to].
const codeOf = (text) => Number.parseInt(text.slice(2), 16);
const rangeOf = (text) => {
  const [from, to = from] = text.split("–");
  return [codeOf(from), codeOf(to)];
};

// The table of a value of page.yaml: the numbers, the widths by code point and the ranges.
function tableOf({ sheet, numbers, most_items: most, widths, joints }) {
  const own = new Map();
  for (const { width, characters } of widths.characters) for (const char of characters) own.set(char.codePointAt(0), width);
  for (const { code_point: code, width } of widths.spaces) own.set(codeOf(code), width);
  return {
    sheet,
    numbers,
    most,
    digits: { codes: new Set([...widths.digits.characters].map((char) => char.codePointAt(0))), width: widths.digits.width },
    signs: { codes: new Set([...widths.signs.characters].map((char) => char.codePointAt(0))), width: widths.signs.width },
    space: widths.space,
    own,
    zero: widths.zero.map(rangeOf),
    wide: { ranges: widths.wide.ranges.map(rangeOf), width: widths.wide.width },
    breaks: new Set(widths.breaks.map(codeOf)),
    unknown: widths.unknown,
    joiner: codeOf(widths.joiner),
    regional: rangeOf(widths.regional_indicators),
    closing: joints.closing,
    opening: joints.opening,
  };
}

const within = (code, ranges) => ranges.some(([from, to]) => code >= from && code <= to);

// The width of a code point, in hundredths of the type size.
function widthOf(table, code) {
  if (within(code, table.zero)) return 0;
  if (table.digits.codes.has(code)) return table.digits.width;
  if (table.signs.codes.has(code)) return table.signs.width;
  const own = table.own.get(code);
  if (own !== undefined) return own;
  return within(code, table.wide.ranges) ? table.wide.width : table.unknown;
}

// The words of a piece of text: what lies between its runs of the white space that breaks.
function wordsOf(table, text) {
  const words = [];
  let word = "";
  for (const char of text) {
    if (table.breaks.has(char.codePointAt(0))) {
      if (word !== "") words.push(word);
      word = "";
    } else word += char;
  }
  if (word !== "") words.push(word);
  return words;
}

// The clusters of a word: a code point of no width, and whatever follows the joiner, go with the one
// before them, and so does the second regional indicator of a flag.
function clustersOf(table, word) {
  const clusters = [];
  let joined = false;
  let regional = 0;
  for (const char of word) {
    const code = char.codePointAt(0);
    const flag = code >= table.regional[0] && code <= table.regional[1];
    const last = clusters.length - 1;
    if (last >= 0 && (joined || within(code, table.zero) || (flag && regional === 1))) {
      clusters[last] += char;
      regional = flag && regional === 1 ? 2 : regional;
    } else {
      clusters.push(char);
      regional = flag ? 1 : 0;
    }
    joined = code === table.joiner;
  }
  return clusters;
}

const clusterWidth = (table, cluster) => widthOf(table, cluster.codePointAt(0));
const wordWidth = (table, word) => clustersOf(table, word).reduce((sum, cluster) => sum + clusterWidth(table, cluster), 0);

// The width of a text of hundredths of the type size, in whole units, rounded up.
function textWidth(table, hundredths) {
  const product = table.numbers.size * hundredths;
  return (product - (product % 100)) / 100 + (product % 100 > 0 ? 1 : 0);
}

// The numbers that the layout derives: the column of the numbers, "00." wide, the indent of a line
// after it, a column of short lines, a line across the page, where the second column starts and the
// lowest unit a row may reach.
function measuresOf(table) {
  const { numbers, sheet } = table;
  const column = textWidth(table, wordWidth(table, "00."));
  const content = sheet.width - 2 * numbers.margin;
  const half = Math.floor((content - numbers.gutter) / 2);
  return {
    space: textWidth(table, table.space),
    numbers: column,
    indent: column + numbers.gap,
    column: half,
    full: content - (column + numbers.gap),
    second: numbers.margin + half + numbers.gutter,
    floor: sheet.height - numbers.margin,
  };
}

// The page of a workbook's items, each { line: [{ text } | { binding }] }, by the table in use:
// { page: { items, bottom } }, or { noRoomAt }, the item from 0 at whose row the page has no room.
export function pageOf(items, table = current) {
  if (!table) throw new Error("format-check lays out no page without format/page.yaml");
  const measures = measuresOf(table);
  const { numbers } = table;
  const lines = [];
  const lineOf = (n) => (lines[n] ??= entriesOf(table, tokensOf(table, items[n]), measures));
  const short = (n) => n < items.length && partsOf(table, lineOf(n)).width <= measures.column - measures.indent;
  const placed = [];
  let top = numbers.margin;
  let bottom = numbers.margin;
  let i = 0;
  while (i < items.length) {
    const room = measures.floor - top;
    if (i >= table.most) return { noRoomAt: i };
    if (short(i)) {
      const cells = short(i + 1) && i + 1 < table.most ? [i, i + 1] : [i];
      const laid = cells.map((n, c) => itemOf(table, [lineOf(n)], n, c === 0 ? numbers.margin : measures.second, top, measures));
      const height = Math.max(...laid.map((one) => one.height));
      if (height > room) return { noRoomAt: i };
      placed.push(...laid.map((one) => one.item));
      bottom = top + height;
      i += cells.length;
    } else {
      const wrapped = linesOf(table, lineOf(i), measures, room);
      const laid = wrapped === undefined ? undefined : itemOf(table, wrapped, i, numbers.margin, top, measures);
      if (laid === undefined || laid.height > room) return { noRoomAt: i };
      placed.push(laid.item);
      bottom = top + laid.height;
      i += 1;
    }
    top = bottom + numbers.items;
  }
  return { page: { items: placed, bottom } };
}

// The tokens of an item's line: the words of its pieces of text, and its boxes, in order.
function tokensOf(table, item) {
  return item.line.flatMap((part, piece) => (part.binding !== undefined ? [{ piece, box: true }] : wordsOf(table, part.text).map((word) => ({ piece, word, width: wordWidth(table, word) }))));
}

const isWord = (token) => "word" in token;

// What lies between two tokens next to each other in a line: inner, a space within one piece's
// text; width, the room the layout sets; and whether a line may break there.
function jointOf(table, a, b, measures) {
  const { gap, apart } = table.numbers;
  if (isWord(a) && isWord(b)) {
    const glued = table.closing.includes(b.word.slice(0, 1)) || table.opening.includes(a.word.slice(-1));
    if (a.piece === b.piece) return { inner: true, width: 0, breaks: !glued };
    return { inner: false, width: glued ? 0 : measures.space, breaks: !glued };
  }
  if (isWord(a)) return { inner: false, width: gap, breaks: !table.opening.includes(a.word.slice(-1)) };
  // A box holds on to the word after it, as a number holds on to its unit.
  if (isWord(b)) return { inner: false, width: gap, breaks: false };
  return { inner: false, width: apart, breaks: true };
}

const entriesOf = (table, tokens, measures) => tokens.map((token, n) => ({ token, joint: n === 0 ? undefined : jointOf(table, tokens[n - 1], token, measures) }));

// The parts of a line of entries, from its start: the words of a piece that follow each other within
// it make one text, and each text and box has its place and its width.
function partsOf(table, entries) {
  const parts = [];
  let x = 0;
  let words = [];
  let hundredths = 0;
  let start = 0;
  const close = () => {
    if (!words.length) return;
    const width = textWidth(table, hundredths + table.space * (words.length - 1));
    parts.push({ box: false, text: words.join(" "), left: start, width });
    x = start + width;
    words = [];
    hundredths = 0;
  };
  for (const { token, joint } of entries) {
    if (isWord(token) && joint?.inner === true && words.length > 0) {
      words.push(token.word);
      hundredths += token.width;
      continue;
    }
    close();
    if (joint !== undefined) x += joint.width;
    if (isWord(token)) {
      start = x;
      words = [token.word];
      hundredths = token.width;
    } else {
      parts.push({ box: true, left: x, width: table.numbers.box_width });
      x += table.numbers.box_width;
    }
  }
  close();
  return { parts, width: x };
}

// The lines of a long item across the page: greedily, run by run, where a run is tokens no line may
// break between. A run wider than a line goes token by token, and a word wider than a line is broken
// between its clusters. Undefined once the lines could no longer fit the room left.
function linesOf(table, entries, measures, room) {
  const { full } = measures;
  // The lowest a line can be is the lower of a line of text and a box: more lines than this cannot
  // fit the room. It only stops early what could not fit anyway.
  const most = Math.floor(room / Math.min(table.numbers.line, table.numbers.box_height)) + 1;
  const lines = [];
  let current = [];
  const fits = (candidate) => partsOf(table, candidate).width <= full;
  const fresh = (entry) => ({ token: entry.token, joint: undefined });
  const end = () => {
    if (current.length) lines.push(current);
    current = [];
    return lines.length > most;
  };
  for (const run of runsOf(entries)) {
    if (current.length && fits([...current, ...run])) {
      current.push(...run);
      continue;
    }
    if (end()) return undefined;
    const alone = [fresh(run[0]), ...run.slice(1)];
    if (fits(alone)) {
      current = alone;
      continue;
    }
    for (const entry of run) {
      if (current.length && fits([...current, entry])) {
        current.push(entry);
        continue;
      }
      if (end()) return undefined;
      if (fits([fresh(entry)])) {
        current = [fresh(entry)];
        continue;
      }
      // A word wider than a line: its clusters, as many to a line as fit.
      const { token } = entry;
      let chunk = "";
      let width = 0;
      for (const cluster of clustersOf(table, token.word)) {
        const more = width + clusterWidth(table, cluster);
        if (chunk !== "" && textWidth(table, more) > full) {
          current = [{ token: { piece: token.piece, word: chunk, width }, joint: undefined }];
          if (end()) return undefined;
          chunk = "";
          width = 0;
        }
        chunk += cluster;
        width += clusterWidth(table, cluster);
      }
      current = [{ token: { piece: token.piece, word: chunk, width }, joint: undefined }];
    }
  }
  if (end()) return undefined;
  return lines;
}

// Entries cut where a line may break: each run starts with what lies before it.
function runsOf(entries) {
  const runs = [];
  for (const entry of entries) {
    const last = runs.at(-1);
    if (last === undefined || entry.joint === undefined || entry.joint.breaks) runs.push([entry]);
    else last.push(entry);
  }
  return runs;
}

// An item laid out from its lines at a place on the page: its parts in their places, its number on
// the first line's baseline, right in the column of the numbers, and its height.
function itemOf(table, lines, n, left, top, measures) {
  const { numbers } = table;
  const line = [];
  const baselines = [];
  let y = top;
  let boxed;
  for (const entries of lines) {
    const { parts } = partsOf(table, entries);
    const hasBox = parts.some((part) => part.box);
    if (boxed !== undefined) y += boxed && hasBox ? numbers.apart : boxed || hasBox ? numbers.lead : 0;
    const height = hasBox ? numbers.box_height : numbers.line;
    const baseline = y + Math.floor(height / 2) + Math.floor(numbers.size / 3);
    baselines.push(baseline);
    const x = left + measures.indent;
    for (const part of parts) {
      line.push(part.box ? { left: x + part.left, top: y, width: part.width, height: numbers.box_height } : { text: part.text, left: x + part.left, baseline, width: part.width });
    }
    y += height;
    boxed = hasBox;
  }
  const label = `${n + 1}.`;
  const width = textWidth(table, wordWidth(table, label));
  const number = { text: label, left: left + measures.numbers - width, baseline: baselines[0] ?? top + Math.floor(numbers.line / 2) + Math.floor(numbers.size / 3), width };
  const height = Math.max(y - top, lines.length === 0 ? numbers.line : 0);
  return { item: { number, line }, height };
}
