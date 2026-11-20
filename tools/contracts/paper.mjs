// The test vectors of the key of a task from paper, novatrail.paper.v1: a second implementation of
// what module-kit does with it — the solver of a formula, the rules of an answer of AI, and the
// verdict by the key — beside module-kit's own, whose CI passes the same vectors (R162). The
// verdicts are format-check's, on the value brought to the key as contracts/README.md brings it.
//
// The vectors are JSON files of contracts/vectors/paper/v1/, each { description, cases }:
// - solver.json: a case has its formula, and either answer, the Number the solver gives, or refused,
//   the reason it does not take the formula;
// - answers.json: a case has answer, an Answer of AI, and key, whether it is an answer;
// - verdicts.json: a case has key, the Answer of the key, value, the value read or null, and
//   verdict, { verdict, reason } as the vectors of verdicts of the module format write it.
// The messages are read by @bufbuild/protobuf with the descriptors of the image buf builds of
// contracts/, and written back with the protobuf names and every field, so that a vector says each.

import fs from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { createFileRegistry, fromJson, toJson } from "@bufbuild/protobuf";
import * as wkt from "@bufbuild/protobuf/wkt";
import { absolute, choiceForm, gcd, lowercase, normalized, rationalOf, scriptsReplaced, slotVerdict, unitForm } from "../format-check/verdicts.mjs";
import { readVector } from "./observation.mjs";
import { isObject } from "./rules.mjs";
import { show } from "./sample.mjs";

export const PACKAGE = "novatrail.paper.v1";
export const FOLDER = "contracts/vectors/paper/v1";
const TEXT = "contracts/README.md, section 16";
const WRITTEN = { useProtoFieldName: true, alwaysEmitImplicit: true };
const FILES = ["answers.json", "solver.json", "verdicts.json"];

// The reasons the solver names, in the order it names the first that applies.
export const REASONS = ["syntax", "two_unknowns", "unknown_in_expression", "no_unknown", "not_linear", "division_by_zero", "too_large", "no_root", "every_root"];
// The rules of an answer of AI, each that an answer breaks named by its own word.
export const RULES = ["no_kind", "value", "units_empty", "units_same", "unknown", "options_count", "option_length", "options_same", "choice_key"];
// The two ways a value read is brought to the key.
export const BROUGHT = ["unknown", "brackets"];

const MAX_FORMULA = 200;
const MAX_DIGITS = 15;
const MAX_EXPONENT = 10n;
const MAX_PART = 100;
const MAX_ANSWER = 16;

// Rational numbers, { n, d } with d positive and the two coprime; and the linear parts a·x + b.
function rational(n, d = 1n) {
  if (d < 0n) [n, d] = [-n, -d];
  const g = gcd(absolute(n), d) || 1n;
  return { n: n / g, d: d / g };
}
const ZERO = rational(0n);
const ONE = rational(1n);
const add = (p, q) => rational(p.n * q.d + q.n * p.d, p.d * q.d);
const negate = (p) => ({ n: -p.n, d: p.d });
const times = (p, q) => rational(p.n * q.n, p.d * q.d);
const isZero = (p) => p.n === 0n;
const digitsOf = (n) => absolute(n).toString().length;

class Refusal extends Error {
  constructor(reason) {
    super(reason);
    this.reason = reason;
  }
}

// A linear part, after an operation: a numerator or a denominator of more than 100 digits is too
// large.
function bounded(part) {
  for (const p of [part.a, part.b]) if (digitsOf(p.n) > MAX_PART || digitsOf(p.d) > MAX_PART) throw new Refusal("too_large");
  return part;
}
const constant = (b) => ({ a: ZERO, b });

// The tokens of a formula: numbers, letters, signs, with spaces skipped wherever they stand; null
// when a character is none of them or a number has more than 15 digits.
function tokensOf(formula) {
  const tokens = [];
  for (let at = 0; at < formula.length; ) {
    const char = formula[at];
    if (char === " ") at++;
    else if (/[0-9]/.test(char)) {
      const match = /^([0-9]+)(?:\.([0-9]+))?/.exec(formula.slice(at));
      const digits = match[1].length + (match[2]?.length ?? 0);
      if (digits > MAX_DIGITS) return null;
      tokens.push({ kind: "number", text: match[0], whole: match[1], part: match[2] ?? "" });
      at += match[0].length;
    } else if (/[a-z]/.test(char)) {
      tokens.push({ kind: "unknown", text: char });
      at++;
    } else if ("+-*/^()=".includes(char)) {
      tokens.push({ kind: char, text: char });
      at++;
    } else return null;
  }
  return tokens;
}

// The tree of a formula by its grammar, or null when it is not of it.
export function parse(formula) {
  if (typeof formula !== "string" || formula.length > MAX_FORMULA || !/^[\x20-\x7E]*$/.test(formula)) return null;
  const tokens = tokensOf(formula);
  if (!tokens) return null;
  let at = 0;
  const peek = () => tokens[at]?.kind;
  const take = (kind) => (peek() === kind ? tokens[at++] : null);
  const fail = () => {
    throw new SyntaxError("not of the grammar");
  };
  function expression() {
    let left = term();
    for (let sign = take("+") ?? take("-"); sign; sign = take("+") ?? take("-")) left = { op: sign.kind, left, right: term() };
    return left;
  }
  function term() {
    let left = factor();
    for (let sign = take("*") ?? take("/"); sign; sign = take("*") ?? take("/")) left = { op: sign.kind, left, right: factor() };
    return left;
  }
  function factor() {
    if (take("-")) return { op: "neg", of: factor() };
    return power();
  }
  function power() {
    const base = primary();
    if (!take("^")) return base;
    const exponent = take("number");
    if (!exponent || exponent.part !== "" || BigInt(exponent.whole) > MAX_EXPONENT) fail();
    return { op: "^", base, exponent: BigInt(exponent.whole) };
  }
  function primary() {
    const number = take("number");
    if (number) return { number: rational(BigInt(number.whole + number.part), 10n ** BigInt(number.part.length)) };
    const unknown = take("unknown");
    if (unknown) return { unknown: unknown.text };
    if (!take("(")) fail();
    const inner = expression();
    if (!take(")")) fail();
    return inner;
  }
  try {
    const left = expression();
    const right = take("=") ? expression() : null;
    if (at !== tokens.length) fail();
    return { left, right, letters: new Set(tokens.filter((token) => token.kind === "unknown").map((token) => token.text)) };
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
}

// The value of a tree as a linear part, the operations done each part before its operation and
// the left before the right; a refusal throws.
function evaluate(node) {
  if (node.number) return bounded(constant(node.number));
  if (node.unknown) return { a: ONE, b: ZERO };
  if (node.op === "neg") {
    const of = evaluate(node.of);
    return { a: negate(of.a), b: negate(of.b) };
  }
  if (node.op === "^") {
    const base = evaluate(node.base);
    if (!isZero(base.a)) {
      if (node.exponent === 0n) return constant(ONE);
      if (node.exponent === 1n) return base;
      throw new Refusal("not_linear");
    }
    let value = constant(ONE);
    for (let i = 0n; i < node.exponent; i++) value = bounded(constant(times(value.b, base.b)));
    return value;
  }
  const left = evaluate(node.left);
  const right = evaluate(node.right);
  if (node.op === "+") return bounded({ a: add(left.a, right.a), b: add(left.b, right.b) });
  if (node.op === "-") return bounded({ a: add(left.a, negate(right.a)), b: add(left.b, negate(right.b)) });
  if (node.op === "*") {
    if (!isZero(left.a) && !isZero(right.a)) throw new Refusal("not_linear");
    const [linear, factor] = isZero(left.a) ? [right, left.b] : [left, right.b];
    return bounded({ a: times(linear.a, factor), b: times(linear.b, factor) });
  }
  if (!isZero(right.a)) throw new Refusal("not_linear");
  if (isZero(right.b)) throw new Refusal("division_by_zero");
  const inverse = rational(right.b.d, right.b.n);
  return bounded({ a: times(left.a, inverse), b: times(left.b, inverse) });
}

// A rational as the solver writes its answer: the integer, or p/q in lowest terms with its sign.
const written = (p) => (p.d === 1n ? p.n.toString() : `${p.n}/${p.d}`);

// The answer of the solver on a formula: { answer: { value, units, unknown } } or { refused }.
export function solve(formula) {
  const tree = parse(formula);
  if (!tree) return { refused: "syntax" };
  if (tree.letters.size > 1) return { refused: "two_unknowns" };
  const [letter] = tree.letters;
  if (!tree.right && letter) return { refused: "unknown_in_expression" };
  if (tree.right && !letter) return { refused: "no_unknown" };
  let value;
  try {
    const left = evaluate(tree.left);
    if (!tree.right) value = left.b;
    else {
      const right = evaluate(tree.right);
      const { a, b } = bounded({ a: add(left.a, negate(right.a)), b: add(right.b, negate(left.b)) });
      if (isZero(a)) return { refused: isZero(b) ? "every_root" : "no_root" };
      value = times(b, rational(a.d, a.n));
    }
  } catch (error) {
    if (error instanceof Refusal) return { refused: error.reason };
    throw error;
  }
  const text = written(value);
  if (text.length > MAX_ANSWER) return { refused: "too_large" };
  return { answer: { value: text, units: [], unknown: letter ?? "" } };
}

const characters = (text) => [...text].length;

// The rule that an answer of AI, as protobuf JSON, breaks first, or null when it is an answer.
export function breachOf(answer) {
  if (answer.number) {
    const { value = "", units = [], unknown = "" } = answer.number;
    if (rationalOf(value, "number") === null) return "value";
    const forms = units.map(unitForm);
    if (forms.some((form) => form === "")) return "units_empty";
    if (new Set(forms).size !== forms.length) return "units_same";
    if (unknown !== "" && !/^[a-z]$/.test(unknown)) return "unknown";
    return null;
  }
  if (answer.choice) {
    const { options = [], key = "" } = answer.choice;
    if (options.length < 2 || options.length > 10) return "options_count";
    if (options.some((option) => characters(option) < 1 || characters(option) > MAX_ANSWER)) return "option_length";
    const forms = options.map((option) => choiceForm(option));
    if (forms.some((form) => form === "") || new Set(forms).size !== forms.length) return "options_same";
    if (!options.includes(key)) return "choice_key";
    return null;
  }
  return "no_kind";
}

// The answer slot of the one item that a key gives.
export function slotOf(key) {
  if (key.number) {
    const check = { kind: "number", key: key.number.value };
    if (key.number.units?.length) check.units = key.number.units;
    return { binding: "anywhere", check };
  }
  return { binding: "anywhere", check: { kind: "choice", key: key.choice.key, options: key.choice.options, notation: "options" } };
}

// A value read brought to the key: { value, brought }, brought naming the way when one applied.
export function broughtTo(key, value) {
  if (value === null) return { value, brought: null };
  if (key.number?.unknown) {
    const text = normalized(scriptsReplaced(value));
    const match = /^(\p{L}) ?=/u.exec(text);
    if (match && lowercase(match[1]) === key.number.unknown) return { value: text.slice(match[0].length - 1), brought: "unknown" };
    return { value, brought: null };
  }
  if (key.choice) {
    const text = normalized(value);
    const match = /^\((.+)\)$/su.exec(text) ?? /^\[(.+)\]$/su.exec(text) ?? /^([^()[\]]+)\)$/su.exec(text);
    if (match) return { value: match[1], brought: "brackets" };
  }
  return { value, brought: null };
}

// The verdict by a key on a value read: { verdict, reason? }, and the way the value was brought.
export function verdictOf(key, value) {
  const { value: read, brought } = broughtTo(key, value);
  return { verdict: slotVerdict(slotOf(key), read), brought };
}

// The messages of the package, of the image buf builds of contracts/: { answer, number }, or
// { error }.
export function packageOf(image) {
  const set = fromJson(wkt.FileDescriptorSetSchema, image, { ignoreUnknownFields: true });
  const known = new Map(Object.values(wkt).filter((value) => value?.kind === "file").map((file) => [file.proto.name, file]));
  const resolve = (name) => set.file.find((proto) => proto.name === name) ?? known.get(name);
  const files = set.file.filter((proto) => proto.package === PACKAGE);
  if (!files.length) return { error: `the image of buf build has no file of ${PACKAGE}, which the vectors are of` };
  const registry = createFileRegistry(...files.map((proto) => createFileRegistry(proto, resolve)));
  const answer = registry.getMessage(`${PACKAGE}.Answer`);
  const number = registry.getMessage(`${PACKAGE}.Number`);
  if (!answer || !number) return { error: `the image of buf build lacks ${PACKAGE}.Answer or ${PACKAGE}.Number, which the vectors are of` };
  return { answer, number };
}

// A message of a vector read and written back: { json } as the vector has to write it, or { error }.
function message(schema, json) {
  try {
    return { json: toJson(schema, fromJson(schema, json), WRITTEN) };
  } catch (error) {
    return { error: error.message };
  }
}

// The problems of one case of a file, and what it shows into seen.
function checkCase(file, item, known, seen, problem) {
  if (!isObject(item) || typeof item.description !== "string" || item.description === "") return problem("a case is an object with its description");
  if (file === "solver.json") {
    const keys = Object.keys(item).sort();
    if (!isDeepStrictEqual(keys, ["answer", "description", "formula"]) && !isDeepStrictEqual(keys, ["description", "formula", "refused"])) return problem("a case of the solver has description, formula, and answer or refused");
    if (typeof item.formula !== "string") return problem("formula is a string");
    const got = solve(item.formula);
    if (item.answer !== undefined) {
      const read = message(known.number, item.answer);
      if (read.error) return problem(`answer is no ${PACKAGE}.Number: ${read.error}`);
      if (!isDeepStrictEqual(read.json, item.answer)) return problem(`answer is written ${show(read.json)}, with every field`);
      if (!isDeepStrictEqual(got.answer, item.answer)) return problem(`the solver gives ${show(got)} on ${show(item.formula)}, and the vector ${show(item.answer)}`);
      seen.answers++;
    } else {
      if (!REASONS.includes(item.refused)) return problem(`refused is one of ${REASONS.join(", ")}`);
      if (got.refused !== item.refused) return problem(`the solver gives ${show(got)} on ${show(item.formula)}, and the vector refuses it ${item.refused}`);
      seen.reasons.add(item.refused);
    }
    return;
  }
  if (file === "answers.json") {
    if (!isDeepStrictEqual(Object.keys(item).sort(), ["answer", "description", "key"]) || typeof item.key !== "boolean") return problem("a case of an answer has description, answer and key, a boolean");
    const read = message(known.answer, item.answer);
    if (read.error) return problem(`answer is no ${PACKAGE}.Answer: ${read.error}`);
    if (!isDeepStrictEqual(read.json, item.answer)) return problem(`answer is written ${show(read.json)}, with every field`);
    const breach = breachOf(item.answer);
    if ((breach === null) !== item.key) return problem(breach === null ? "the answer holds every rule, and the vector says it is none" : `the answer breaks the rule ${breach}, and the vector says it is one`);
    if (breach) seen.rules.add(breach);
    else seen.kinds.add(item.answer.number ? "number" : "choice");
    return;
  }
  if (!isDeepStrictEqual(Object.keys(item).sort(), ["description", "key", "value", "verdict"])) return problem("a case of a verdict has description, key, value and verdict");
  const read = message(known.answer, item.key);
  if (read.error) return problem(`key is no ${PACKAGE}.Answer: ${read.error}`);
  if (!isDeepStrictEqual(read.json, item.key)) return problem(`key is written ${show(read.json)}, with every field`);
  const breach = breachOf(item.key);
  if (breach) return problem(`key breaks the rule ${breach} of an answer, and no key does`);
  if (item.value !== null && typeof item.value !== "string") return problem("value is a string or null");
  const { verdict, brought } = verdictOf(item.key, item.value);
  if (!isDeepStrictEqual(verdict, item.verdict)) return problem(`the key gives ${show(verdict)} on ${show(item.value)}, and the vector ${show(item.verdict)}`);
  if (brought) seen.brought.add(brought);
  seen.verdicts.add(verdict.verdict);
}

// The problems of one file of vectors, and what it shows into seen.
function checkFile(file, bytes, known, seen) {
  const { value, lineOf, problems } = readVector(bytes);
  if (problems) return problems;
  const found = [];
  if (!isObject(value) || typeof value.description !== "string" || !Array.isArray(value.cases) || value.cases.length === 0 || Object.keys(value).length !== 2) {
    return [{ line: 1, message: "a vector is { description, cases }, with a case or more" }];
  }
  value.cases.forEach((item, i) => {
    seen.cases++;
    checkCase(file, item, known, seen, (text) => found.push({ line: lineOf(["cases", i]), message: `case ${i + 1}: ${text}` }));
  });
  return found;
}

// The vectors of the package against the rules of the key of a task from paper: { errors, cases }.
export function checkVectors(root, image, files) {
  const known = packageOf(image);
  if (known.error) return { errors: [{ file: FOLDER, line: 0, message: known.error }], cases: 0 };
  const errors = [];
  const seen = { reasons: new Set(), rules: new Set(), kinds: new Set(), brought: new Set(), verdicts: new Set(), answers: 0, cases: 0 };
  for (const name of FILES) if (!files.includes(`${FOLDER}/${name}`)) errors.push({ file: `${FOLDER}/${name}`, line: 0, message: `the file is missing: ${TEXT} names it` });
  for (const file of files) {
    const name = path.basename(file);
    if (!FILES.includes(name)) {
      errors.push({ file, line: 0, message: `${TEXT} names the vectors ${FILES.join(", ")} alone` });
      continue;
    }
    errors.push(...checkFile(name, fs.readFileSync(path.join(root, file)), known, seen).map((one) => ({ file, ...one })));
  }
  if (errors.length === 0) {
    const lack = (text) => errors.push({ file: FOLDER, line: 0, message: `no vector ${text}: the vectors hold every rule of ${TEXT}` });
    for (const reason of REASONS) if (!seen.reasons.has(reason)) lack(`refuses a formula ${reason}`);
    if (!seen.answers) lack("gives an answer of the solver");
    for (const rule of RULES) if (!seen.rules.has(rule)) lack(`breaks the rule ${rule} of an answer`);
    for (const kind of ["number", "choice"]) if (!seen.kinds.has(kind)) lack(`gives an answer of ${kind}`);
    for (const way of BROUGHT) if (!seen.brought.has(way)) lack(`brings a value to the key by its ${way}`);
    for (const verdict of ["correct", "not_yet", "unreadable"]) if (!seen.verdicts.has(verdict)) lack(`gives ${verdict}`);
  }
  return { errors, cases: seen.cases };
}
