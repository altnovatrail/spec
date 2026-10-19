// Reads a Markdown file into what the checks need: numbered sections, heading slugs, links,
// Mermaid diagrams, tables, and the plain text of each block with a way back to its line.

import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { gfm } from "micromark-extension-gfm";
import GithubSlugger from "github-slugger";

// Stands in for inline code in a block's text: what is in code is never a citation, but a list
// such as "standalone: `tools/learners`, R163" has to keep its shape.
export const CODE = "\uE000";

export function parseMarkdown(source) {
  const tree = fromMarkdown(source, {
    extensions: [gfm()],
    mdastExtensions: [gfmFromMarkdown()],
  });
  const slugger = new GithubSlugger();
  const doc = {
    headings: [], // { depth, text, number, line }
    sections: new Set(), // "3", "3.6"
    slugs: new Set(),
    links: [], // { url, line }
    diagrams: [], // { value, line }
    blocks: [], // Block
    tables: [], // { section, heading, rows: [{ cells: [text], line }] }
  };
  // The numbered headings that enclose the current position. An unnumbered heading closes the
  // numbered ones at its depth and deeper: "## Приложение" after "## 13." is not in 13.
  const open = []; // { depth, number }
  let section = null; // the number of the innermost numbered heading around, or null
  let heading = -1; // the index in doc.headings of the nearest heading above, or -1
  // The list items around the current position, each with the links of its first block. A block
  // knows the links of the item it elaborates: the item above its own, or for a later block of
  // an item, that item. "- source, [SPEC.md](https://…)" over "  - раздел 2.8 — …".
  const items = []; // { lead: links | null }

  const add = (node) => {
    const block = new Block(node);
    block.type = node.type;
    block.heading = heading;
    block.strongStart = node.children?.[0]?.type === "strong";
    const item = items.at(-1);
    if (item && item.lead === null) {
      block.outer = items.at(-2)?.lead ?? [];
      item.lead = block.links;
    } else {
      block.outer = item?.lead ?? [];
    }
    doc.blocks.push(block);
    collectLinks(node, doc);
  };

  const visit = (node) => {
    switch (node.type) {
      case "heading": {
        const text = plainText(node);
        const number = /^(\d+(?:\.\d+)*)\.?\s/.exec(text)?.[1] ?? null;
        while (open.length && open.at(-1).depth >= node.depth) open.pop();
        if (number) {
          doc.sections.add(number);
          open.push({ depth: node.depth, number });
        }
        section = open.at(-1)?.number ?? null;
        heading = doc.headings.length;
        doc.headings.push({ depth: node.depth, text, number, line: line(node) });
        doc.slugs.add(slugger.slug(text));
        add(node);
        return;
      }
      case "paragraph":
      case "tableCell":
        add(node);
        return;
      case "table":
        doc.tables.push({
          section,
          heading,
          rows: node.children.slice(1).map((row) => ({
            cells: row.children.map((cell) => plainText(cell).trim()),
            line: line(row),
          })),
        });
        break;
      case "code":
        if (node.lang === "mermaid") doc.diagrams.push({ value: node.value, line: line(node) });
        return;
      case "definition":
        doc.links.push({ url: node.url, line: line(node) });
        return;
      case "html":
        return;
      case "listItem":
        items.push({ lead: null });
        for (const child of node.children ?? []) visit(child);
        items.pop();
        return;
    }
    for (const child of node.children ?? []) visit(child);
  };
  visit(tree);
  return doc;
}

const line = (node) => node.position?.start.line ?? 0;

function collectLinks(node, doc) {
  if (node.type === "link" || node.type === "image") doc.links.push({ url: node.url, line: line(node) });
  for (const child of node.children ?? []) collectLinks(child, doc);
}

function plainText(node) {
  if (node.type === "text" || node.type === "inlineCode") return node.value;
  if (node.type === "break") return "\n";
  return (node.children ?? []).map(plainText).join("");
}

// The text of one paragraph, table cell or heading, as the citation patterns see it.
// Inline code becomes CODE, unless it is a single name; an autolinked URL becomes a space.
export class Block {
  constructor(node) {
    this.text = "";
    this.chunks = []; // { start, line, text } — to map an offset back to a line
    this.links = []; // { url, start, end } — where each link's text is in this.text
    this.#append(node);
  }

  #push(text, node) {
    this.chunks.push({ start: this.text.length, line: line(node), text });
    this.text += text;
  }

  #append(node) {
    switch (node.type) {
      case "text":
        this.#push(node.value, node);
        return;
      case "inlineCode":
        // A name in code, such as a repository's `api`, still reads as a word: "R3 `api`".
        this.#push(/^[\p{L}.][\p{L}-]*$/u.test(node.value) ? node.value : CODE, node);
        return;
      case "break":
        this.#push("\n", node);
        return;
      case "link": {
        const start = this.text.length;
        const label = plainText(node);
        if (label === node.url || `mailto:${label}` === node.url) {
          this.#push(" ", node);
        } else {
          for (const child of node.children) this.#append(child);
        }
        this.links.push({ url: node.url, start, end: this.text.length });
        return;
      }
      case "html":
        return;
    }
    for (const child of node.children ?? []) this.#append(child);
  }

  lineAt(offset) {
    let chunk = this.chunks[0];
    for (const c of this.chunks) {
      if (c.start > offset) break;
      chunk = c;
    }
    if (!chunk) return 0;
    const before = chunk.text.slice(0, offset - chunk.start);
    return chunk.line + (before.match(/\n/g)?.length ?? 0);
  }

  // The sentence around an offset: from the previous ". " (or "! ", "? ") to the next.
  sentenceAt(offset) {
    let start = 0;
    let end = this.text.length;
    for (const m of this.text.matchAll(/[.!?](?=\s)/g)) {
      if (m.index < offset) start = m.index + 1;
      else {
        end = m.index;
        break;
      }
    }
    return this.text.slice(start, end);
  }
}
