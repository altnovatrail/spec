// The numbers of decisions in the comments of code: each `R…` a comment gives names an entry of
// its log — `R25` the repository's own, `R25 spec` spec's —, so that the anchor a comment ends with
// leads to its reason (R160). `R37 canvas-api` and `R03 api` are another repository's and are not
// checked, and an example in inline code, `R03`, is no citation (R32).
//
// What is read is the comments alone, not strings: `//` and `/* */` in Go, TypeScript, JavaScript,
// .proto files and JSON with comments, `#` in shell, YAML, justfiles and Dockerfiles. Code that a
// generator writes, by a line of its own near the top in Go's form or protoc-gen-es's, is not read:
// its comments come from the .proto files and schemas it is generated from.

import fs from "node:fs";
import path from "node:path";
import { findNumbers } from "./citations.mjs";
import { CODE, inlineCode } from "./markdown.mjs";
import { canonical } from "./registers.mjs";

// The kinds: "js" has template literals and literals of regular expressions; "c" — Go, .proto,
// JSON with comments — has neither, and a backtick there opens a raw string, which spans lines.
const JS = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"]);
const C = new Set([".go", ".proto", ".jsonc"]);
const HASH = new Set([".sh", ".yml", ".yaml"]);
const GENERATED = /^\/\/ (?:Code generated .* DO NOT EDIT\.$|@generated\b)/m;
// How many lines from the top a generator's mark may be: Go's convention puts it before the package
// clause, after a license header at most.
const GENERATED_LINES = 20;

// The kind of comments a file has, by its name: "js", "c", "hash", or null when it is not read.
export function commentKind(file) {
  const name = path.posix.basename(file);
  const ext = path.posix.extname(name);
  if (JS.has(ext)) return "js";
  if (C.has(ext) || name === "devcontainer.json") return "c";
  if (HASH.has(ext)) return "hash";
  if (/^(?:\.?justfile|Dockerfile(?:\..+)?|.+\.Dockerfile)$/i.test(name)) return "hash";
  return null;
}

export const isGenerated = (source) => GENERATED.test(source.split("\n", GENERATED_LINES).join("\n"));

// The comments of a source, each { text, lineAt }: the comment's text with its markers taken off,
// one block for a run of line comments on consecutive lines, so that `R32\n spec` is one citation;
// lineAt(offset) is the line of the source an offset of the text is on.
export function commentsOf(source, kind) {
  const pieces = kind === "hash" ? hashComments(source) : slashComments(source, kind === "js");
  const blocks = [];
  for (const piece of pieces) {
    const last = blocks.at(-1);
    if (piece.line && last?.lineComment && last.endLine + 1 === piece.startLine) {
      last.parts.push(piece);
      last.endLine = piece.endLine;
    } else {
      blocks.push({ parts: [piece], lineComment: piece.line, endLine: piece.endLine });
    }
  }
  return blocks.map(({ parts }) => {
    const lines = [];
    for (const part of parts) {
      part.text.split("\n").forEach((text, i) => lines.push({ text, line: part.startLine + i }));
    }
    const text = lines.map((l) => l.text).join("\n");
    const starts = [];
    let at = 0;
    for (const l of lines) {
      starts.push(at);
      at += l.text.length + 1;
    }
    const lineAt = (offset) => {
      let i = starts.length - 1;
      while (i > 0 && starts[i] > offset) i--;
      return lines[i].line;
    };
    return { text, lineAt };
  });
}

// `#` to the end of its line, at the start of the line or after a space, outside a string quoted on
// that line and outside the body of a heredoc, which is text: a summary in Markdown, `## R5`. A quote
// opens a string only where a word could start, so the apostrophe of "don't" in an unquoted YAML
// value is not one; `''` in a single-quoted string is a quote, as YAML escapes it. A string quoted
// across lines is not followed.
const HEREDOC = /^<<-?\s*(["']?)([A-Za-z_][\w-]*)\1/;

function hashComments(source) {
  const pieces = [];
  let heredoc = null;
  source.split("\n").forEach((line, index) => {
    if (heredoc) {
      if (line.trim() === heredoc) heredoc = null;
      return;
    }
    let quote = null;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (quote) {
        if (c === "\\" && quote === '"') i++;
        else if (c === "'" && quote === "'" && line[i + 1] === "'") i++;
        else if (c === quote) quote = null;
        continue;
      }
      if ((c === '"' || c === "'") && (i === 0 || /[\s=(:[{,$-]/.test(line[i - 1]))) quote = c;
      else if (c === "<" && HEREDOC.test(line.slice(i))) {
        heredoc = HEREDOC.exec(line.slice(i))[2];
        i++;
      } else if (c === "#" && (i === 0 || /\s/.test(line[i - 1]))) {
        pieces.push({ text: line.slice(i + 1), startLine: index + 1, endLine: index + 1, line: true });
        break;
      }
    }
  });
  return pieces;
}

// A `/` that starts a regular expression rather than a division follows one of these, or a keyword
// of REGEX_AFTER_WORD, or nothing; after `)`, `]`, a name, a number, `++` or `--` it divides. A
// `}` is taken to close a block, not an object: `{ a: 1 } / 2` is misread.
const REGEX_AFTER = new Set([..."(,=:[!&|?{};+-*%<>~^"]);
const REGEX_AFTER_WORD = new Set(["return", "typeof", "case", "in", "of", "new", "delete", "void", "throw", "yield", "await", "else", "do"]);

// `//` to the end of its line and `/* … */`, outside strings, template literals and their `${}`,
// and literals of regular expressions.
function slashComments(source, js) {
  const pieces = [];
  let line = 1;
  // Each frame is a template literal or the braces of a `${}` in one.
  const stack = [];
  let previous = "";
  let i = 0;
  const n = source.length;
  // The offset `to`, with the lines from `from` to it counted.
  const move = (from, to) => {
    for (let k = from; k < to; k++) if (source[k] === "\n") line++;
    return to;
  };
  while (i < n) {
    const c = source[i];
    const top = stack.at(-1);
    if (top?.template) {
      if (c === "\\") i = move(i, i + 2);
      else if (c === "`") {
        stack.pop();
        previous = "`";
        i = move(i, i + 1);
      } else if (c === "$" && source[i + 1] === "{") {
        stack.push({ depth: 0 });
        previous = "{";
        i = move(i, i + 2);
      } else i = move(i, i + 1);
      continue;
    }
    if (c === "/" && source[i + 1] === "/") {
      const end = source.indexOf("\n", i);
      const stop = end < 0 ? n : end;
      pieces.push({ text: source.slice(i + 2, stop), startLine: line, endLine: line, line: true });
      i = move(i, stop);
      continue;
    }
    if (c === "/" && source[i + 1] === "*") {
      const end = source.indexOf("*/", i + 2);
      const stop = end < 0 ? n : end;
      const startLine = line;
      const text = source
        .slice(i + 2, stop)
        .split("\n")
        .map((l, k) => (k === 0 ? l : l.replace(/^\s*\*(?!\/)/, " ")))
        .join("\n");
      i = move(i, end < 0 ? n : end + 2);
      pieces.push({ text, startLine, endLine: line, line: false });
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      if (c === "`" && js) {
        stack.push({ template: true });
        i = move(i, i + 1);
        continue;
      }
      // A Go raw string, `…`, has no escapes and may span lines; the others end at their line.
      let k = i + 1;
      while (k < n && source[k] !== c) {
        if (source[k] === "\n" && c !== "`") break;
        if (source[k] === "\\" && c !== "`") k++;
        k++;
      }
      previous = c;
      i = move(i, Math.min(k + 1, n));
      continue;
    }
    if (c === "/" && js && (previous === "" || REGEX_AFTER.has(previous) || REGEX_AFTER_WORD.has(previous))) {
      let k = i + 1;
      let inClass = false;
      while (k < n && source[k] !== "\n") {
        const d = source[k];
        if (d === "\\") k++;
        else if (d === "[") inClass = true;
        else if (d === "]") inClass = false;
        else if (d === "/" && !inClass) break;
        k++;
      }
      if (source[k] === "/") {
        previous = "/regex";
        i = move(i, k + 1);
        continue;
      }
    }
    if (top && c === "{") top.depth++;
    if (top && c === "}") {
      if (top.depth === 0) {
        stack.pop();
        i = move(i, i + 1);
        continue;
      }
      top.depth--;
    }
    if (/[\p{L}\p{N}_$]/u.test(c)) {
      let k = i;
      while (k < n && /[\p{L}\p{N}_$]/u.test(source[k])) k++;
      previous = source.slice(i, k);
      i = move(i, k);
      continue;
    }
    if ((c === "+" || c === "-") && source[i + 1] === c) {
      previous = c + c;
      i = move(i, i + 2);
      continue;
    }
    if (!/\s/.test(c)) previous = c;
    i = move(i, i + 1);
  }
  return pieces;
}

// An example in inline code is no citation. It stands as in a document (markdown.mjs), so that "R3
// `api`" and a list such as "standalone: `tools/learners`, R163" keep their shape, padded to its
// length in front, so that offsets keep their lines.
const blankCode = (text) => text.replace(/`([^`\n]*)`/g, (code, value) => inlineCode(value).padStart(code.length));

// Reports each number of a decision in a comment that names no entry of its log; returns how many
// were checked. `registerOf(scope)` is the register R that a citation of that scope is read in.
export function checkComments(root, listed, registerOf, report) {
  let count = 0;
  for (const file of listed) {
    const kind = commentKind(file);
    if (!kind) continue;
    const source = fs.readFileSync(path.join(root, file), "utf8");
    if (isGenerated(source)) continue;
    for (const comment of commentsOf(source, kind)) {
      for (const n of findNumbers({ text: blankCode(comment.text) })) {
        if (n.prefix !== "R" || n.scope === "foreign") continue;
        const known = registerOf(n.scope);
        if (!known) continue;
        count++;
        const { register, numbers } = known;
        const line = comment.lineAt(n.start);
        const digits = canonical(register, n.number);
        if (!n.inRange && n.digits !== digits) report(file, line, `R${n.digits} in a comment: write R${digits}`);
        if (!numbers.has(n.number)) report(file, line, `R${digits} in a comment names no entry of the decision log (${register.file})`);
      }
    }
  }
  return count;
}
