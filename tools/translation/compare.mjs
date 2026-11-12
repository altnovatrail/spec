// Compares a translation of a Markdown document with its original, block by block: what a
// translation must keep is every heading and its number, every register number and section cited,
// every link, every number, the code, the quotes of a source in its own language, the fixed words
// of the decision log, and the shape — a paragraph for a paragraph, an item for an item, a cell for
// a cell (R143, the 2026-11-12 amendment). Its meaning is not compared: that is the blind reading
// of a sample, by a session that did not translate it.

import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { gfm } from "micromark-extension-gfm";
import GithubSlugger from "github-slugger";
import { Block, CODE, plainText } from "../docs-check/markdown.mjs";
import { findNumbers, findSections } from "../docs-check/citations.mjs";
import { vocabulary } from "./vocabulary.mjs";

const CYRILLIC = /\p{Script=Cyrillic}/u;
// Register and work numbers: R, О-, П-, Т- through docs-check's patterns, with the scope their
// suffix gives them; Д and В of the tables of RUN.md and DEBT.md, the tasks T and the epics E here.
const WORK_NUMBER = /(?<![\p{L}\p{N}_-])(Д|В|T|E)(\d+)(?![\p{L}\p{N}])/gu;
// A prefix of a register in an English text stays Cyrillic: "О-10", "П-15", "Т-24", "Д218", "В33",
// and "О-" alone, as a register is named. Д and В alone are words, and count only before a number.
const PREFIX = /(?<![\p{L}\p{N}_-])(?:[ОПТ]-(?!\p{L})|(?:Д|В)(?=\d))/gu;
// A quote of a text in its own language. A quote of an English text keeps its words; a Russian one
// in a translation is a quote of the original — a law, a heading of RUN.md, a term beside its
// translation — and the original holds its words.
const QUOTE = /«([^«»]*)»|“([^“”]*)”/gu;
// A placeholder in code is always translated: `format-<версия>.tar.gz` becomes `format-<version>.tar.gz`.
const PLACEHOLDER = /<[^<>]*\p{Script=Cyrillic}[^<>]*>|\{[^{}]*\p{Script=Cyrillic}[^{}]*\}/u;

export function parse(source) {
  return fromMarkdown(source, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] });
}

// The units of a document, in order: { kind, depth, list, line, raw, block, code, ... }. A unit is a
// heading, a paragraph, a table cell, a block of code or of HTML; `list` is how deep in lists it
// stands, and `slug` a heading's anchor, as GitHub makes it.
export function unitsOf(source) {
  const units = [];
  const slugger = new GithubSlugger();
  let list = 0;
  let quote = 0;
  const raw = (node) => source.slice(node.position.start.offset, node.position.end.offset);
  const add = (node, kind, extra = {}) =>
    units.push({ kind, list, quote, line: node.position.start.line, raw: raw(node), ...extra });
  const visit = (node) => {
    switch (node.type) {
      case "heading": {
        const text = plainText(node);
        const number = /^(\d+(?:\.\d+)*)\.?\s/.exec(text)?.[1] ?? null;
        add(node, "heading", { depth: node.depth, number, text, slug: slugger.slug(text), ...textual(node) });
        return;
      }
      case "paragraph":
        add(node, "paragraph", textual(node));
        return;
      case "tableCell":
        add(node, "cell", textual(node));
        return;
      case "code":
        add(node, "code", { lang: node.lang ?? "", value: node.value });
        return;
      case "html":
        // A comment, such as the template's FILL, is prose too: its words are translated.
        add(node, "html", { value: node.value, prose: node.value });
        return;
      case "list":
        list++;
        for (const child of node.children) visit(child);
        list--;
        return;
      case "blockquote":
        quote++;
        for (const child of node.children) visit(child);
        quote--;
        return;
    }
    for (const child of node.children ?? []) visit(child);
  };
  visit(parse(source));
  return units;
}

// What the citation patterns read in a block, its inline code, and its prose: its text without
// code, URLs or HTML, which is where an untranslated word would be.
function textual(node) {
  const code = [];
  const collect = (n) => {
    if (n.type === "inlineCode") code.push(n.value);
    for (const child of n.children ?? []) collect(child);
  };
  collect(node);
  return { block: new Block(node), code, prose: proseOf(node) };
}

function proseOf(node) {
  if (node.type === "text") return node.value;
  if (node.type === "inlineCode" || node.type === "html") return " ";
  if (node.type === "image") return ` ${node.alt ?? ""} `;
  if (node.type === "break") return "\n";
  return (node.children ?? []).map(proseOf).join("");
}

// The headings of a document, paired with those of its translation: from each anchor of the
// original to the anchor of the same heading in the translation. Null when the two do not have the
// same headings at the same depths, for then no pairing is safe.
export function anchorMap(original, translation) {
  const from = unitsOf(original).filter((u) => u.kind === "heading");
  const to = unitsOf(translation).filter((u) => u.kind === "heading");
  if (from.length !== to.length || from.some((h, i) => h.depth !== to[i].depth || h.number !== to[i].number)) return null;
  return new Map(from.map((h, i) => [h.slug, to[i].slug]));
}

// The shape of a unit: what has to stand in the same place in the translation.
const shapeOf = (u) => `${u.kind}${u.kind === "heading" ? u.depth : ""}/${u.list}/${u.quote}`;
const KIND = { heading: "heading", paragraph: "paragraph", cell: "table cell", code: "block of code", html: "HTML" };

// Compares the translation with the original. `link(url)` gives the URL a link of the original
// should have in the translation — the same, but for an anchor into a heading that the translation
// renamed. Returns [{ line, message }], `line` being the translation's, or the original's after
// "original:" when the translation has nothing in its place.
export function compare(original, translation, { link = (url) => url } = {}) {
  const errors = [];
  const report = (line, message) => errors.push({ line, message });
  const a = unitsOf(original);
  const b = unitsOf(translation);

  const headsA = a.filter((u) => u.kind === "heading");
  const headsB = b.filter((u) => u.kind === "heading");
  for (let i = 0; i < Math.max(headsA.length, headsB.length); i++) {
    const [x, y] = [headsA[i], headsB[i]];
    if (!x) report(y.line, `a heading the original does not have: "${y.text}"`);
    else if (!y) report(0, `original:${x.line}: the translation has no heading for "${x.text}"`);
    else if (x.depth !== y.depth || x.number !== y.number) {
      report(y.line, `heading "${y.text}" stands for "${x.text}" (original:${x.line}): ${x.depth !== y.depth ? `its level is ${y.depth}, not ${x.depth}` : `its number is ${y.number ?? "none"}, not ${x.number ?? "none"}`}`);
    }
  }

  // Each stretch from a heading to the next is compared unit by unit when its shape is the same,
  // and as a whole otherwise, so that one missing paragraph does not hide what else went missing.
  const stretches = (units) => {
    const out = [[]];
    for (const u of units) {
      if (u.kind === "heading") out.push([]);
      out.at(-1).push(u);
    }
    return out;
  };
  const sa = stretches(a);
  const sb = stretches(b);
  if (sa.length !== sb.length) {
    comparePairs([merged(a)], [merged(b)], report, link);
    return errors;
  }
  for (let i = 0; i < sa.length; i++) {
    const [x, y] = [sa[i], sb[i]];
    const same = x.length === y.length && x.every((u, j) => shapeOf(u) === shapeOf(y[j]));
    if (same) {
      comparePairs(x, y, report, link);
      continue;
    }
    const where = y[0]?.line ?? x[0]?.line ?? 0;
    const first = x.findIndex((u, j) => !y[j] || shapeOf(u) !== shapeOf(y[j]));
    const at = first < 0 ? y[x.length] : y[first];
    const was = first < 0 ? null : x[first];
    report(at?.line ?? where, `the shape differs from the original's (original:${was?.line ?? x.at(-1)?.line ?? 0}): ${describe(was)} in the original, ${describe(at)} here; ${count(x)} in the original, ${count(y)} here`);
    comparePairs([merged(x)], [merged(y)], report, link);
  }
  return errors;
}

const describe = (u) => (u ? `a ${KIND[u.kind]}${u.list ? ` in a list ${u.list} deep` : ""}${u.quote ? " in a quote" : ""}` : "nothing");
const count = (units) => {
  const n = (kind) => units.filter((u) => u.kind === kind).length;
  return `${n("paragraph")} paragraphs, ${n("cell")} cells, ${n("code")} blocks of code`;
};

// Several units read as one, for a stretch whose shape differs.
function merged(units) {
  const textUnits = units.filter((u) => u.block);
  return {
    kind: "merged",
    line: units[0]?.line ?? 0,
    raw: units.map((u) => u.raw).join("\n"),
    code: textUnits.flatMap((u) => u.code),
    prose: units.map((u) => u.prose ?? "").join("\n"),
    html: units.filter((u) => u.kind === "html").map((u) => u.value).join("\n"),
    blocks: textUnits.map((u) => u.block),
    fenced: units.filter((u) => u.kind === "code"),
  };
}

const blocksOf = (u) => u.blocks ?? (u.block ? [u.block] : []);
const textOf = (u) => blocksOf(u).map((b) => b.text).join("\n");

// The features of a unit, each a list of strings, compared as multisets.
function features(u, link, side) {
  const blocks = blocksOf(u);
  const numbers = [];
  const sections = [];
  const links = [];
  for (const block of blocks) {
    for (const n of findNumbers(block)) numbers.push(`${n.prefix}${n.digits}${n.scope === "own" ? "" : ` ${n.scope}`}`);
    for (const m of block.text.matchAll(WORK_NUMBER)) numbers.push(`${m[1]}${m[2]}`);
    for (const s of findSections(block)) sections.push(`${s.kind === "document" ? s.name : "section"} ${s.sections.join(", ")}${s.scope === "spec" ? " spec" : ""}`);
    for (const l of block.links) links.push(link(l.url));
  }
  const digits = `${textOf(u)}\n${u.kind === "html" ? u.value : (u.html ?? "")}`.replaceAll(CODE, " ").match(/\d+/g) ?? [];
  // Code with no Cyrillic stays as it is; code with a placeholder or words in Russian keeps
  // everything but its words, which the original's skeleton stands for.
  const code = (u.code ?? []).map((c) => (side === "original" && CYRILLIC.test(c) ? `skeleton ${skeleton(c)}` : c));
  const words = vocabulary.flatMap((v) => Array(occurrences(u.raw, side === "original" ? v.ru : v.enPattern)).fill(v.en));
  return { "register or task number": numbers, "section cited": sections, link: links, number: digits, code, "fixed word": words };
}

const skeleton = (code) => code.replace(/[\p{L}\s]/gu, "");
const occurrences = (text, pattern) => [...text.matchAll(pattern)].length;

// Compares the units of a stretch pair by pair. An item missing from one unit and found in another
// of the same stretch moved there, and the message says where: a link, a number or a citation
// stays in its paragraph, its item or its cell.
function comparePairs(xs, ys, report, link) {
  const diffs = xs.map((x, i) => {
    const fa = features(x, link, "original");
    const fb = features(ys[i], (url) => url, "translation");
    const diff = Object.fromEntries(Object.keys(fa).map((name) => [name, difference(fa[name], fb[name])]));
    // Code the original writes with Russian words matches code with the same skeleton.
    const { missing, extra } = diff.code;
    for (let k = missing.length - 1; k >= 0; k--) {
      const j = missing[k].startsWith("skeleton ") ? extra.findIndex((e) => `skeleton ${skeleton(e)}` === missing[k]) : -1;
      if (j >= 0) {
        missing.splice(k, 1);
        extra.splice(j, 1);
      }
    }
    return diff;
  });
  xs.forEach((x, i) => {
    const y = ys[i];
    const line = y.line || x.line;
    for (const [name, { missing, extra }] of Object.entries(diffs[i])) {
      for (const item of missing) {
        const there = ys.find((_, j) => j !== i && diffs[j][name].extra.includes(item));
        const hint = there ? `: it stands at line ${there.line}, in another ${KIND[there.kind] ?? "block"}` : "";
        report(line, `${name} ${quoteOf(item)} of the original (original:${x.line}) is missing here${hint}`);
      }
      for (const item of extra) report(line, `${name} ${quoteOf(item)} is not in the original (original:${x.line})`);
    }
    checkUnit(x, y, line, report);
  });
}

// What a unit's translation keeps beside its features: the quotes, no word left untranslated, and
// the lines of its code.
function checkUnit(x, y, line, report) {
  // A quote of an English text keeps its words; a Russian quote is the original's.
  const textA = textOf(x);
  const textB = textOf(y);
  for (const m of textA.matchAll(QUOTE)) {
    const words = (m[1] ?? m[2]).trim();
    if (!words || CYRILLIC.test(words)) continue;
    if (!textB.includes(words)) report(line, `the quote «${words}» of the original (original:${x.line}) is not here word for word`);
  }
  const lowerA = textA.toLowerCase();
  for (const m of textB.matchAll(QUOTE)) {
    const words = (m[1] ?? m[2]).trim();
    if (CYRILLIC.test(words) && !lowerA.includes(words.toLowerCase())) report(line, `the Russian quote «${words}» is not in the original (original:${x.line})`);
  }

  // What is left in Russian outside quotes, code and the prefixes of registers is untranslated.
  const prose = (y.prose ?? "").replace(QUOTE, " ").replace(PREFIX, "");
  const left = /[\p{Script=Cyrillic}][\p{Script=Cyrillic}\p{L}\s,.-]*/u.exec(prose);
  if (left) report(line, `untranslated: "${left[0].trim().slice(0, 60)}"`);
  for (const c of y.code ?? []) if (PLACEHOLDER.test(c)) report(line, `untranslated placeholder in code: \`${c}\``);

  // A block of code keeps every line that has no Russian in it. Its Russian lines are comments,
  // labels of a diagram or the data of a module that explains in Russian: a diagram's are always
  // translated, and the others may stay as they are.
  const fenced = (u) => u.fenced ?? (u.kind === "code" ? [u] : []);
  const [ca, cb] = [fenced(x), fenced(y)];
  if (ca.length !== cb.length) return;
  ca.forEach((c, i) => {
    const d = cb[i];
    const la = c.value.split("\n");
    const lb = d.value.split("\n");
    if (c.lang !== d.lang) report(d.line ?? line, `a block of code in ${d.lang || "no language"}, not ${c.lang || "no language"} as in the original (original:${c.line})`);
    if (la.length !== lb.length) {
      report(d.line ?? line, `a block of code of ${lb.length} lines, not ${la.length} as in the original (original:${c.line})`);
      return;
    }
    la.forEach((text, k) => {
      if (CYRILLIC.test(text)) {
        if (c.lang === "mermaid" && CYRILLIC.test(lb[k].replace(PREFIX, ""))) report((d.line ?? line) + 1 + k, `untranslated in a diagram: "${lb[k].trim().slice(0, 60)}"`);
      } else if (text.trimEnd() !== lb[k].trimEnd()) {
        report((d.line ?? line) + 1 + k, `a line of code is not as in the original (original:${c.line + 1 + k}): "${text.trim().slice(0, 60)}"`);
      }
    });
  });
}

const quoteOf = (item) => (item.startsWith("skeleton ") ? `\`${item.slice(9)}\` (its words aside)` : `"${item}"`);

function difference(xs, ys) {
  const left = new Map();
  for (const x of xs) left.set(x, (left.get(x) ?? 0) + 1);
  const extra = [];
  for (const y of ys) {
    const n = left.get(y) ?? 0;
    if (n > 0) left.set(y, n - 1);
    else extra.push(y);
  }
  const missing = [...left].flatMap(([x, n]) => Array(n).fill(x));
  return { missing, extra };
}
