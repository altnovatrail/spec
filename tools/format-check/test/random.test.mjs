// The generator of section 22 of the format text, as random.mjs computes it, against what it is
// not: the golden outputs of Go's own tests of math/rand/v2 and the test vectors of RFC 9923. So
// the vectors that format-check computes with random.mjs rest on Go and on the RFC, not on itself.
//
// The values of Go are from src/math/rand/v2/pcg_test.go (TestPCG, last changed in fd985d23dc) and
// regress_test.go (regressGolden, last changed in 9c4849bf20), read at commit b98d22c1 on 2026-10-27:
// Copyright 2014 and 2023 The Go Authors, under a BSD-style license. Each method of regressGolden
// runs on a fresh New(NewPCG(1, 2)).

import { test } from "node:test";
import assert from "node:assert/strict";
import { below, between, fnv1a64, fraction, permutation, stateOf, streamOf } from "../random.mjs";

const fresh = () => streamOf(1n, 2n);

test("the stream of the words 1 and 2 is Go's NewPCG(1, 2)", () => {
  const stream = fresh();
  const want = [0xc4f5a58656eef510n, 0x9dcec3ad077dec6cn, 0xc8d04605312f8088n, 0xcbedc0dcb63ac19an, 0x3bf98798cae97950n, 0xa8c6d7f8d485abcn, 0x7ffa3780429cd279n, 0x730ad2626b1c2f8en];
  assert.deepEqual(want.map(() => stream.integer()), want);
});

test("below is Go's Uint64N, a power of two by a mask and otherwise by Lemire's method", () => {
  const stream = fresh();
  const bounds = [1n, 10n, 32n, 1n << 20n, (1n << 20n) + 1n, 1000000000n, 1n << 30n, (1n << 31n) - 2n, (1n << 31n) - 1n, 1000000000000000000n, 1n << 60n, (1n << 63n) - 2n, (1n << 63n) - 1n, (1n << 64n) - 2n, (1n << 64n) - 1n];
  const want = [0n, 6n, 8n, 704922n, 245656n, 41205257n, 43831929n, 965044528n, 285184408n, 183731176326946086n, 680987186633600239n, 4102454148908803108n, 8679174511200971228n, 2240328155279531676n, 7311121042813227357n];
  assert.deepEqual(bounds.map((bound) => below(stream, bound)), want);
});

test("between(a, c) is a + Go's Int64N(c − a + 1)", () => {
  const stream = fresh();
  const counts = [1n, 10n, 32n, 1n << 20n, (1n << 20n) + 1n, 1000000000n, 1n << 30n, (1n << 31n) - 2n, (1n << 31n) - 1n, 1000000000000000000n, 1n << 60n, (1n << 63n) - 2n, (1n << 63n) - 1n];
  const want = [0n, 6n, 8n, 704922n, 245656n, 41205257n, 43831929n, 965044528n, 285184408n, 183731176326946086n, 680987186633600239n, 4102454148908803108n, 8679174511200971228n];
  assert.deepEqual(counts.map((count) => between(stream, -5n, count - 6n) + 5n), want);
});

test("fraction is Go's Float64, and permutation Go's Perm", () => {
  const stream = fresh();
  assert.deepEqual([fraction(stream), fraction(stream), fraction(stream)], [0.6764556596678251, 0.4613862177205994, 0.5085473976760264]);
  const again = fresh();
  assert.deepEqual([0, 1, 5, 8, 9, 10, 16].map((count) => permutation(again, count)), [
    [],
    [0],
    [1, 4, 2, 0, 3],
    [4, 3, 6, 1, 5, 2, 7, 0],
    [6, 5, 1, 8, 7, 2, 0, 3, 4],
    [9, 4, 2, 5, 6, 8, 1, 7, 0, 3],
    [5, 9, 3, 1, 4, 2, 10, 7, 15, 11, 0, 14, 13, 8, 6, 12],
  ]);
});

test("each function draws as many integers as section 22 says", () => {
  const drawn = (call, start = fresh()) => {
    let count = 0;
    const stream = start;
    call({ integer: () => (count++, stream.integer()) });
    return count;
  };
  assert.equal(drawn((s) => below(s, 1n)), 1, "below(1) draws one, though it gives 0");
  assert.equal(drawn((s) => between(s, 7n, 7n)), 1);
  assert.equal(drawn((s) => permutation(s, 1)), 0);
  assert.equal(drawn((s) => permutation(s, 0)), 0);
  assert.equal(drawn((s) => permutation(s, 5)), 4);
  // 2^63 + 1 refuses almost half the products: from the words 0 and 2, the first four.
  const bound = (1n << 63n) + 1n;
  assert.equal(drawn((s) => below(s, bound), streamOf(0n, 2n)), 5, "each refused product draws another integer");
  assert.equal(drawn((s) => below(s, bound)), 1, "from the words 1 and 2, the first is taken");
});

test("FNV-1a of 64 bits is RFC 9923's, and a place's state is FNV-1a of its text and its seed", () => {
  assert.equal(fnv1a64(""), 0xcbf29ce484222325n);
  assert.equal(fnv1a64("a"), 0xaf63dc4c8601ec8cn);
  assert.equal(fnv1a64("foobar"), 0x85944171f73967e8n);
  assert.deepEqual(stateOf(20261001n, ["E-A3", "G2/0", "params"]), { high: fnv1a64("20261001|E-A3|G2/0|params"), low: 20261001n });
  assert.equal(stateOf(0n, ["\u00e9"]).high, fnv1a64("0|\u00e9"), "a name in UTF-8");
  assert.notEqual(fnv1a64("0|\u00e9"), fnv1a64("0|e\u0301"), "names compare as written, with no normalization");
});
