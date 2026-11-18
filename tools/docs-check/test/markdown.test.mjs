// The parses of parseMarkdown and markdownTree are kept in the process by the sha256 of the text:
// the same text gives the same parse, frozen, whichever path it was read from, and another text a
// parse of its own.

import { test } from "node:test";
import assert from "node:assert/strict";
import { markdownTree, parseMarkdown } from "../markdown.mjs";

const TEXT = "# 1. Title\n\nA [link](other.md#2) and R31.\n\n| a | b |\n|---|---|\n| c | d |\n";

test("the same text gives the same parse, and another text another", () => {
  const first = parseMarkdown(TEXT);
  assert.equal(parseMarkdown(`${TEXT}`), first);
  assert.deepEqual([...first.sections], ["1"]);
  assert.deepEqual(first.links.map((link) => link.url), ["other.md#2"]);
  const other = parseMarkdown(`${TEXT}\n## 2. More\n`);
  assert.notEqual(other, first);
  assert.deepEqual([...other.sections], ["1", "2"]);
  assert.deepEqual([...first.sections], ["1"], "the parse of the first text changed");
});

test("a parse is frozen through and through, so that no caller changes the next one's", () => {
  const doc = parseMarkdown(TEXT);
  assert.throws(() => doc.links.push({ url: "x", line: 1 }), TypeError);
  assert.throws(() => { doc.headings[0].text = "changed"; }, TypeError);
  assert.throws(() => { doc.tables[0].rows[0].cells[0] = "changed"; }, TypeError);
  assert.throws(() => { doc.blocks[1].text = "changed"; }, TypeError);
  // A block still answers what it is asked.
  assert.equal(doc.blocks[1].lineAt(0), 3);
  // A spread is a caller's own, as docs-check takes it.
  const own = { ...doc, source: TEXT };
  own.extra = true;
  assert.equal(own.links, doc.links);
});

test("markdownTree gives the syntax tree of a text once, frozen, apart from the parse", () => {
  const tree = markdownTree(TEXT);
  assert.equal(markdownTree(TEXT), tree);
  assert.equal(tree.type, "root");
  assert.deepEqual(tree.children.map((node) => node.type), ["heading", "paragraph", "table"]);
  assert.throws(() => tree.children.pop(), TypeError);
  assert.throws(() => { tree.children[0].position.start.line = 9; }, TypeError);
  assert.notEqual(markdownTree(`${TEXT} `), tree);
});
