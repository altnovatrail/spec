// The mechanical part of the rule of citations: where a citation may not stand at all, and how
// many may stand together (R171). Whether a citation that remains is needed is the session's
// judgement and the review's.
//
// - A task's number, `T258` or MathTrail's `T105.10 standalone`, stands only in the work plan —
//   the profile's `plan`, RUN.md and run/ — and in the archives docs/plan/: not in another
//   document, a heading included, and not in a comment of code.
// - A dated amendment — the paragraph `*Amendment 2026-11-16:*` of a log, `the 2026-11-12
//   amendment to R19`, `по поправке 2026-10-20 к R30 spec`, and any amendment to a decision,
//   `the same day's amendment to R30` — stands in no document outside the plan: an entry is its
//   text in force, and a document cites the entry.
// - A parenthesis holds at most two citations: numbers of the registers and of the tables В and Д,
//   sections of documents, ours and other repositories', tasks; a range is one.
//
// What the profile's `outside` names — the archives docs/plan/, and spec's normative texts for
// authors — is not read, nor are .proto files, whose comments become the generated code's.

import fs from "node:fs";
import path from "node:path";
import { findNumbers, findSections } from "./citations.mjs";
import { blankCode, commentKind, commentsOf, isGenerated } from "./comments.mjs";
import { CODE } from "./markdown.mjs";
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
// The word before its dates, `Second amendment 2026-11-15`, `amendments 2026-11-12 and
// 2026-11-13`, `поправка от 2026-10-19`, or after them, `the second 2026-11-09 amendment above`.
// Or, whatever words stand between, to a decision: `the amendment of the same day to R48`,
// `поправка к R30 spec`.
const AMENDMENT = new RegExp(
  String.raw`(?<![\p{L}\p{N}])${AMENDMENT_WORD}\s+(?:(?:of|from|от)\s+)?${DATES}|(?<![\p{L}\p{N}-])${DATES}\s+${AMENDMENT_WORD}(?![\p{L}])` +
    String.raw`|(?<![\p{L}\p{N}])${AMENDMENT_WORD}(?:\s+[^\s.;:()]+){0,5}?\s+(?:to|к)\s+R\d+(?![\p{L}\p{N}])`,
  "giu",
);
const MOST = 2;
const QUOTED = 80;

// Reports what the rule forbids in the documents and the comments of code; returns how many files
// it read, the plan's among them. `files` are the parsed documents, `listed` every file of the repository, and the
// profile's `citations` is { plan, outside }, each a list of paths from the root.
export function checkCitations(root, files, listed, profile, report) {
  const { plan, outside } = profile.citations;
  const log = profile.registers.find((r) => r.prefix === "R")?.file;
  let count = 0;
  for (const [file, doc] of files) {
    if (under(file, outside)) continue;
    count++;
    // The plan may cite tasks and amendments, but its parentheses hold two citations like any
    // other text's.
    const inPlan = under(file, plan);
    for (const block of doc.blocks) {
      for (const m of inPlan ? [] : block.text.matchAll(TASK)) {
        report(file, block.lineAt(m.index), `${m[0]}: a task's number outside RUN.md, run/ and docs/plan/; name the file or the decision instead`);
      }
      for (const m of inPlan ? [] : block.text.matchAll(AMENDMENT)) {
        const what = file === log ? "fold it into its entry, whose text is in force" : "cite the entry, whose text is in force";
        report(file, block.lineAt(m.index), `"${m[0]}": an amendment; ${what}`);
      }
      for (const crowded of crowdedParentheses(block)) {
        // Inline code is quoted as `…`, which is all the block keeps of it.
        const text = crowded.text.replaceAll(CODE, "`…`");
        const quoted = text.length > QUOTED ? `${text.slice(0, QUOTED - 1)}…` : text;
        report(file, block.lineAt(crowded.start), `"${quoted}": ${crowded.count} citations in one parenthesis, more than ${MOST}; keep the one where the claim is decided or recorded`);
      }
    }
  }
  for (const file of listed) {
    const kind = commentKind(file);
    if (!kind || file.endsWith(".proto") || under(file, outside)) continue;
    const source = fs.readFileSync(path.join(root, file), "utf8");
    if (isGenerated(source)) continue;
    count++;
    for (const comment of commentsOf(source, kind)) {
      for (const m of blankCode(comment.text).matchAll(TASK)) {
        report(file, comment.lineAt(m.index), `${m[0]} in a comment: a task's number; give the reason in words`);
      }
    }
  }
  return count;
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
