// The mechanical part of the rule of citations: a text gives its reason in words and stands by
// itself, and what it may not cite at all is found here. Whether a sentence still leans on what it
// once cited is the session's judgement and the review's.
//
// Outside the work plan — the profile's `plan`, RUN.md and run/ — and the archives docs/plan/, in a
// document, a comment of code, a .proto file or the description of a schema:
// - a decision's number, `R25`, `R25 spec`, `R03 api`, MathTrail's `canvas-api: R37`: only an
//   entry's heading in its own log gives one, and its log's opening the next free number;
// - a citation of a section or a document — `architecture 3.8 spec`, `раздел 4`,
//   `RULES.md spec, Citations` —, but a record of the outside world, `sources 2.3` or
//   `measurements 1.4`, of this repository or another;
// - a dated attribution or amendment — a date beside a word such as "author", "amendment" or
//   «решение», `the author's decisions of 2026-10-19`, `решено автором 2026-11-18` —, and an
//   amendment to a decision, dated or not, `the amendment of the same day to R48`;
// - a task's number, `T258` or MathTrail's `T105.10 standalone`, a heading's too.
// Everywhere, the plan too, a parenthesis holds at most two citations: numbers of the registers and
// of the tables В and Д, sections of documents, ours and other repositories', tasks; a range is one.
// The open questions О-, П-, Т- and the rows В and Д name open work and stand anywhere.
//
// What is not read: the archives; spec's normative texts for authors, `prose`, whose versions in
// force never change — their Markdown and the comments of their data, examples and vectors, but
// not the descriptions of their schemas, from which code is generated; code a generator wrote,
// whose comments come from the .proto files and schemas. A citation in inline code is an example.

import fs from "node:fs";
import path from "node:path";
import { findNumbers, findSections, suffixAfter } from "./citations.mjs";
import { blankCode, commentKind, commentsOf, isGenerated } from "./comments.mjs";
import { CODE } from "./markdown.mjs";
import { ELSEWHERE, targetOf } from "./sections.mjs";
import { under } from "./config.mjs";

// Preceded by no letter, digit, dot or hyphen, so that a time `2026-11-23T10:00` and a name such
// as `E-T12` are not tasks; a dot and digits go on as MathTrail's subtasks do.
const TASK = /(?<![\p{L}\p{N}_.-])T\d+(?:\.\d+)*(?![\p{L}\p{N}])/gu;
// As citations in a parenthesis, a range of tasks or of rows is one: `T260–T267`.
const CITED_TASK = new RegExp(String.raw`${TASK.source}(?:\s*[–—-]\s*T\d+(?![\p{L}\p{N}]))?`, "gu");
const CITED_ROW = /(?<![\p{L}\p{N}_-])([ВД])\d+(?:\s*[–—-]\s*\1\d+)?(?![\p{L}\p{N}])/gu;
const DATE = String.raw`\d{4}-\d{2}-\d{2}`;
const DATES = String.raw`${DATE}(?:(?:\s*,\s*|\s+(?:and|и)\s+)${DATE})*`;
const AMENDMENT_WORD = String.raw`(?:amendments?|поправк\p{L}*)`;
// The word before its dates — `Second amendment 2026-11-15`,
// `amendments 2026-11-12 and 2026-11-13`, `поправка от 2026-10-19` — or after them,
// `the second 2026-11-09 amendment above`.
// Or, whatever words stand between, to a decision: `the amendment of the same day to R48`,
// `поправка к R30 spec`.
const AMENDMENT = new RegExp(
  String.raw`(?<![\p{L}\p{N}])${AMENDMENT_WORD}\s+(?:(?:of|from|от)\s+)?${DATES}|(?<![\p{L}\p{N}-])${DATES}\s+${AMENDMENT_WORD}(?![\p{L}])` +
    String.raw`|(?<![\p{L}\p{N}])${AMENDMENT_WORD}(?:\s+[^\s.;:()]+){0,5}?\s+(?:to|к)\s+R\d+(?![\p{L}\p{N}])`,
  "giu",
);
// Who decided, answered or said what, and when: a date and such a word with at most four words
// between them, in one clause. The date a record was read, `read 2026-10-26`, names nobody.
const WHO = String.raw`(?:author\p{L}*|автор\p{L}*|amend\p{L}*|поправк\p{L}*|decision\p{L}*|decided|decides?|решени\p{L}*|решен\p{L}*|решил\p{L}*|answer\p{L}*|ответ\p{L}*|words?|слов(?:о|а|у|ом|е)?)`;
const BETWEEN = String.raw`(?:\s+[^\s.;:!?()]+){0,4}?\s+`;
const ATTRIBUTION = new RegExp(
  String.raw`(?<![\p{L}\p{N}])${WHO}${BETWEEN}${DATES}(?![\p{N}])|(?<![\p{L}\p{N}-])${DATES}${BETWEEN}${WHO}(?![\p{L}])`,
  "giu",
);
// A document cited by its file and spec's suffix, `RULES.md spec`, or by its file and a heading in
// a parenthesis, `(RULES.md, How we work)`; a list of files, `(README.md, CLAUDE.md)`, is none, and
// neither is a row or a task there, `(RUN.md, Д15)`, which the rules of the rows and tasks judge.
const DOCUMENT_BY_NAME = new RegExp(
  String.raw`(?<![\p{L}\p{N}_./-])[\p{L}\p{N}_./-]+\.md\s+spec(?![\p{L}\p{N}_-])` +
    String.raw`|(?<=\(\s*)[\p{L}\p{N}_./-]+\.md(?:\s+spec)?,\s+(?![^,;()]*\.\p{L}+\s*[;)]|[ВДT]\d|[ОПТ]-\d)\p{Lu}[^,;()]*(?=[;)])`,
  "gu",
);
// The opening of a log names its next free number: `Next number — R172`, `Следующий номер — R04`.
const NEXT = /следующ|\bnext\b/iu;
// What a record of the outside world is cited by: its records are numbered sections.
const RECORDS = ["sources", "measurements"];
const RECORD_FILES = RECORDS.map((name) => `docs/${name}.md`);
const MOST = 2;
const QUOTED = 80;

// Reports what the rule forbids; returns how many files it read, the plan's among them. `files` are
// the parsed documents, `context` them and what they may cite, `listed` every file of the
// repository, and the profile's `citations` is { plan, archives, prose }, each a list of paths from
// the root.
export function checkCitations(root, files, context, listed, profile, report) {
  const { plan, archives, prose } = profile.citations;
  const log = profile.registers.find((r) => r.prefix === "R")?.file;
  const quote = (text) => {
    const shown = text.replaceAll(CODE, "`…`").replace(/\s+/gu, " ");
    return shown.length > QUOTED ? `${shown.slice(0, QUOTED - 1)}…` : shown;
  };
  let count = 0;
  for (const [file, doc] of files) {
    if (under(file, archives) || under(file, prose)) continue;
    count++;
    const inPlan = under(file, plan);
    for (const block of doc.blocks) {
      const where = (offset) => block.lineAt(offset);
      if (!inPlan) {
        const document = {
          log: file === log,
          heading: file === log && block.type === "paragraph" && block.strongStart && /^R\d+\.\s/u.test(block.text),
          section: (start) => targetOf(context, file, block, start, profile.sectionsDocument),
          next: (start) => NEXT.test(block.sentenceAt(start)),
        };
        for (const { offset, message } of breaches(block.text, document)) report(file, where(offset), message);
      }
      for (const crowded of crowdedParentheses(block)) {
        report(file, where(crowded.start), `"${quote(crowded.text)}": ${crowded.count} citations in one parenthesis, more than ${MOST}; keep the one where the claim is recorded`);
      }
    }
  }
  for (const file of listed) {
    if (under(file, archives)) continue;
    const kind = commentKind(file);
    const schema = file.endsWith(".schema.json");
    if (!kind && !schema) continue;
    const source = fs.readFileSync(path.join(root, file), "utf8");
    if (kind && (under(file, prose) || isGenerated(source))) continue;
    count++;
    const texts = kind ? commentsOf(source, kind).map((c) => ({ ...c, what: "a comment" })) : descriptionsOf(source);
    for (const { text, lineAt, what } of texts) {
      for (const { offset, message } of breaches(blankCode(text), { file, what })) report(file, lineAt(offset), message);
    }
  }
  return count;
}

// What the rule forbids in one text, a block of a document or a comment, as [{ offset, message }]
// in the order they stand. `where` is { file, what } for code and schemas, and for a document
// { log, heading, section(start), next(start) }: whether it is the decision log, whether the block
// is an entry's heading, which document a `раздел N` at an offset cites, and whether the sentence
// there names the next free number.
function breaches(text, where) {
  const found = [];
  const add = (offset, message) => found.push({ offset, message: message.replace(/\s+/gu, " ") });
  const inCode = !where.section;
  const what = where.what ? ` in ${where.what}` : "";

  for (const m of text.matchAll(TASK)) add(m.index, `${m[0]}${what}: a task's number, which stands only in RUN.md, run/ and docs/plan/; give the reason in words`);

  // A range is one citation, from its first number to its last.
  const decisions = new Map();
  for (const n of findNumbers({ text })) {
    if (n.prefix !== "R") continue;
    const seen = decisions.get(n.item);
    decisions.set(n.item, { start: Math.min(seen?.start ?? n.start, n.start), end: Math.max(seen?.end ?? n.end, n.end) });
  }
  for (const { start, end } of decisions.values()) {
    if (!inCode && where.heading && start === 0) continue;
    if (!inCode && where.log && where.next(start)) continue;
    const hint = !inCode && where.log ? "an entry cites no other entry; say in words what it shares with it" : "give the reason in words";
    add(start, `${text.slice(start, end)}${suffixAfter(text, end)}${what}: a decision's number; ${hint}`);
  }

  for (const s of findSections({ text }, { foreign: true })) {
    if (s.kind === "document" && RECORDS.includes(s.name)) continue;
    if (s.kind === "word" && !inCode) {
      const target = where.section(s.start);
      if (target === ELSEWHERE || RECORD_FILES.some((f) => target === f || target === `spec/${f}`)) continue;
    }
    const cited = `${text.slice(s.start, s.end)}${suffixAfter(text, s.end)}`;
    add(s.start, `${cited}${what}: a citation of a section; say in words what is needed from it`);
  }
  for (const m of text.matchAll(DOCUMENT_BY_NAME)) add(m.index, `${m[0]}${what}: a citation of a document; say in words what is needed from it, or name the file to open`);

  // An amendment and an attribution that overlap are one breach, reported as the one found first.
  const dated = [...text.matchAll(AMENDMENT), ...text.matchAll(ATTRIBUTION)].sort((a, b) => a.index - b.index);
  let end = -1;
  for (const m of dated) {
    if (m.index < end) continue;
    end = m.index + m[0].length;
    const amendment = /amend|поправк/iu.test(m[0]);
    const hint = amendment
      ? where.log ? "fold it into its entry, whose text is in force" : "say what the text in force holds"
      : "who decided what and when is git's history; give the reason in words";
    add(m.index, `"${m[0]}"${what}: a dated ${amendment ? "amendment" : "attribution"}; ${hint}`);
  }
  return found.sort((a, b) => a.offset - b.offset);
}

// The descriptions of a schema — each string under "description", "title" or "$comment" — as
// texts with the line of the source each stands on, the first that holds it. A schema that does not
// parse is format-check's to report.
function descriptionsOf(source) {
  let schema;
  try {
    schema = JSON.parse(source);
  } catch {
    return [];
  }
  const texts = [];
  let from = 0;
  const walk = (value) => {
    if (Array.isArray(value)) return value.forEach(walk);
    if (!value || typeof value !== "object") return;
    for (const [key, inner] of Object.entries(value)) {
      if (typeof inner === "string" && ["description", "title", "$comment"].includes(key)) {
        const at = source.indexOf(JSON.stringify(inner), from);
        if (at >= 0) from = at;
        const line = at < 0 ? 0 : source.slice(0, at).split("\n").length;
        texts.push({ text: inner, lineAt: () => line, what: "a schema's description" });
      } else walk(inner);
    }
  };
  walk(schema);
  return texts;
}

// The parentheses of a block that hold more than MOST citations directly, not in a parenthesis
// nested in them: [{ text, start, count }]. A parenthesis left open or never opened is none.
export function crowdedParentheses(block) {
  const { text } = block;
  const pairs = [];
  const open = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "(") open.push(i);
    else if (text[i] === ")" && open.length) pairs.push({ start: open.pop(), end: i + 1, count: 0 });
  }
  if (!pairs.length) return [];
  // The innermost pair around an offset is the one that starts last.
  const innermost = (offset) => pairs.filter((p) => p.start < offset && offset < p.end).reduce((a, b) => (!a || b.start > a.start ? b : a), null);
  const add = (offset, n = 1) => {
    const pair = innermost(offset);
    if (pair) pair.count += n;
  };
  const items = new Set();
  for (const n of findNumbers(block)) {
    if (items.has(n.item)) continue;
    items.add(n.item);
    add(n.start);
  }
  for (const s of findSections(block, { foreign: true })) add(s.start, s.count);
  for (const m of text.matchAll(CITED_TASK)) add(m.index);
  for (const m of text.matchAll(CITED_ROW)) add(m.index);
  return pairs
    .filter((p) => p.count > MOST)
    .sort((a, b) => a.start - b.start)
    .map((p) => ({ text: text.slice(p.start, p.end), start: p.start, count: p.count }));
}
