// The canonical text of section 25 against RFC 8785, the JSON Canonicalization Scheme, and the
// digests against the known answer of SHA-256.

import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalBytes, canonicalText, descriptorOf, digestOf } from "../canonical.mjs";

test("keys are sorted by their UTF-16 code units, recursively, and integer keys get no place of their own", () => {
  // RFC 8785, section 3.2.3: the property names of its example, in the order it gives — "\r", "1",
  // U+0080, ö, €, an emoji outside the Basic Multilingual Plane and U+FB33. JavaScript enumerates the
  // integer key "1" first, which the canonical text does not.
  const names = ["€", "\r", "דּ", "1", "😀", "\u0080", "ö"];
  const sorted = ["\r", "1", "\u0080", "ö", "€", "😀", "דּ"];
  const value = Object.fromEntries(names.map((name, index) => [name, index]));
  assert.equal(canonicalText(value), `{${sorted.map((name) => `${JSON.stringify(name)}:${names.indexOf(name)}`).join(",")}}`);
  assert.equal(canonicalText({ b: { d: 1, c: [3, { f: 2, e: 1 }] }, a: [] }), '{"a":[],"b":{"c":[3,{"e":1,"f":2}],"d":1}}');
});

test("strings are escaped as RFC 8785 asks, and only so", () => {
  // RFC 8785, section 3.2.2.2: its example string, with a control character, a line feed, quotation
  // marks and backslashes.
  assert.equal(canonicalText("€$\u000f\nA'B\"\\\\\"/"), '"€$\\u000f\\nA\'B\\"\\\\\\\\\\"/"');
  assert.equal(canonicalText("\b\t\n\f\r\u0007\u001f"), '"\\b\\t\\n\\f\\r\\u0007\\u001f"');
  // What encoding/json of Go escapes and the canonical text writes as it is.
  assert.equal(canonicalText("<a> &   \u007f /"), '"<a> &   \u007f /"');
  assert.equal(canonicalText("Renée 😀"), '"Renée 😀"');
});

test("literals and integers are written as they are, and nothing else is a value", () => {
  assert.equal(canonicalText([null, true, false, 0, -0, 7, -7, 2 ** 53 - 1, -(2 ** 53 - 1)]), "[null,true,false,0,0,7,-7,9007199254740991,-9007199254740991]");
  for (const [value, pattern] of [
    [1.5, /an integer within/],
    [2 ** 53, /an integer within/],
    [Number.NaN, /an integer within/],
    [Number.POSITIVE_INFINITY, /an integer within/],
    ["\ud800", /lone surrogate/],
    [{ "\udfff": 1 }, /lone surrogate/],
  ]) {
    assert.throws(() => canonicalText(value), pattern);
  }
  for (const value of [undefined, 1n, () => 1, Symbol("s")]) assert.throws(() => canonicalText(value), /no JSON value/);
});

test("the canonical bytes are UTF-8 with no byte order mark and no newline at the end", () => {
  const bytes = canonicalBytes({ title: "€" });
  assert.deepEqual([...bytes], [...Buffer.from('{"title":"€"}', "utf8")]);
  assert.notEqual(bytes.at(-1), 0x0a);
});

test("a digest is SHA-256 in lowercase hexadecimal digits, after sha256:", () => {
  // FIPS 180-4's example "abc", whose digest every implementation of SHA-256 gives.
  assert.equal(digestOf(Buffer.from("abc")), "sha256:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  assert.deepEqual(descriptorOf(Buffer.from("")), { digest: "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", size: 0 });
});
