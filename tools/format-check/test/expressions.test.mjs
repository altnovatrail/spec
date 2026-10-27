// The expressions of templates (section 23 of the format text), as expressions.mjs reads and
// evaluates them, against the Starlark they are a subset of. The examples and rules cited are from
// the specification of Starlark, spec.md of github.com/bazelbuild/starlark at commit c0af0ea03d, and
// the parser of go.starlark.net, syntax/parse.go of github.com/google/starlark-go at commit
// 4f4267fb14, both read on 2026-10-27 (Apache-2.0 and BSD-3-Clause). There is no Starlark here, so
// module-kit's CI, which evaluates the vectors of templates with go.starlark.net, is the check that
// does not rest on this file.

import { test } from "node:test";
import assert from "node:assert/strict";
import { EvaluationError, evaluate, parseExpression, tokensOf, typeOf } from "../expressions.mjs";

const value = (text, numbers = {}) => {
  const { tree, problem } = parseExpression(text);
  assert.equal(problem, undefined, `${text}: ${problem}`);
  return evaluate(tree, new Map(Object.entries(numbers).map(([name, number]) => [name, BigInt(number)])));
};
const problemOf = (text) => parseExpression(text).problem;
const typeIn = (text, names = []) => {
  const { tree, problem } = parseExpression(text);
  assert.equal(problem, undefined, problem);
  return typeOf(tree, new Set(names));
};

test("integers are exact, and // and % are floored, the remainder taking the divisor's sign", () => {
  // spec.md, Integers: «100 // 5 * 9 + 32 # 212», «3 // 2 # 1», «111111111 * 111111111 # 12345678987654321».
  assert.equal(value("100 // 5 * 9 + 32"), 212n);
  assert.equal(value("3 // 2"), 1n);
  assert.equal(value("111111111 * 111111111"), 12345678987654321n);
  assert.equal(value("99999999999999999999 * 99999999999999999999"), 9999999999999999999800000000000000000001n, "an int has no bound");
  // «For all finite x and y (y ≠ 0), (x // y) * y + (x % y) == x», and the remainder has the divisor's sign.
  for (const [x, y] of [[7, 2], [-7, 2], [7, -2], [-7, -2], [6, 3], [-6, 3], [0, -5]]) {
    const q = value("x // y", { x, y });
    const r = value("x % y", { x, y });
    assert.equal(q * BigInt(y) + r, BigInt(x), `${x} and ${y}`);
    assert.ok(r === 0n || r < 0n === y < 0, `the remainder of ${x} % ${y} is ${r}`);
  }
  assert.equal(value("-7 // 2"), -4n);
  assert.equal(value("-7 % 2"), 1n);
  assert.equal(value("7 % -2"), -1n);
});

test("unary - binds tighter than * // %, and not sits between and and the comparisons", () => {
  // parse.go: «Unary MINUS, unary PLUS, and TILDE have higher precedence so are handled in parsePrimary»,
  // and preclevels runs or, and, not, the comparisons, …, - +, * % / //.
  assert.equal(value("-a // 2", { a: 7 }), -4n, "(-a) // 2");
  assert.equal(value("-(a // 2)", { a: 7 }), -3n);
  assert.equal(value("- -a", { a: 7 }), 7n);
  assert.equal(value("a - -b", { a: 7, b: 2 }), 9n);
  assert.equal(value("1 + 2 * 3 - 4 // 3 % 2"), 6n, "* // % before + -, each level from the left");
  assert.equal(value("10 - 3 - 2"), 5n);
  assert.equal(value("not a == b", { a: 1, b: 2 }), true, "not (a == b)");
  assert.equal(value("not a == 1 and b == 2", { a: 1, b: 2 }), false, "(not (a == 1)) and (b == 2)");
  assert.equal(value("a == 1 or a == 2 and b == 3", { a: 1, b: 9 }), true, "or below and");
  assert.equal(value("(a == 1 or a == 2) and b == 3", { a: 1, b: 9 }), false);
  assert.equal(value("not not a < b", { a: 1, b: 2 }), true);
});

test("and and or decide by their left operand when they can, so the right one raises no error then", () => {
  assert.equal(value("b != 0 and a % b == 0", { a: 6, b: 0 }), false);
  assert.equal(value("b == 0 or a % b == 0", { a: 6, b: 0 }), true);
  assert.throws(() => value("a % b == 0 and b != 0", { a: 6, b: 0 }), EvaluationError);
  assert.throws(() => value("a // 0"), EvaluationError);
});

test("comparisons do not chain, and the subset takes only its own tokens", () => {
  // spec.md, Binary operators: «Comparison operators, in, and not in are non-associative, so the
  // parser will not accept 0 <= i < n».
  assert.match(problemOf("0 <= i < n"), /comparisons do not chain/);
  assert.match(problemOf("a == b == c"), /comparisons do not chain/);
  assert.equal(problemOf("0 <= i and i < n"), undefined);
  // Starlark has no power operator; / is a float's division, and the rest are outside the subset.
  assert.match(problemOf("a ** 2"), /\* stands where an operand is due/);
  assert.match(problemOf("a / 2"), /"\/" is no part/);
  for (const text of ["abs(a)", "a if b else c", "True", "a\tb", "a & b", "[a]", "a.b"]) assert.ok(problemOf(text), text);
  assert.match(problemOf("07"), /no leading zero/);
  assert.match(problemOf("7a"), /neither an integer nor a name/);
  assert.match(problemOf("(a + 1"), /a \( is not closed/);
  assert.match(problemOf("a +"), /ends where an operand is due/);
  assert.match(problemOf("a b"), /b stands where the expression has ended/);
  assert.match(problemOf(""), /ends where an operand is due/);
  assert.deepEqual(tokensOf("a<=b//2").tokens.map((token) => token.text), ["a", "<=", "b", "//", "2"], "tokens need no spaces between them");
});

test("every expression is typed: ints for arithmetic and comparison, bools for logic, and known names only", () => {
  assert.deepEqual(typeIn("2 * a + 4 * b", ["a", "b"]), { type: "int" });
  assert.deepEqual(typeIn("a != b", ["a", "b"]), { type: "bool" });
  assert.deepEqual(typeIn("not (a < 3) or b > 1", ["a", "b"]), { type: "bool" });
  assert.match(typeIn("a + 1", []).problem, /a is no name that it may name/);
  assert.match(typeIn("a and b", ["a", "b"]).problem, /and takes a bool/, "Starlark's and would give an operand, not a bool");
  assert.match(typeIn("not a", ["a"]).problem, /not takes a bool/);
  assert.match(typeIn("(a < b) + 1", ["a", "b"]).problem, /\+ takes an int/);
  assert.match(typeIn("-(a < b)", ["a", "b"]).problem, /unary - takes an int/);
  assert.match(typeIn("(a < b) == (b < a)", ["a", "b"]).problem, /== takes an int/);
});
