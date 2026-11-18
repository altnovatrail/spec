// The numbers of decisions in the comments of code: each "R…" a comment gives names an entry of
// its log — "R25" the repository's own, "R25 spec" spec's —, so that the anchor a comment ends with
// leads to its reason (R160). "R37 canvas-api" and "R03 api" are another repository's and are not
// checked, and an example in inline code, `R03`, is no citation (R32).
//
// What is read is the comments alone, not strings: `//` and `/* */` in Go, TypeScript and
// JavaScript, `#` in shell, YAML, justfiles and Dockerfiles. Code that a generator writes — its
// first lines say "Code generated … DO NOT EDIT" or "@generated" — is not read: its comments come
// from the .proto files and schemas it is generated from.

import fs from "node:fs";
import path from "node:path";
import { findNumbers } from "./citations.mjs";
import { CODE } from "./markdown.mjs";

const SLASH = new Set([".go", ".ts", ".tsx", ".js", ".mjs", ".cjs"]);
const HASH = new Set([".sh", ".yml", ".yaml"]);
// Go has no literal of a regular expression, and a `'` there is a rune.
const REGEX_LITERALS = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs"]);
const GENERATED = /Code generated .*DO NOT EDIT|@generated\b/;
// How many lines from the top a generator's mark may be: Go's convention puts it before the package
// clause, after a license header at most.
const GENERATED_LINES = 20;

// The kind of comments a file has, by its name: "slash", "hash" or null when it is not read.
export function commentKind(file) {
  const name = path.posix.basename(file);
  const ext = path.posix.extname(name);
  if (SLASH.has(ext)) return "slash";
  if (HASH.has(ext)) return "hash";
  if (/^(?:\.?justfile|Dockerfile(?:\..+)?|.+\.Dockerfile)$/i.test(name)) return "hash";
  return null;
}

export const isGenerated = (source) => GENERATED.test(source.split("\n", GENERATED_LINES).join("\n"));

// The comments of a source, each { text, lineAt }: the comment's text with its markers taken off,
// one block for a run of line comments on consecutive lines, so that "R32\n spec" is one citation;
// lineAt(offset) is the line of the source an offset of the text is on.
export function commentsOf(source, kind, { regexLiterals = true } = {}) {
  const pieces = kind === "hash" ? hashComments(source) : slashComments(source, regexLiterals);
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
// that line. A quote opens a string only where a word could start, so the apostrophe of "don't" in
// an unquoted YAML value is not one.
function hashComments(source) {
  const pieces = [];
  source.split("\n").forEach((line, index) => {
    let quote = null;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (quote) {
        if (c === "\\" && quote === '"') i++;
        else if (c === quote) quote = null;
        continue;
      }
      if ((c === '"' || c === "'") && (i === 0 || /[\s=(:[{,$]/.test(line[i - 1]))) quote = c;
      else if (c === "#" && (i === 0 || /\s/.test(line[i - 1]))) {
        pieces.push({ text: line.slice(i + 1), startLine: index + 1, endLine: index + 1, line: true });
        break;
      }
    }
  });
  return pieces;
}

// A `/` that starts a regular expression rather than a division follows one of these, or a keyword
// of REGEX_AFTER_WORD, or nothing.
const REGEX_AFTER = new Set([..."(,=:[!&|?{};+-*%<>~^"]);
const REGEX_AFTER_WORD = new Set(["return", "typeof", "case", "in", "of", "new", "delete", "void", "throw", "yield", "await", "else", "do"]);

// `//` to the end of its line and `/* … */`, outside strings, template literals and their `${}`,
// and literals of regular expressions.
function slashComments(source, regexLiterals) {
  const pieces = [];
  let line = 1;
  // Each frame is a template literal or the braces of a `${}` in one.
  const stack = [];
  let previous = "";
  let i = 0;
  const n = source.length;
  const advance = (to) => {
    for (let k = i; k < to; k++) if (source[k] === "\n") line++;
    i = to;
  };
  while (i < n) {
    const c = source[i];
    const top = stack.at(-1);
    if (top?.template) {
      if (c === "\\") advance(i + 2);
      else if (c === "`") {
        stack.pop();
        previous = "`";
        advance(i + 1);
      } else if (c === "$" && source[i + 1] === "{") {
        stack.push({ depth: 0 });
        previous = "{";
        advance(i + 2);
      } else advance(i + 1);
      continue;
    }
    if (c === "/" && source[i + 1] === "/") {
      const end = source.indexOf("\n", i);
      const stop = end < 0 ? n : end;
      pieces.push({ text: source.slice(i + 2, stop), startLine: line, endLine: line, line: true });
      advance(stop);
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
      advance(end < 0 ? n : end + 2);
      pieces.push({ text, startLine, endLine: line, line: false });
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      if (c === "`" && regexLiterals) {
        stack.push({ template: true });
        advance(i + 1);
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
      advance(Math.min(k + 1, n));
      continue;
    }
    if (c === "/" && regexLiterals && (previous === "" || REGEX_AFTER.has(previous) || REGEX_AFTER_WORD.has(previous))) {
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
        advance(k + 1);
        continue;
      }
    }
    if (top && c === "{") top.depth++;
    if (top && c === "}") {
      if (top.depth === 0) {
        stack.pop();
        advance(i + 1);
        continue;
      }
      top.depth--;
    }
    if (/[\p{L}\p{N}_$]/u.test(c)) {
      let k = i;
      while (k < n && /[\p{L}\p{N}_$]/u.test(source[k])) k++;
      previous = source.slice(i, k);
      advance(k);
      continue;
    }
    if (!/\s/.test(c)) previous = c;
    advance(i + 1);
  }
  return pieces;
}

// An example in inline code is no citation. As in a document (markdown.mjs), a name in code still
// reads as a word, "R3 `api`", and other code stands as CODE, so that a list such as "standalone:
// `tools/learners`, R163" keeps its shape; padded to its length in front, so that offsets keep their lines.
const blankCode = (text) =>
  text.replace(/`([^`\n]*)`/g, (code, value) => (/^[\p{L}.][\p{L}-]*$/u.test(value) ? ` ${value} ` : CODE.padStart(code.length)));

// Reports each number of a decision in a comment that names no entry of its log; returns how many
// were checked. `registerOf(scope)` is the register R that a citation of that scope is read in.
export function checkComments(root, listed, registerOf, report) {
  let count = 0;
  for (const file of listed) {
    const kind = commentKind(file);
    if (!kind) continue;
    const source = fs.readFileSync(path.join(root, file), "utf8");
    if (isGenerated(source)) continue;
    const regexLiterals = REGEX_LITERALS.has(path.posix.extname(file));
    for (const comment of commentsOf(source, kind, { regexLiterals })) {
      for (const n of findNumbers({ text: blankCode(comment.text) })) {
        if (n.prefix !== "R" || n.scope === "foreign") continue;
        const known = registerOf(n.scope);
        if (!known) continue;
        count++;
        const { register, numbers } = known;
        const line = comment.lineAt(n.start);
        const canonical = String(n.number).padStart(register.width, "0");
        if (!n.inRange && n.digits !== canonical) report(file, line, `R${n.digits} in a comment: write R${canonical}`);
        if (!numbers.has(n.number)) report(file, line, `R${canonical} in a comment names no entry of the decision log (${register.file})`);
      }
    }
  }
  return count;
}
