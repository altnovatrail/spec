// A file of a module, read as the format text says in section 4: YAML 1.2.2 under its Core schema,
// with the rules yaml.* over it (R45 and its amendment of 2026-10-22). The examples and test
// vectors of format/ are such files.
//
// YAML parsers differ, and the rules keep a file to what every parser reads alike. The parser here
// is yaml (eemeli/yaml), whose tree keeps the source of each node beside its value: a rule about how
// a value is written — an escape, a tag, an anchor — reads the source, and a rule about the value
// reads the value. yaml itself is lenient where the YAML specification is not, so what it lets
// through and YAML forbids is refused here as not YAML.

import { LineCounter, Parser, Scalar, isAlias, isMap, isScalar, isSeq, parseAllDocuments } from "yaml";

// The rules of section 4, in its order.
export const YAML_RULES = [
  "yaml.encoding",
  "yaml.single-document",
  "yaml.no-directives",
  "yaml.no-anchors",
  "yaml.no-tags",
  "yaml.string-keys",
  "yaml.unique-keys",
  "yaml.json-scalars",
  "yaml.plain-strings",
  "yaml.characters",
];

// Core schema whatever a %YAML directive says: with %YAML 1.1 and no schema named, yaml would read
// "yes" as true and "0777" as 511. A repeated key is a breach of yaml.unique-keys, reported here,
// not an error of parsing.
const OPTIONS = { version: "1.2", schema: "core", uniqueKeys: false, keepSourceTokens: true, logLevel: "error" };

// Plain strings that some parser reads as something else: YAML 1.1's booleans, and the words of the
// Core schema in another letter case.
const OTHER_WORDS = new Set(["y", "n", "yes", "no", "on", "off", "true", "false", "null"]);
const OTHER_STARTS = new Set("+-.~<=");

// The file's JSON value when it breaks nothing, and otherwise undefined; the rules it breaks, each
// { rule, line, message }; and why it is not YAML at all, each { line, message }.
export function readModuleFile(bytes) {
  const violations = [];
  const notYaml = [];
  const breach = (rule, line, message) => violations.push({ rule, line, message });

  const invalid = firstInvalidByte(bytes);
  if (invalid >= 0) breach("yaml.encoding", lineOfByte(bytes, invalid), `byte ${invalid + 1} is not UTF-8`);
  // The rest is read even so, with each byte that is not UTF-8 replaced, so that every rule is seen.
  const text = new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes);

  // "To ensure readability, YAML streams use only the printable subset of the Unicode character
  // set" (YAML 1.2.2, 5.1). yaml reads control characters and U+FFFE all the same; go-yaml does not.
  let line = 1;
  for (const char of text) {
    if (char === "\n") line++;
    else if (!isPrintable(char.codePointAt(0))) notYaml.push({ line, message: `${codePoint(char)}: YAML allows no such character, not even in a comment` });
  }

  const lines = new LineCounter();
  const documents = parseAllDocuments(text, { ...OPTIONS, lineCounter: lines });
  const lineAt = (offset) => lines.linePos(offset).line;
  for (const document of documents) {
    for (const error of document.errors) notYaml.push({ line: lineAt(error.pos[0]), message: error.message.split("\n")[0] });
  }
  if (notYaml.length) return { value: undefined, violations, notYaml };

  // What stands between documents: a byte order mark, a directive.
  for (const token of new Parser().parse(text)) {
    if (token.type === "byte-order-mark") breach("yaml.encoding", lineAt(token.offset), "a byte order mark");
    else if (token.type === "directive") breach("yaml.no-directives", lineAt(token.offset), `the directive ${token.source}`);
  }
  if (documents.length === 0) breach("yaml.single-document", 1, "no document: the file holds comments at most");
  for (const extra of documents.slice(1)) breach("yaml.single-document", lineAt(extra.range[0]), "a second document");

  const walker = new Walker(breach, lineAt);
  for (const document of documents) walker.node(document.contents, false, document.range[0]);

  const value = violations.length === 0 ? documents[0].toJS() : undefined;
  return { value, violations, notYaml };
}

// Every node of a document, each checked against the rules about nodes.
class Walker {
  constructor(breach, lineAt) {
    this.breach = breach;
    this.lineAt = lineAt;
  }

  // A node, or null where YAML wrote no node at all — the value of "{a}" or "? a" — which reads as
  // an empty plain scalar, as "a:" does. at is where to report it then.
  node(node, isKey, at) {
    if (!node) {
      this.plain("", isKey, this.lineAt(at));
      return;
    }
    const line = this.lineAt(node.range[0]);
    if (isAlias(node)) {
      this.breach("yaml.no-anchors", line, `the alias *${node.source}`);
      return;
    }
    if (node.anchor) this.breach("yaml.no-anchors", line, `the anchor &${node.anchor}`);
    if (node.tag) this.breach("yaml.no-tags", line, `the tag ${shortTag(node.tag)}`);
    if (isScalar(node)) {
      this.scalar(node, isKey, line);
      return;
    }
    if (isKey) this.breach("yaml.string-keys", line, `a key that is a ${isMap(node) ? "mapping" : "sequence"}, not a string`);
    if (isMap(node)) this.mapping(node);
    else if (isSeq(node)) for (const item of node.items) this.node(item, false, node.range[0]);
  }

  mapping(map) {
    const seen = new Map();
    for (const pair of map.items) {
      const at = pair.key?.range?.[0] ?? map.range[0];
      this.node(pair.key, true, at);
      const key = stringKey(pair.key);
      if (key !== null) {
        const line = this.lineAt(at);
        if (seen.has(key)) this.breach("yaml.unique-keys", line, `the key ${JSON.stringify(key)} again, after line ${seen.get(key)}`);
        else seen.set(key, line);
      }
      this.node(pair.value, false, at);
    }
  }

  scalar(node, isKey, line) {
    if (node.type === Scalar.PLAIN) {
      this.plain(node.source, isKey, line);
      return;
    }
    if (typeof node.value === "string") this.characters(node.value, line);
    if (node.type === Scalar.QUOTE_DOUBLE && node.srcToken) this.escapes(node.srcToken.source, node.srcToken.offset);
  }

  // A plain scalar is null, true, false or a JSON number, as written, or else a string (yaml.json-
  // scalars, yaml.plain-strings).
  plain(source, isKey, line) {
    if (source === "null" || source === "true" || source === "false") {
      if (isKey) this.breach("yaml.string-keys", line, `a key that is ${source}, not a string`);
      return;
    }
    if (isJsonNumber(source)) {
      if (isKey) this.breach("yaml.string-keys", line, `a key that is the number ${source}, not a string`);
      this.number(source, line);
      return;
    }
    if (source === "") this.breach("yaml.plain-strings", line, 'an empty plain scalar: write null, or "" for an empty string');
    else if (isDigit(source[0]) || OTHER_STARTS.has(source[0])) this.breach("yaml.plain-strings", line, `${JSON.stringify(source)} begins with ${source[0]}: write it in quotes`);
    else if (OTHER_WORDS.has(source.toLowerCase())) this.breach("yaml.plain-strings", line, `${JSON.stringify(source)} reads as another value in some parsers: write it in quotes`);
    this.characters(source, line);
  }

  // A number is finite as a double, and how precisely the double holds it does not matter. One
  // written without a fraction or an exponent is an integer, as go-yaml tells int from float, and
  // lies within ±(2^53−1). Negative zero is written in no notation, nor reached by a negative number
  // that the double rounds to zero, such as -1e-400 (RFC 7493, 2.2).
  number(source, line) {
    const value = Number(source);
    if (Object.is(value, -0)) this.breach("yaml.json-scalars", line, `${source} reads as negative zero`);
    else if (!/[.eE]/.test(source)) {
      if (!Number.isSafeInteger(value)) this.breach("yaml.json-scalars", line, `${source}: an integer outside ±(2^53−1)`);
    } else if (!Number.isFinite(value)) this.breach("yaml.json-scalars", line, `${source} is larger than any double`);
  }

  // UTF-8 holds no surrogate, so a string has one only from an escape, which escapes() reads.
  characters(text, line) {
    for (const char of text) {
      if (isNoncharacter(char.codePointAt(0))) this.breach("yaml.characters", line, `${codePoint(char)}, a noncharacter`);
    }
  }

  // The source of a double-quoted scalar, read from left to right as YAML reads its escapes, so that
  // "\\/" is a backslash and a slash. An escaped surrogate is refused also as half of a pair: yaml
  // joins the pair into one character, go-yaml refuses it.
  escapes(source, offset) {
    let at = 0;
    while (at < source.length) {
      if (source[at] !== "\\") {
        at++;
        continue;
      }
      const kind = source[at + 1];
      const width = { u: 4, U: 8 }[kind] ?? 0;
      const escape = source.slice(at, at + 2 + width);
      if (kind === "/") this.breach("yaml.characters", this.lineAt(offset + at), "the escape \\/: write /");
      const code = width ? Number.parseInt(escape.slice(2), 16) : -1;
      if (code >= 0xd800 && code <= 0xdfff) this.breach("yaml.characters", this.lineAt(offset + at), `the escape ${escape}, a surrogate`);
      at += 2 + width;
    }
  }
}

// The string a key is, or null when it is not a string. A key YAML wrote no node for is the empty
// plain scalar.
function stringKey(node) {
  if (!node) return "";
  if (!isScalar(node)) return null;
  if (node.type !== Scalar.PLAIN) return typeof node.value === "string" ? node.value : null;
  const source = node.source;
  if (source === "null" || source === "true" || source === "false" || isJsonNumber(source)) return null;
  return source;
}

// The JSON grammar of a number (RFC 8259, 6), read by hand.
function isJsonNumber(text) {
  let at = 0;
  if (text[at] === "-") at++;
  if (text[at] === "0") at++;
  else if (text[at] >= "1" && text[at] <= "9") {
    while (isDigit(text[at])) at++;
  } else return false;
  if (text[at] === ".") {
    at++;
    if (!isDigit(text[at])) return false;
    while (isDigit(text[at])) at++;
  }
  if (text[at] === "e" || text[at] === "E") {
    at++;
    if (text[at] === "+" || text[at] === "-") at++;
    if (!isDigit(text[at])) return false;
    while (isDigit(text[at])) at++;
  }
  return at === text.length;
}

function isDigit(char) {
  return char !== undefined && char >= "0" && char <= "9";
}

// c-printable: x09, x0A, x0D, x20–x7E, x85, xA0–xD7FF, xE000–xFFFD, x10000–x10FFFF (YAML 1.2.2, 5.1).
function isPrintable(code) {
  return (
    code === 0x09 ||
    code === 0x0a ||
    code === 0x0d ||
    (code >= 0x20 && code <= 0x7e) ||
    code === 0x85 ||
    (code >= 0xa0 && code <= 0xd7ff) ||
    (code >= 0xe000 && code <= 0xfffd) ||
    (code >= 0x10000 && code <= 0x10ffff)
  );
}

// U+FDD0 to U+FDEF, and the last two code points of every plane.
function isNoncharacter(code) {
  return (code >= 0xfdd0 && code <= 0xfdef) || (code & 0xfffe) === 0xfffe;
}

function codePoint(char) {
  return `U+${char.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}`;
}

function shortTag(tag) {
  const standard = "tag:yaml.org,2002:";
  return tag.startsWith(standard) ? `!!${tag.slice(standard.length)}` : tag;
}

// The offset of the first byte that is no part of a UTF-8 character, or -1 when there is none. The
// platform's decoder decides, fed one byte at a time to tell where; it notices a sequence cut short
// only at the byte after it, so the error is put back at the sequence's first byte.
export function firstInvalidByte(bytes) {
  try {
    new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
    return -1;
  } catch {
    // Found below.
  }
  const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
  for (let at = 0; at < bytes.length; at++) {
    try {
      decoder.decode(bytes.subarray(at, at + 1), { stream: true });
    } catch {
      return sequenceStart(bytes, at);
    }
  }
  return sequenceStart(bytes, bytes.length);
}

// Where the sequence that the byte at at breaks begins: the lead byte up to three bytes back, with
// only continuation bytes after it, whose sequence reaches at; or at itself.
function sequenceStart(bytes, at) {
  for (let back = 1; back <= 3 && at - back >= 0; back++) {
    const byte = bytes[at - back];
    if (byte >= 0x80 && byte <= 0xbf) continue;
    const length = byte >= 0xf0 ? 4 : byte >= 0xe0 ? 3 : byte >= 0xc0 ? 2 : 1;
    return length > back ? at - back : at;
  }
  return at;
}

function lineOfByte(bytes, offset) {
  let line = 1;
  for (let at = 0; at < offset; at++) if (bytes[at] === 0x0a) line++;
  return line;
}
