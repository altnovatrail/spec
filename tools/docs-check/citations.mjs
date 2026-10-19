// Finds citations in a block's text: register numbers ("R15", "Т-7", "R15–R18"), sections
// ("product 7", "architecture 3.5, 4", "раздел 9.4"), and numbers typed in the wrong script.
// Each citation has a scope: "foreign" for other repositories ("R37 canvas-api", "canvas-api:
// R37, R38", "R3 api"), whose numbers belong to another log and are not checked; "spec" for
// spec's, cited with the suffix ("R18 spec", "concepts 9, 10 spec"); "own" for the rest.

import { CODE } from "./markdown.mjs";
import { documents, mathtrailRepositories, novatrailRepositories, otherTexts } from "./config.mjs";

export const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const mathtrail = mathtrailRepositories.map(escape).join("|");
const novatrail = novatrailRepositories.map(escape).join("|");

// "… canvas-api" right after a citation. NovaTrail's names are also English words ("R99 modules
// are data"), so "… api" counts only where the name ends the phrase: "«R3 api»", "(R3 api)", "R3 api — …".
const FOREIGN = `(?:${mathtrail})(?![\\p{L}\\p{N}-])|(?:${novatrail})(?=$|[^\\p{L}\\p{N}\\s-]|\\s+[^\\p{L}\\p{N}\\s])`;
const FOREIGN_SUFFIX = new RegExp(`^\\s+(?:${FOREIGN})`, "u");
// "`docs/spec.md` canvas-api, раздел 4.2": a MathTrail repository's name, a whole word, and a
// comma right before "раздел N" make it a section of that repository's document. NovaTrail's
// names are also words of prose — "в приложении app, раздел 3" — and do not count here.
const FOREIGN_BEFORE = new RegExp(`(?<![\\p{L}\\p{N}_.-])(?:${mathtrail})\\s*,\\s*$`, "u");
// "… spec" right after a citation: spec's own documents and registers.
const SPEC = "spec(?![\\p{L}\\p{N}_-])";
const SPEC_SUFFIX = new RegExp(`^\\s+${SPEC}`, "u");
// "canvas-api: R37, R38, R39" — the head of a list of MathTrail's citations.
const FOREIGN_LIST = new RegExp(`(?<![\\p{L}\\p{N}-])(?:${mathtrail}):\\s*`, "gu");
// One item of such a list: a number, a range, a section of its spec ("spec 4", "SPEC 2"), or a
// path in code. A citation of our own documents, "privacy 5", ends the list.
const LIST_ITEM = new RegExp(
  `(?:R\\d+(?:\\s*[–—-]\\s*R\\d+)?|[ОПТ]-\\d+(?:\\s*[–—-]\\s*[ОПТ]-\\d+)?` +
    `|(?:SPEC|spec)\\s+\\d+(?:\\.\\d+)*(?:\\s*[–—-]\\s*\\d+(?:\\.\\d+)*)?|${CODE})`,
  "uy",
);
const LIST_SEPARATOR = /(?:,\s*|\s+и\s+|\s+and\s+)/uy;

const NUMBER = /(?<![\p{L}\p{N}_-])(?:(R)(\d+)|([ОПТ])-(\d+))(?![\p{L}\p{N}])/gu;
const RANGE_DASH = /^\s*[–—-]\s*$/u;

// Sections are numbered 1–99 at every level, so "2026" in a date is never one.
const SECTION = /\d{1,2}(?:\.\d{1,2})*/;
const DOCUMENT_SECTION = new RegExp(
  `(?<![\\p{L}\\p{N}_./-])(${Object.keys(documents).join("|")})\\s+(${SECTION.source})(?![\\p{L}\\p{N}])`,
  "gu",
);
const WORD_SECTION = new RegExp(`(?<!\\p{L})(?:раздел(?:а|е|у|ом|ы|ов|ам|ами|ах)?|sections?)\\s+(${SECTION.source})(?![\\p{L}\\p{N}])`, "giu");
// One more section of the same citation: ", 4", " и 8", "–7". A number followed by a word is a
// count, not a section: "product 7, 12 модулей". A range is an en dash without spaces: "5–7".
const SECTION_MORE = new RegExp(
  `(\\s*,\\s*|\\s+и\\s+|\\s+and\\s+|–)(${SECTION.source})` +
    `(?![\\p{L}\\p{N}]|[.-]\\d|\\s+(?!(?:и|and)\\s+\\d|${FOREIGN}|${SPEC})\\p{L})`,
  "uy",
);
// "раздел 3 лицензии", "разделы 3 и 4 лицензии", "section 3 of the license": a section of some
// other text. Tested on the text after the first number.
const SECTION_OF_SOMETHING = new RegExp(
  `^(?:(?:\\s*,\\s*|\\s+(?:и|and)\\s+|–)${SECTION.source})*\\s+(?:${[...otherTexts, "of"].map(escape).join("|")})(?!\\p{L})`,
  "u",
);

// Cyrillic Р for R, Latin O, P, T for О, П, Т, a hyphen after R, a missing hyphen after О, П, Т.
// Each match names the register it looks like and the number.
const WRONG_SCRIPT = /(?<![\p{L}\p{N}_-])(?:(Р|R-)|([OPT])-|([ОПТ]))(\d+)(?![\p{L}\p{N}])/gu;
const LOOKS_LIKE = { O: "О-", P: "П-", T: "Т-", О: "О-", П: "П-", Т: "Т-" };

// The spans of a block covered by lists such as "canvas-api: R37, R38".
function foreignSpans(text) {
  const spans = [];
  for (const head of text.matchAll(FOREIGN_LIST)) {
    let at = head.index + head[0].length;
    let end = at;
    for (;;) {
      LIST_ITEM.lastIndex = at;
      const item = LIST_ITEM.exec(text);
      if (!item) break;
      end = at = item.index + item[0].length;
      LIST_SEPARATOR.lastIndex = at;
      const sep = LIST_SEPARATOR.exec(text);
      if (!sep) break;
      at = sep.index + sep[0].length;
    }
    if (end > head.index + head[0].length) spans.push([head.index, end]);
  }
  return spans;
}

const inSpans = (spans, offset) => spans.some(([s, e]) => offset >= s && offset < e);

// The scope a suffix right after a citation gives it.
export function scopeAfter(text, end) {
  const after = text.slice(end);
  if (FOREIGN_SUFFIX.test(after)) return "foreign";
  return SPEC_SUFFIX.test(after) ? "spec" : "own";
}

// A list of numbers takes the suffix after its last: "R02, R03 spec", "R37 и R38 canvas-api".
const NUMBER_LIST_SEPARATOR = /^(?:\s*,\s*|\s+и\s+|\s+and\s+)$/u;

// Register numbers in a block: [{ prefix, digits, number, start, end, scope }].
// A range "R15–R18" yields every number from 15 to 18.
export function findNumbers(block) {
  const { text } = block;
  const spans = foreignSpans(text);
  const found = [...text.matchAll(NUMBER)].map((m) => ({
    prefix: m[1] ?? `${m[3]}-`,
    digits: m[2] ?? m[4],
    start: m.index,
    end: m.index + m[0].length,
  }));

  // Each item is a number or a range, with the scope its own suffix gives it.
  const items = [];
  for (let i = 0; i < found.length; i++) {
    const first = found[i];
    let last = first;
    const next = found[i + 1];
    if (next && next.prefix === first.prefix && RANGE_DASH.test(text.slice(first.end, next.start))) {
      last = next;
      i++;
    }
    items.push({ first, last, scope: inSpans(spans, first.start) ? "foreign" : scopeAfter(text, last.end) });
  }
  // Back from the end of each list, the last item's suffix reaches the items before it.
  for (let i = items.length - 2; i >= 0; i--) {
    const [item, next] = [items[i], items[i + 1]];
    if (item.scope === "own" && next.scope !== "own" && NUMBER_LIST_SEPARATOR.test(text.slice(item.last.end, next.first.start))) {
      item.scope = next.scope;
    }
  }

  const result = [];
  for (const { first, last, scope } of items) {
    const from = Number(first.digits);
    const to = Number(last.digits);
    const width = first.digits.length;
    if (last !== first && to > from) {
      for (let n = from; n <= to; n++) {
        const isEnd = n === from || n === to;
        result.push({
          prefix: first.prefix,
          digits: n === from ? first.digits : n === to ? last.digits : String(n).padStart(width, "0"),
          number: n,
          start: n === to ? last.start : first.start,
          end: n === to ? last.end : first.end,
          scope,
          inRange: !isEnd,
        });
      }
    } else {
      result.push({ ...first, number: from, scope });
      if (last !== first) result.push({ ...last, number: to, scope });
    }
  }
  return result;
}

// The section numbers after a citation's first one: ", 4", " и 8", "–7".
function sectionList(text, first, at) {
  const list = [first];
  for (;;) {
    SECTION_MORE.lastIndex = at;
    const m = SECTION_MORE.exec(text);
    if (!m) break;
    if (m[1] === "–" && /^\d+$/.test(list.at(-1)) && /^\d+$/.test(m[2])) {
      for (let n = Number(list.at(-1)) + 1; n < Number(m[2]); n++) list.push(String(n));
    }
    list.push(m[2]);
    at = m.index + m[0].length;
  }
  return { list, end: at };
}

// Citations of a document's sections in a block, other repositories' left out:
// { kind: "document", name, sections, start, scope } for "product 7" and "concepts 9 spec";
// { kind: "word", sections, start, scope } for "раздел 9.4" — the document is resolved by the caller.
export function findSections(block) {
  const { text } = block;
  const spans = foreignSpans(text);
  const result = [];
  for (const m of text.matchAll(DOCUMENT_SECTION)) {
    const { list, end } = sectionList(text, m[2], m.index + m[0].length);
    const scope = inSpans(spans, m.index) ? "foreign" : scopeAfter(text, end);
    if (scope === "foreign") continue;
    result.push({ kind: "document", name: m[1], sections: list, start: m.index, scope });
  }
  for (const m of text.matchAll(WORD_SECTION)) {
    const after = m.index + m[0].length;
    const { list, end } = sectionList(text, m[1], after);
    const foreign = inSpans(spans, m.index) || FOREIGN_BEFORE.test(text.slice(0, m.index));
    const scope = foreign ? "foreign" : scopeAfter(text, end);
    if (scope === "foreign" || SECTION_OF_SOMETHING.test(text.slice(after))) continue;
    result.push({ kind: "word", sections: list, start: m.index, scope });
  }
  return result;
}

// [{ text, prefix, number, start }]: prefix is the register the text looks like.
export function findWrongScript(block) {
  return [...block.text.matchAll(WRONG_SCRIPT)].map((m) => ({
    text: m[0],
    prefix: m[1] ? "R" : LOOKS_LIKE[m[2] ?? m[3]],
    number: Number(m[4]),
    start: m.index,
  }));
}
