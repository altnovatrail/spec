// readModuleFile on files written in the test itself: for each YAML rule, what breaks it, and what
// looks as if it might and does not.

import { test } from "node:test";
import assert from "node:assert/strict";
import { YAML_RULES, readModuleFile } from "../yaml.mjs";

const read = (source) => readModuleFile(typeof source === "string" ? Buffer.from(source, "utf8") : Buffer.from(source));

// The rules a file breaks, each once, in the order of the format text.
function rulesOf(source) {
  const { violations, notYaml } = read(source);
  assert.deepEqual(notYaml, [], `not YAML: ${JSON.stringify(notYaml)}`);
  return YAML_RULES.filter((rule) => violations.some((violation) => violation.rule === rule));
}

function breaksOnly(rule, sources) {
  for (const source of sources) assert.deepEqual(rulesOf(source), [rule], JSON.stringify(source));
}

test("a file within the rules gives its JSON value", () => {
  const source = [
    "---",
    "# A comment.",
    "title: A title, with words",
    "quoted: \"yes\"",
    "single: '0777'",
    "count: -1",
    "zero: 0",
    "weight: 1.5e3",
    "nothing: null",
    "flag: false",
    "largest: 9007199254740991",
    "fraction: 9007199254740991.5",
    "tiny: 1e-400",
    "text: |",
    "  Two lines,",
    "  kept.",
    "folded: >",
    "  One line.",
    "flow: {a: 1, b: [x, z]}",
    "\"quoted key\": value",
    "emoji: 😀 and é",
    "escapes: \"\\\\/ \\u00e9 \\U0001F600\"",
    "block: |",
    "  &x !t %YAML 1.2",
    "",
  ].join("\n");
  const { value, violations, notYaml } = read(source);
  assert.deepEqual(notYaml, []);
  assert.deepEqual(violations, []);
  assert.deepEqual(value, {
    title: "A title, with words",
    quoted: "yes",
    single: "0777",
    count: -1,
    zero: 0,
    weight: 1500,
    nothing: null,
    flag: false,
    largest: 9007199254740991,
    fraction: 9007199254740991.5,
    tiny: 0,
    text: "Two lines,\nkept.\n",
    folded: "One line.\n",
    flow: { a: 1, b: ["x", "z"] },
    "quoted key": "value",
    emoji: "😀 and é",
    escapes: "\\/ é 😀",
    block: "&x !t %YAML 1.2\n",
  });
});

test("yaml.encoding: UTF-8, with no byte order mark", () => {
  breaksOnly("yaml.encoding", [
    [0xef, 0xbb, 0xbf, ...Buffer.from("title: A title\n")],
    [...Buffer.from('title: "Caf'), 0xe9, ...Buffer.from('"\n')],
    [...Buffer.from('title: "Caf'), 0xc3, ...Buffer.from('"\n')],
    [...Buffer.from("title: Caf"), 0xc3],
  ]);
  assert.equal(read([...Buffer.from("a: 1\nb: 2\nc: \"x"), 0xff, ...Buffer.from('"\n')]).violations[0].line, 3);
});

test("yaml.single-document: exactly one", () => {
  breaksOnly("yaml.single-document", ["a: 1\n---\nb: 2\n", "# Only a comment.\n", ""]);
  assert.deepEqual(rulesOf("---\na: 1\n...\n"), []);
});

test("yaml.no-directives", () => {
  breaksOnly("yaml.no-directives", ["%YAML 1.2\n---\na: 1\n", "%TAG !n! tag:example.com,2026:\n---\na: 1\n"]);
});

test("yaml.no-anchors: no anchor, no alias", () => {
  breaksOnly("yaml.no-anchors", ["a: &x 1\n", "a: &x 1\nb: *x\n", "a: &x\n  b: 1\n", "- &x [1]\n"]);
});

test("yaml.no-tags", () => {
  breaksOnly("yaml.no-tags", ["a: !!str 1\n", "a: !thing x\n", "a: ! 12\n", "a: !!map {b: c}\n", "a: !!str \"x\"\n"]);
});

test("yaml.string-keys: a key is a string", () => {
  breaksOnly("yaml.string-keys", ["1: one\n", "null: x\n", "true: x\n", "1.5: x\n", "? [a, b]\n: x\n", "? {a: b}\n: x\n"]);
  // A string key written plain where it should be quoted breaks the plain-string rule alone.
  assert.deepEqual(rulesOf("yes: x\n"), ["yaml.plain-strings"]);
  assert.deepEqual(rulesOf("'1': one\n\"null\": x\n"), []);
});

test("yaml.unique-keys: once escapes are read", () => {
  breaksOnly("yaml.unique-keys", ["a: 1\na: 2\n", "a: 1\n'a': 2\n", 'a: 1\n"\\u0061": 2\n', "{a: 1, a: 2}\n", "x:\n  a: 1\n  a: 2\n"]);
  assert.deepEqual(rulesOf("a: 1\nb:\n  a: 2\n"), []);
  assert.equal(read("a: 1\nb: 2\na: 3\n").violations[0].line, 3);
});

test("yaml.json-scalars: a number a double holds, an integer within ±(2^53−1), no negative zero", () => {
  breaksOnly(
    "yaml.json-scalars",
    ["9007199254740992", "-9007199254740992", "12345678901234567890", "1e400", "-1e400", "-0", "-0.0", "-0e3"].map((number) => `count: ${number}\n`),
  );
  // 1e16 is written as no integer; how precisely a double holds a number does not matter.
  assert.deepEqual(rulesOf("count: 1e16\nlarge: 1e300\nsmall: 0.1\ntiny: -1e-300\nlong: 3.14159265358979323846\n"), []);
});

test("yaml.plain-strings: no plain string that some parser reads otherwise", () => {
  const plain = ["", "0777", "01", "1.", ".5", ".inf", "+1", "-x", "-.5", "~", "<<", "=", "y", "N", "yes", "No", "ON", "off", "True", "FALSE", "Null", "1:30", "0o17", "0x1F"];
  breaksOnly("yaml.plain-strings", plain.map((word) => `a: ${word}\n`));
  breaksOnly("yaml.plain-strings", ["- \n", "{a}\n", "? a\n", "---\n", "<<: x\n"]);
  assert.deepEqual(rulesOf("a: yesterday\nb: no-thanks\nc: x1\nd: A-1\n"), []);
});

test("yaml.characters: no surrogate, no noncharacter, no \\/", () => {
  breaksOnly("yaml.characters", [
    'a: "\\ud800"\n',
    'a: "\\ud83d\\ude00"\n',
    'a: "\\U0000D800"\n',
    'a: "\\uFFFE"\n',
    'a: "\\U0010FFFF"\n',
    'a: "\\uFDD0"\n',
    "a: \uFDD0x\n",
    "a: 'x\uFDEF'\n",
    '"\\uFDD0": x\n',
    'a: "a\\/b"\n',
    'a: "\\\\\\/"\n',
  ]);
  assert.deepEqual(rulesOf('a: "\\\\/"\nb: "\\u00e9 \\U0001F600"\n'), []);
});

test("not YAML: a syntax error, or a character YAML does not allow", () => {
  for (const source of ["a: [\n", "a: \"x\u0001y\"\n", "a: 1 # \u0002\n", [...Buffer.from("a: x"), 0xef, 0xbf, 0xbe, 0x0a], "a: 1\n b: 2\n"]) {
    const { value, notYaml } = read(source);
    assert.ok(notYaml.length > 0, JSON.stringify(source));
    assert.equal(value, undefined);
  }
  assert.equal(read("a: 1\nb: \u0001\n").notYaml[0].line, 2);
});

test("a file that breaks a rule gives no value", () => {
  assert.equal(read("a: yes\n").value, undefined);
});

test("review: a number that rounds to negative zero is negative zero", () => {
  assert.deepEqual(rulesOf("weight: -1e-400\n"), ["yaml.json-scalars"]);
});

test("review: a byte that is not UTF-8 is named at the start of its sequence", () => {
  assert.match(read([...Buffer.from("a: "), 0xe2, 0x41, 0x0a]).violations[0].message, /^byte 4 /);
  assert.match(read([...Buffer.from("a: \""), 0xed, 0xa0, 0x80, ...Buffer.from("\"\n")]).violations[0].message, /^byte 5 /);
  assert.match(read([...Buffer.from("a: x"), 0xf0, 0x9f]).violations[0].message, /^byte 5 /);
});
