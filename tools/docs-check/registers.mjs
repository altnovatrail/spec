// The registers — R in the decision log, О-, П-, Т- in the open questions — are numbered
// 1, 2, 3… without gaps or repeats; the register's opening names the next free number, one
// more than the last; and every number cited anywhere exists. The tables of a RUN.md, В and Д,
// keep no gapless count: their rows leave, and the next free number is above every row.

import { findNumbers } from "./citations.mjs";

const canonical = (register, number) => String(number).padStart(register.width, "0");
const label = (register, digits) => `${register.prefix}${digits}`;

// Reads each register from its file: a Map from prefix to { register, numbers: Set, next }.
export function readRegisters(files, registers, report) {
  const result = new Map();
  for (const register of registers) {
    const doc = files.get(register.file);
    if (!doc) {
      report(register.file, 0, `register ${register.prefix}: the file does not exist`);
      continue;
    }
    if (register.heading && opening(register, doc).index < 0) {
      report(register.file, 0, `register ${register.prefix}: no heading «${register.heading} …» to hold it`);
      continue;
    }
    const entries = register.definedBy === "entry" ? entriesOf(register, doc) : rowsOf(register, doc, report);
    const where = registerLine(register, doc);
    const numbers = new Set();
    let previous = 0;
    for (const { digits, line } of entries) {
      const number = Number(digits);
      if (digits !== canonical(register, number)) {
        report(register.file, line, `${label(register, digits)}: write ${label(register, canonical(register, number))}`);
      }
      if (numbers.has(number)) report(register.file, line, `${label(register, digits)} is defined twice`);
      if (register.ordered && number < previous) {
        report(register.file, line, `${label(register, digits)} comes after ${label(register, canonical(register, previous))}: the register goes in order`);
      }
      numbers.add(number);
      previous = Math.max(previous, number);
    }
    // A repository's log is empty until its first decision, and a table until its first row.
    if (numbers.size === 0 && !register.empty) {
      report(register.file, where, `register ${register.prefix}: no entries found`);
      continue;
    }
    const max = numbers.size ? Math.max(...numbers) : 0;
    if (!register.gaps) {
      for (let n = 1; n <= max; n++) {
        if (!numbers.has(n)) report(register.file, where, `${label(register, canonical(register, n))} is missing: the numbers go 1, 2, 3… without gaps`);
      }
    }

    const next = nextFree(register, doc);
    if (next.length === 0) {
      report(register.file, where, `register ${register.prefix}: its opening does not name the next free number ("Следующий номер — ${label(register, canonical(register, max + 1))}")`);
    } else if (next.length > 1) {
      report(register.file, next[1].line, `register ${register.prefix}: its opening names the next free number more than once`);
    } else if (register.gaps && next[0].number <= max) {
      report(register.file, next[0].line, `the next free number is ${label(register, next[0].digits)}, but ${label(register, canonical(register, max))} is in the table: it should be above every number in it`);
    } else if (!register.gaps && next[0].number !== max + 1) {
      report(register.file, next[0].line, `the next free number is ${label(register, next[0].digits)}, but the last is ${label(register, canonical(register, max))}: it should be ${label(register, canonical(register, max + 1))}`);
    }
    result.set(register.prefix, { register, numbers, next: next[0]?.number ?? max + 1 });
  }
  return result;
}

// "**R01. …**" paragraphs.
function entriesOf(register, doc) {
  const head = new RegExp(`^${register.prefix}(\\d+)\\.\\s`, "u");
  return doc.blocks
    .filter((b) => b.type === "paragraph" && b.strongStart)
    .map((b) => ({ match: head.exec(b.text), line: b.lineAt(0) }))
    .filter((e) => e.match)
    .map((e) => ({ digits: e.match[1], line: e.line }));
}

// Rows of the tables in the register's section and its subsections, or right under its heading;
// the first cell is the number.
function rowsOf(register, doc, report) {
  const cell = new RegExp(`^${register.prefix}(\\d+)$`, "u");
  const under = opening(register, doc).index;
  const inSection = (s) => s === register.section || s?.startsWith(`${register.section}.`);
  const belongs = (table) => (register.heading ? under >= 0 && table.heading === under : inSection(table.section));
  const entries = [];
  for (const table of doc.tables.filter(belongs)) {
    for (const row of table.rows) {
      const match = cell.exec(row.cells[0] ?? "");
      if (match) entries.push({ digits: match[1], line: row.line });
      else report(register.file, row.line, `a row of register ${register.prefix} does not start with its number: "${row.cells[0]}"`);
    }
  }
  return entries;
}

// The blocks directly under the register's heading: the preamble when section is null.
function opening(register, doc) {
  let index;
  if (register.heading) index = doc.headings.findIndex((h) => h.text.startsWith(register.heading));
  else if (register.section === null) index = doc.headings.findIndex((h) => h.depth === 1);
  else index = doc.headings.findIndex((h) => h.number === register.section);
  return { index, blocks: doc.blocks.filter((b) => b.type !== "heading" && b.heading === index) };
}

function registerLine(register, doc) {
  const { index } = opening(register, doc);
  return doc.headings[index]?.line ?? 1;
}

// "Следующий номер — R32", or in a RUN.md's table "следующий — В25".
function nextFree(register, doc) {
  const phrase = new RegExp(`следующ\\p{L}*(?:\\s+номер\\p{L}*)?\\s*[—–-]\\s*${register.prefix}(\\d+)`, "giu");
  const found = [];
  for (const block of opening(register, doc).blocks) {
    for (const m of block.text.matchAll(phrase)) {
      found.push({ digits: m[1], number: Number(m[1]), line: block.lineAt(m.index) });
    }
  }
  return found;
}

// Every register number cited in the documents exists, in the register of the scope it is cited
// in: "R01" in the repository's own log, "R18 spec" in spec's. О-, П-, Т- are spec's registers
// wherever they are cited. The next free number may be named only in a sentence that says it is
// the next one. `registerOf(prefix, scope)` is the register read for that prefix and scope.
export function checkCitedNumbers(files, registerOf, report) {
  let count = 0;
  for (const [file, doc] of files) {
    for (const block of doc.blocks) {
      for (const n of findNumbers(block)) {
        if (n.scope === "foreign") continue;
        const known = registerOf(n.prefix, n.scope);
        if (!known) continue;
        count++;
        const { register, numbers, next } = known;
        const line = block.lineAt(n.start);
        if (!n.inRange && n.digits !== canonical(register, n.number)) {
          report(file, line, `${label(register, n.digits)}: write ${label(register, canonical(register, n.number))}`);
        }
        if (numbers.has(n.number)) continue;
        if (n.number === next && /следующ|\bnext\b/iu.test(block.sentenceAt(n.start))) continue;
        const what = n.number === next ? "is the next free number, not an entry yet" : "does not exist";
        report(file, line, `${label(register, canonical(register, n.number))} ${what} (${register.file})`);
      }
    }
  }
  return count;
}
